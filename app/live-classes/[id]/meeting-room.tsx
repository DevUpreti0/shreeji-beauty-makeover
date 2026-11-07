"use client";
import {useEffect,useRef,useState} from "react";
declare global{interface Window{JitsiMeetExternalAPI?:new(domain:string,options:any)=>{dispose:()=>void;addListener:(event:string,callback:(data?:any)=>void)=>void;executeCommand?:(name:string,...args:any[])=>void}}}
export default function MeetingRoom({roomName,displayName,classId}:{roomName:string;displayName:string;classId:string}){
 const target=useRef<HTMLDivElement>(null);const [connection,setConnection]=useState("Preparing your classroom…");
 useEffect(()=>{let api:{dispose:()=>void;addListener:(event:string,callback:(data?:any)=>void)=>void}|undefined;let disposed=false;let joined=false;
  const record=async(event:"joined"|"left")=>{try{await fetch("/api/live-classes/"+encodeURIComponent(classId)+"/attendance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event}),keepalive:event==="left"});}catch{}};
  const mount=()=>{if(disposed||!target.current||!window.JitsiMeetExternalAPI)return;api=new window.JitsiMeetExternalAPI("meet.jit.si",{roomName:"ShreejiClass"+roomName,width:"100%",height:640,parentNode:target.current,userInfo:{displayName},configOverwrite:{prejoinConfig:{enabled:true},startWithAudioMuted:true,disableDeepLinking:true,enableWelcomePage:false},interfaceConfigOverwrite:{APP_NAME:"DuKu Meet FCA",NATIVE_APP_NAME:"DuKu Meet FCA",MOBILE_APP_PROMO:false,SHOW_JITSI_WATERMARK:false,SHOW_WATERMARK_FOR_GUESTS:false,SHOW_BRAND_WATERMARK:false,SHOW_POWERED_BY:false,BRAND_WATERMARK_LINK:"",DEFAULT_BACKGROUND:"#080d17",DEFAULT_REMOTE_DISPLAY_NAME:"Class participant",DEFAULT_LOCAL_DISPLAY_NAME:"You",TOOLBAR_BUTTONS:["microphone","camera","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","profile","chat","raisehand","videoquality","filmstrip","tileview","settings","select-background","mute-everyone"]}});
   api.addListener("videoConferenceJoined",()=>{joined=true;setConnection("Connected · attendance recorded");void record("joined");});
   api.addListener("videoConferenceLeft",()=>{if(joined){joined=false;setConnection("You left the classroom");void record("left");}});
   api.addListener("readyToClose",()=>{if(joined){joined=false;setConnection("Classroom closed");void record("left");}});
  };
  if(window.JitsiMeetExternalAPI)mount();else{const script=document.createElement("script");script.src="https://meet.jit.si/external_api.js";script.async=true;script.onload=mount;script.onerror=()=>setConnection("Could not load the meeting service. Refresh and try again.");document.head.appendChild(script);}
  const onPageHide=()=>{if(joined){joined=false;void record("left");}};window.addEventListener("pagehide",onPageHide);
  return()=>{disposed=true;window.removeEventListener("pagehide",onPageHide);if(joined)void record("left");api?.dispose();};
 },[roomName,displayName,classId]);
 return <div className="portalPanel meetShell"><div className="meetStageHead"><div className="meetWatermark"><span>✦</span><b>DuKu Meet FCA</b><small>BY DUKU BUSINESS FCA LAB</small></div><div className="meetStatus">{connection}</div></div><div className="meetFrame"><div ref={target} className="meetFrameInner"/><div className="meetProviderCover" aria-hidden="true"><span>✦</span><b>DuKu Meet</b><small>FCA LAB</small></div></div><p className="meetFootnote">Allow camera and microphone when your browser asks. Use headphones to reduce echo. Attendance is recorded when you join and leave.</p></div>;
}
