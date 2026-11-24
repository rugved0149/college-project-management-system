import jwt from 'jsonwebtoken';
import {db} from '../config/database.js';

export function auth(req,res,next){
  try{
    const token=(req.headers.authorization||'').replace(/^Bearer /,'');
    if(!token)throw Error();
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    const user=db.prepare('SELECT user_id,name,email,role,department_id,is_active,email_verified,session_version FROM users WHERE user_id=?').get(payload.user_id);
    if(!user||!user.is_active)return res.status(401).json({error:'Your account is inactive or no longer exists'});
    if(!user.email_verified)return res.status(403).json({error:'Verify your email address before using the workspace'});
    if((payload.session_version ?? 0)!==user.session_version)return res.status(401).json({error:'Your session has expired. Please sign in again.'});
    req.user=user;
    next();
  }catch{
    res.status(401).json({error:'Please sign in to continue'});
  }
}
export function allow(...roles){
  return(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'You do not have permission to perform this action'});
}
export function allowPermission(permission,...fallbackRoles){
  return(req,res,next)=>{
    if(!fallbackRoles.includes(req.user.role))return res.status(403).json({error:'You do not have permission to perform this action'});
    const configured=db.prepare('SELECT allowed FROM role_permissions WHERE role=? AND permission=?').get(req.user.role,permission);
    if(configured&&configured.allowed!==1)return res.status(403).json({error:'This capability is disabled for your role'});
    next();
  };
}
