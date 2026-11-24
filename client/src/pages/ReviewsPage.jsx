import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { api, download } from '../lib/api.js';

const label=value=>String(value||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
export default function ReviewsPage(){
 const [items,setItems]=useState([]),[comments,setComments]=useState({}),[decisions,setDecisions]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){setError('');try{const d=await api('/work/reviews');setItems(d.submissions||[])}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 async function run(id,action,body={}){setBusy(true);setError('');try{await api('/work/submissions/'+id+'/'+action,{method:'POST',body:JSON.stringify(body)});setNotice(action==='review'?'Review saved':'Submission assigned for review');await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <><div className="page-heading"><div><span className="kicker">FACULTY WORKSPACE</span><h1>Review queue</h1><p>Review proposals and deliverables assigned to your faculty account.</p></div><button className="secondary" onClick={load}><RefreshCw size={15}/> Refresh</button></div>
 {error&&<div className="error">{error}</div>}{notice&&<div className="admin-notice">{notice}</div>}
 {!items.length&&!error?<div className="empty"><CheckCircle2 size={25}/><b>Queue is clear</b><span>New submissions will appear here when students submit their work.</span></div>:<div className="review-list">{items.map(s=><article className="review-card" key={s.submission_id}><div className="review-card-head"><div><span className="kicker">{label(s.submission_type)}</span><h2>{s.project_title}</h2><p>Submitted by {s.submitter_name} · {new Date(s.submitted_at).toLocaleString('en-IN')}</p></div><span className="admin-status">{label(s.status)}</span></div><div className="review-file"><FileText size={17}/><span>{s.original_name||'File unavailable'}</span>{s.file_path&&<button className="quiet-action" onClick={()=>download('/work/submissions/'+s.submission_id+'/file',s.original_name).catch(e=>setError(e.message))}>Download</button>}</div>
 {s.submission_type==='PROPOSAL'&&<button className="secondary" disabled={busy||s.project_status==='UNDER_REVIEW'} onClick={()=>run(s.submission_id,'assign-review')}>Assign for review</button>}
 <label className="review-comment">Feedback<textarea rows="3" placeholder="Provide specific feedback for the project team…" value={comments[s.submission_id]||''} onChange={e=>setComments({...comments,[s.submission_id]:e.target.value})}/></label>
 <div className="review-actions"><select value={decisions[s.submission_id]||'APPROVED'} onChange={e=>setDecisions({...decisions,[s.submission_id]:e.target.value})}><option value="APPROVED">Approve</option><option value="REVISION_REQUIRED">Request revision</option><option value="REJECTED">Reject</option></select><button className="primary" disabled={busy||!(comments[s.submission_id]||'').trim()} onClick={()=>run(s.submission_id,'review',{decision:decisions[s.submission_id]||'APPROVED',comments:comments[s.submission_id]})}>Save review</button></div></article>)}</div>}
 </>;
}
