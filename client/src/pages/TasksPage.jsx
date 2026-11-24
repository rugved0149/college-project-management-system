import { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';
const label=value=>String(value||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
export default function TasksPage(){
 const [tasks,setTasks]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){try{const d=await api('/work/tasks');setTasks(d.tasks||[]);setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 async function change(task,status){setBusy(true);try{await api('/work/tasks/'+task.task_id,{method:'PATCH',body:JSON.stringify({status})});await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <><div className="page-heading"><div><span className="kicker">WORK TRACKER</span><h1>Tasks & milestones</h1><p>Track assigned work across the projects you participate in.</p></div><button className="secondary" onClick={load}><RefreshCw size={15}/> Refresh</button></div>{error&&<div className="error">{error}</div>}
 {tasks.length?<section className="workspace-panel"><div className="work-list">{tasks.map(t=><div className="work-row" key={t.task_id}><div><b>{t.title}</b><small>{t.project_title} · {t.due_date?'Due '+new Date(t.due_date).toLocaleDateString('en-IN'):'No due date'}</small></div><select disabled={busy} value={t.status} onChange={e=>change(t,e.target.value)}><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></div>)}</div></section>:!error&&<div className="empty"><ClipboardList size={25}/><b>No tasks assigned</b><span>Tasks from your project workspaces will appear here.</span></div>}</>;
}
