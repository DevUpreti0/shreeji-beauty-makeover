"use client";
import {useEffect,useState} from "react";
export default function NotificationCenter(){
 const [items,setItems]=useState<any[]>([]);const [open,setOpen]=useState(false);const [loading,setLoading]=useState(false);
 async function refresh(){setLoading(true);try{const r=await fetch("/api/notifications",{cache:"no-store"});if(r.ok){const d=await r.json();setItems(d.notifications||[]);}}finally{setLoading(false);}}
 useEffect(()=>{refresh();const timer=window.setInterval(refresh,60000);return()=>window.clearInterval(timer);},[]);
 const unread=items.filter(n=>!n.read_at).length;
 async function markRead(n:any){if(n.read_at)return;await fetch("/api/notifications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:n.id})});setItems(old=>old.map(x=>x.id===n.id?{...x,read_at:new Date().toISOString()}:x));}
 return <div style={{position:"relative"}}><button className="outline" type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>Notifications {unread>0?"("+unread+")":""}</button>{open&&<div className="portalPanel" style={{position:"absolute",right:0,top:"calc(100% + 8px)",zIndex:50,width:"min(360px,calc(100vw - 32px))",maxHeight:440,overflowY:"auto",boxShadow:"0 18px 50px #0008"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><b>Notification inbox</b><button className="outline" onClick={refresh} disabled={loading}>{loading?"…":"Refresh"}</button></div>{items.length?items.map(n=><div key={n.id} style={{padding:"12px 0",borderTop:"1px solid #ffffff20",opacity:n.read_at?0.7:1}}><a href={n.href||"#"} onClick={()=>markRead(n)} style={{color:"inherit",textDecoration:"none",display:"block"}}><b>{n.title}</b><p style={{margin:"5px 0",fontSize:13}}>{n.body}</p><small>{new Date(n.created_at).toLocaleString("en-IN")}</small></a></div>):<p>No notifications yet.</p>}</div>}</div>;
}
