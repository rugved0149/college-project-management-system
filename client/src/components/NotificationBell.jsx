import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { api } from '../lib/api.js';
export default function NotificationBell(){
 const [open,setOpen]=useState(false),[items,setItems]=useState([]);
 async function load(){try{const d=await api('/notifications');setItems(d.notifications||[])}catch{}}
 useEffect(()=>{load()},[]);
 async function readAll(){try{await api('/notifications/read-all',{method:'PATCH'});await load()}catch{}}
 async function readOne(id){try{await api('/notifications/'+id+'/read',{method:'PATCH'});await load()}catch{}}
 const unread=items.filter(x=>!x.is_read).length;
 return <div className="notification-wrap"><button className="icon-btn notification-trigger" aria-label="Notifications" onClick={()=>{setOpen(!open);if(!open)load()}}><Bell size={18}/>{unread>0&&<span className="notification-count">{unread>9?'9+':unread}</span>}</button>{open&&<div className="notification-popover"><div className="notification-head"><b>Notifications</b><button onClick={readAll}>Mark all read</button></div>{items.length?items.map(n=><button className={n.is_read?'notification-item':'notification-item unread'} key={n.notification_id} onClick={()=>readOne(n.notification_id)}><span>{n.message}</span><small>{new Date(n.created_at+'Z').toLocaleString('en-IN')}</small></button>):<p className="notification-empty">You’re all caught up.</p>}<button className="notification-close" onClick={()=>setOpen(false)}><Check size={14}/> Close</button></div>}</div>;
}
