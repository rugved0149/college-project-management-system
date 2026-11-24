import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, ClipboardList, FolderKanban, RefreshCw, Users } from 'lucide-react';
import { api } from '../lib/api.js';

const label=value=>String(value||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function Metric({icon:Icon,label:heading,value,sub}){return <div className="stat"><span className="stat-icon"><Icon size={19}/></span><span className="stat-label">{heading}</span><b>{value}</b><small>{sub}</small></div>}
export default function ReportsPage(){
 const [data,setData]=useState(null),[error,setError]=useState('');
 async function load(){try{setData(await api('/admin/reports'));setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 const summary=data?.summary||{};
 return <><div className="page-heading"><div><span className="kicker">DEPARTMENT OVERVIEW</span><h1>Project reports</h1><p>Monitor project activity and completion across your department.</p></div><button className="secondary" onClick={load}><RefreshCw size={15}/> Refresh</button></div>
 {error&&<div className="error">{error}</div>}{data&&<><div className="stats"><Metric icon={FolderKanban} label="Total projects" value={summary.totalProjects||0} sub="Projects in scope"/><Metric icon={Users} label="Total users" value={summary.totalUsers||0} sub="Department accounts"/><Metric icon={CheckCircle2} label="Completed" value={summary.completed||0} sub="Approved final deliverables"/><Metric icon={Activity} label="Completion rate" value={(summary.completionRate||0)+'%'} sub="Completed projects / total"/></div>
 <section className="workspace-panel"><div className="panel-heading"><div><h2>Projects by status</h2><p>Current lifecycle distribution</p></div><ClipboardList size={18}/></div><div className="admin-table-wrap"><table><thead><tr><th>Status</th><th>Projects</th></tr></thead><tbody>{(data.byStatus||[]).map(row=><tr key={row.status}><td>{label(row.status)}</td><td><strong>{row.count}</strong></td></tr>)}</tbody></table></div></section>
 <section className="workspace-panel"><div className="panel-heading"><div><h2>Recently updated projects</h2><p>Latest project activity in your department</p></div></div><div className="admin-table-wrap"><table><thead><tr><th>Project</th><th>Owner</th><th>Status</th><th>Last updated</th></tr></thead><tbody>{(data.recent||[]).map(p=><tr key={p.project_id}><td><strong>{p.title}</strong></td><td>{p.owner_name}</td><td>{label(p.status)}</td><td>{new Date(p.updated_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div></section></>}
 </>;
}
