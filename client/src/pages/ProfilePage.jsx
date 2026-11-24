import { useEffect, useState } from 'react';
import { Save, UserRound } from 'lucide-react';
import { api } from '../lib/api.js';

export default function ProfilePage({ user, onUpdate }) {
  const [form,setForm]=useState({name:user.name||'',email:user.email||''});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  useEffect(()=>{setForm({name:user.name||'',email:user.email||''})},[user]);
  async function save(e){
    e.preventDefault();setBusy(true);setError('');setNotice('');
    try{const data=await api('/auth/profile',{method:'PATCH',body:JSON.stringify(form)});onUpdate(data.user);setNotice('Profile updated')}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <><div className="page-heading"><div><span className="kicker">ACCOUNT SETTINGS</span><h1>My profile</h1><p>Update the name and email address associated with your CampusFlow account.</p></div><span className="profile-icon"><UserRound size={22}/></span></div>
    <form className="admin-panel profile-form" onSubmit={save}>{error&&<div className="error">{error}</div>}{notice&&<div className="admin-notice">{notice}</div>}
      <label>Full name<input required maxLength="100" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label>Email address<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label>Account role<input value={user.role.replaceAll('_',' ')} disabled/></label>
      <label>Department ID<input value={user.department_id??'Not assigned'} disabled/></label>
      <button className="primary" disabled={busy}><Save size={15}/>{busy?'Saving…':'Save profile'}</button>
    </form>
  </>;
}
