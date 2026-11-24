import { useEffect, useState } from 'react';
import { RefreshCw, Search, Users } from 'lucide-react';
import { api } from '../lib/api.js';
const roles=['STUDENT','FACULTY','DEPARTMENT_ADMIN','SYSTEM_ADMIN'];
const label=value=>String(value||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
export default function PeoplePage({user}){
 const [users,setUsers]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[query,setQuery]=useState('');
 async function load(){try{const d=await api('/admin/users');setUsers(d.users||[]);setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 async function update(id,kind,value){setBusy(true);try{await api('/admin/users/'+id+'/'+kind,{method:'PATCH',body:JSON.stringify(kind==='role'?{role:value}:{active:value})});await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 const choices=user.role==='SYSTEM_ADMIN'?roles:['STUDENT','FACULTY'];const filtered=users.filter(u=>(u.name+' '+u.email+' '+(u.department_name||'')).toLowerCase().includes(query.toLowerCase()));
 return <><div className="page-heading"><div><span className="kicker">DEPARTMENT DIRECTORY</span><h1>People</h1><p>View accounts and manage role and access status.</p></div><button className="secondary" onClick={load}><RefreshCw size={15}/> Refresh</button></div>{error&&<div className="error">{error}</div>}
 <div className="toolbar"><div className="search"><Search size={16}/><input placeholder="Search people…" value={query} onChange={e=>setQuery(e.target.value)}/></div><span>{filtered.length} of {users.length} accounts</span></div>{filtered.length?<section className="workspace-panel"><div className="admin-table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Access</th></tr></thead><tbody>{filtered.map(u=><tr key={u.user_id}><td><strong>{u.name}</strong></td><td>{u.email}</td><td>{u.department_name||'—'}</td><td><select className="people-role" disabled={busy||u.user_id===user.user_id} value={u.role} onChange={e=>update(u.user_id,'role',e.target.value)}>{choices.map(role=><option key={role} value={role}>{label(role)}</option>)}</select></td><td><button className="admin-action" disabled={busy||u.user_id===user.user_id} onClick={()=>update(u.user_id,'active',!u.is_active)}>{u.is_active?'Deactivate':'Activate'}</button></td></tr>)}</tbody></table></div></section>:!error&&<div className="empty"><Users size={25}/><b>No matching people</b></div>}</>;
}
