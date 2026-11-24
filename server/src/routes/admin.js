import {Router} from 'express';
import {db} from '../config/database.js';
import {auth,allow,allowPermission} from '../middleware/auth.js';

const r=Router();
r.use(auth,allow('DEPARTMENT_ADMIN','SYSTEM_ADMIN'));
const roles=['STUDENT','FACULTY','DEPARTMENT_ADMIN','SYSTEM_ADMIN'];
const isSystem=req=>req.user.role==='SYSTEM_ADMIN';
const scope=(req,alias='')=>isSystem(req)?{sql:'1=1',args:[]}:{sql:`${alias}department_id=?`,args:[req.user.department_id]};
function audit(req,action,type,id,details={}){
  db.prepare('INSERT INTO audit_logs(user_id,action,resource_type,resource_id,details,ip_address) VALUES(?,?,?,?,?,?)')
    .run(req.user.user_id,action,type,id==null?null:String(id),JSON.stringify(details),req.ip);
}
function fail(res,status,error){return res.status(status).json({error});}

r.get('/users',(q,s)=>{
  const filter=scope(q,'u.');
  const users=db.prepare(`SELECT u.user_id,u.name,u.email,u.role,u.is_active,u.department_id,d.name department_name FROM users u LEFT JOIN departments d ON d.department_id=u.department_id WHERE ${filter.sql} ORDER BY u.name`).all(...filter.args);
  s.json({users});
});
r.patch('/users/:id/role',(q,s)=>{
  const target=db.prepare('SELECT user_id,role,department_id FROM users WHERE user_id=?').get(q.params.id);
  if(!target)return fail(s,404,'User not found');
  if(!roles.includes(q.body.role))return fail(s,400,'Invalid role');
  if(!isSystem(q)&&target.department_id!==q.user.department_id)return fail(s,403,'You can only manage users in your department');
  if(!isSystem(q)&&['DEPARTMENT_ADMIN','SYSTEM_ADMIN'].includes(q.body.role))return fail(s,403,'Only system administrators can assign administrator roles');
  if(target.user_id===q.user.user_id&&q.body.role!==q.user.role)return fail(s,400,'You cannot change your own role');
  db.prepare('UPDATE users SET role=? WHERE user_id=?').run(q.body.role,target.user_id);
  audit(q,'USER_ROLE_UPDATED','USER',target.user_id,{from:target.role,to:q.body.role});
  s.json({success:true});
});
r.patch('/users/:id/active',(q,s)=>{
  const target=db.prepare('SELECT user_id,is_active,department_id FROM users WHERE user_id=?').get(q.params.id);
  if(!target)return fail(s,404,'User not found');
  if(!isSystem(q)&&target.department_id!==q.user.department_id)return fail(s,403,'You can only manage users in your department');
  if(target.user_id===q.user.user_id)return fail(s,400,'You cannot disable your own account');
  const active=q.body.active?1:0;
  db.prepare('UPDATE users SET is_active=? WHERE user_id=?').run(active,target.user_id);
  audit(q,active?'USER_ENABLED':'USER_DISABLED','USER',target.user_id);
  s.json({success:true});
});
r.get('/reports',(q,s)=>{
  const filter=scope(q,'');
  const where=isSystem(q)?'1=1':'department_id=?';
  const args=isSystem(q)?[]:[q.user.department_id];
  const total=db.prepare(`SELECT COUNT(*) n FROM projects WHERE ${where}`).get(...args).n;
  const completed=db.prepare(`SELECT COUNT(*) n FROM projects WHERE status='COMPLETED' AND ${where}`).get(...args).n;
  s.json({summary:{totalProjects:total,totalUsers:db.prepare(`SELECT COUNT(*) n FROM users WHERE ${isSystem(q)?'1=1':'department_id=?'}`).get(...args).n,completed,completionRate:total?Math.round(completed/total*100):0},byStatus:db.prepare(`SELECT status,COUNT(*) count FROM projects WHERE ${where} GROUP BY status`).all(...args),recent:db.prepare(`SELECT p.*,u.name owner_name FROM projects p JOIN users u ON u.user_id=p.owner_id WHERE ${isSystem(q)?'1=1':'p.department_id=?'} ORDER BY p.updated_at DESC LIMIT 8`).all(...args)});
});

r.get('/categories',allowPermission('categories.manage','DEPARTMENT_ADMIN','SYSTEM_ADMIN'),(q,s)=>{
  const filter=scope(q,'');
  const rows=db.prepare(`SELECT c.*,d.name department_name FROM categories c LEFT JOIN departments d ON d.department_id=c.department_id WHERE ${isSystem(q)?'1=1':'c.department_id=?'} ORDER BY c.name`).all(...(isSystem(q)?[]:[q.user.department_id]));
  s.json({categories:rows});
});
r.post('/categories',allowPermission('categories.manage','DEPARTMENT_ADMIN','SYSTEM_ADMIN'),(q,s)=>{
  const name=String(q.body.name||'').trim();
  if(!name||name.length>80)return fail(s,400,'Category name must contain 1–80 characters');
  const departmentId=isSystem(q)?(q.body.department_id||null):q.user.department_id;
  try{
    const info=db.prepare('INSERT INTO categories(name,description,department_id) VALUES(?,?,?)').run(name,String(q.body.description||'').trim().slice(0,500),departmentId);
    audit(q,'CATEGORY_CREATED','CATEGORY',info.lastInsertRowid,{name});
    s.status(201).json({category:db.prepare('SELECT * FROM categories WHERE category_id=?').get(info.lastInsertRowid)});
  }catch(e){if(String(e.message).includes('UNIQUE'))return fail(s,409,'That category already exists in this department');throw e;}
});
r.patch('/categories/:id',allowPermission('categories.manage','DEPARTMENT_ADMIN','SYSTEM_ADMIN'),(q,s)=>{
  const category=db.prepare('SELECT * FROM categories WHERE category_id=?').get(q.params.id);
  if(!category)return fail(s,404,'Category not found');
  if(!isSystem(q)&&category.department_id!==q.user.department_id)return fail(s,403,'Category belongs to another department');
  const name=String(q.body.name??category.name).trim();
  if(!name||name.length>80)return fail(s,400,'Category name must contain 1–80 characters');
  const active=q.body.is_active===undefined?category.is_active:(q.body.is_active?1:0);
  db.prepare('UPDATE categories SET name=?,description=?,is_active=? WHERE category_id=?').run(name,String(q.body.description??category.description??'').trim().slice(0,500),active,category.category_id);
  audit(q,'CATEGORY_UPDATED','CATEGORY',category.category_id,{name,is_active:active});
  s.json({success:true});
});

r.get('/settings',(q,s)=>{
  if(!isSystem(q))return fail(s,403,'Only system administrators can configure the system');
  s.json({settings:db.prepare('SELECT setting_key,setting_value,updated_at FROM system_settings ORDER BY setting_key').all()});
});
r.put('/settings',(q,s)=>{
  if(!isSystem(q))return fail(s,403,'Only system administrators can configure the system');
  if(!q.body||typeof q.body!=='object'||Array.isArray(q.body))return fail(s,400,'Settings must be an object');
  const allowed=new Set(['allow_registration']);
  const upsert=db.prepare('INSERT INTO system_settings(setting_key,setting_value,updated_by,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP');
  const changes=[];
  const tx=db.transaction(()=>{for(const [key,value] of Object.entries(q.body)){if(!allowed.has(key))continue;const val=String(value);if(val.length>200)throw Error('Setting value is too long');upsert.run(key,val,q.user.user_id);changes.push(key)}});
  try{tx();}catch(e){return fail(s,400,e.message)}
  audit(q,'SYSTEM_SETTINGS_UPDATED','SYSTEM',null,{keys:changes});
  s.json({success:true,updated:changes});
});
r.get('/permissions',(q,s)=>{
  if(!isSystem(q))return fail(s,403,'Only system administrators can manage permissions');
  s.json({permissions:db.prepare('SELECT role,permission,allowed,updated_at FROM role_permissions ORDER BY role,permission').all()});
});
r.put('/permissions',(q,s)=>{
  if(!isSystem(q))return fail(s,403,'Only system administrators can manage permissions');
  const {role,permission,allowed}=q.body||{};
  if(!roles.includes(role)||typeof permission!=='string'||!permission.trim()||permission.length>100||typeof allowed!=='boolean')return fail(s,400,'Invalid permission update');
  db.prepare('INSERT INTO role_permissions(role,permission,allowed,updated_by,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(role,permission) DO UPDATE SET allowed=excluded.allowed,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP').run(role,permission.trim(),allowed?1:0,q.user.user_id);
  audit(q,'PERMISSION_UPDATED','ROLE_PERMISSION',role+':'+permission,{allowed});
  s.json({success:true});
});
r.get('/audit-logs',(q,s)=>{
  if(!isSystem(q))return fail(s,403,'Only system administrators can monitor system access');
  const limit=Math.min(Math.max(Number(q.query.limit)||50,1),200);
  const rows=db.prepare('SELECT a.*,u.name user_name,u.email user_email,u.role user_role FROM audit_logs a LEFT JOIN users u ON u.user_id=a.user_id ORDER BY a.created_at DESC,a.audit_id DESC LIMIT ?').all(limit);
  s.json({logs:rows});
});
export default r;
