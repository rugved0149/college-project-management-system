import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const date=value=>value?new Date(value+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'No due date';

export default function TasksPage(){
 const [tasks,setTasks]=useState([]),[milestones,setMilestones]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 async function load(){
  setLoading(true);
  try{
   const [taskData,milestoneData]=await Promise.all([api('/work/tasks'),api('/work/milestones')]);
   setTasks(taskData.tasks||[]);
   setMilestones(milestoneData.milestones||[]);
   setError('');
  }catch(e){setError(e.message)}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[]);
 async function change(task,status){
  setBusy(true);
  try{await api('/work/tasks/'+task.task_id,{method:'PATCH',body:JSON.stringify({status})});await load()}
  catch(e){setError(e.message)}
  finally{setBusy(false)}
 }
 const completed=tasks.filter(task=>task.status==='COMPLETED').length;
 const milestonesDone=milestones.filter(item=>Boolean(item.is_completed)).length;
 return <>
  <div className="page-heading"><div><span className="kicker">WORK TRACKER</span><h1>Tasks & milestones</h1><p>Track assigned work and project checkpoints across your workspace.</p></div><button className="secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
  {error&&<div className="error">{error}</div>}
  {loading?<div className="empty">Loading your work…</div>:<>
   <div className="stats">
    <div className="stat"><span className="stat-icon"><ClipboardList size={18}/></span><span className="stat-label">Tasks</span><b>{tasks.length}</b><small>{completed} completed</small></div>
    <div className="stat"><span className="stat-icon"><CheckCircle2 size={18}/></span><span className="stat-label">Milestones</span><b>{milestones.length}</b><small>{milestonesDone} completed</small></div>
   </div>
   <section className="workspace-panel">
    <div className="panel-heading"><div><h2>My project tasks</h2><p>Update the status of tasks assigned to you.</p></div><ClipboardList size={18}/></div>
    {tasks.length?<div className="work-list">{tasks.map(task=><div className="work-row" key={task.task_id}><div><b>{task.title}</b><small><Link className="work-project-link" to={'/projects/'+task.project_id}>{task.project_title}</Link> · {date(task.due_date)}</small></div><select disabled={busy} value={task.status} onChange={event=>change(task,event.target.value)}><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></div>)}</div>:<p className="empty-inline">No tasks are currently visible in your projects.</p>}
   </section>
   <section className="workspace-panel">
    <div className="panel-heading"><div><h2>Project milestones</h2><p>Key checkpoints and delivery dates across your projects.</p></div><CalendarDays size={18}/></div>
    {milestones.length?<div className="work-list">{milestones.map(item=><div className="work-row" key={item.milestone_id}><div><b>{item.title}</b><small><Link className="work-project-link" to={'/projects/'+item.project_id}>{item.project_title}</Link> · {date(item.due_date)}</small></div><span className={item.is_completed?'admin-status active':'admin-status'}>{item.is_completed?'Completed':'Open'}</span></div>)}</div>:<p className="empty-inline">No milestones have been added to your projects yet.</p>}
   </section>
  </>}
 </>;
}
