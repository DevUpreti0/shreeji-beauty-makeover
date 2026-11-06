"use client";
import {useEffect,useRef,useState} from "react";
declare global{interface Window{JitsiMeetExternalAPI?:new(domain:string,options:any)=>{dispose:()=>void;addListener:(event:string,callback:(data?:any)=>void)=>void;executeCommand?:(name:string,...args:any[])=>void}}}
export default function MeetingRoom({roomName,displayName,classId}:{roomName:string;displayName:string;classId:string}){
 const target=useRef<HTMLDivElement>(null);const [connection,setConnection]=useState("Preparing your secure classroom…");
 useEffect(()=>{let api:{dispose:()=>void;addListener:(event:string,callback:(data?:any)=>void)=>void}|undefined;let disposed=false;let joined=false;
  const record=async(event:"joined"|"left")=>{try{await fetch("/api/live-classes/"+encodeURIComponent(classId)+"/attendance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event}),keepalive:event==="left"});}catch{}};
  const mount=()=>{if(disposed||!target.current||!window.JitsiMeetExternalAPI)return;api=new window.JitsiMeetExternalAPI("meet.jit.si",{roomName:"ShreejiClass"+roomName,width:"100%",height:640,parentNode:target.current,userInfo:{displayName},configOverwrite:{prejoinConfig:{enabled:true},startWithAudioMuted:true,disableDeepLinking:true,enableWelcomePage:false},interfaceConfigOverwrite:{APP_NAME:"DuKu Meet Professional LMS",NATIVE_APP_NAME:"DuKu Meet",MOBILE_APP_PROMO:false,SHOW_JITSI_WATERMARK:false,SHOW_WATERMARK_FOR_GUESTS:false,DEFAULT_BACKGROUND:"#292522"}});
   api.addListener("videoConferenceJoined",()=>{joined=true;setConnection("Connected · attendance recorded");void record("joined");});
   api.addListener("videoConferenceLeft",()=>{if(joined){joined=false;setConnection("You left the classroom");void record("left");}});
   api.addListener("readyToClose",()=>{if(joined){joined=false;setConnection("Classroom closed");void record("left");}});
  };
  if(window.JitsiMeetExternalAPI)mount();else{const script=document.createElement("script");script.src="https://meet.jit.si/external_api.js";script.async=true;script.onload=mount;script.onerror=()=>setConnection("Could not load the meeting service. Refresh and try again.");document.head.appendChild(script);}
  const onPageHide=()=>{if(joined){joined=false;void record("left");}};window.addEventListener("pagehide",onPageHide);
  return()=>{disposed=true;window.removeEventListener("pagehide",onPageHide);if(joined)void record("left");api?.dispose();};
 },[roomName,displayName,classId]);
 return <div className="portalPanel"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}><b>DuKu Meet Professional LMS</b><small>{connection}</small></div><div ref={target} style={{width:"100%",minHeight:640,background:"#171717",borderRadius:12,overflow:"hidden"}}/><p style={{fontSize:12}}>Allow camera and microphone when your browser asks. Use headphones to reduce echo. Attendance is recorded when you join and leave.</p></div>;
}
