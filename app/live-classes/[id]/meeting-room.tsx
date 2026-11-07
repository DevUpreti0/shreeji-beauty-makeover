"use client";
import {useEffect,useRef,useState} from "react";
declare global {
 interface Window {
  JitsiMeetExternalAPI?:new(domain:string,options:any)=>{
   dispose:()=>void;
   addListener:(event:string,callback:(data?:any)=>void)=>void;
   executeCommand?:(name:string,...args:any[])=>void;
  }
 }
}
type MeetingApi={dispose:()=>void;addListener:(event:string,callback:(data?:any)=>void)=>void;executeCommand?:(name:string,...args:any[])=>void};
export default function MeetingRoom({roomName,displayName,classId}:{roomName:string;displayName:string;classId:string}){
 const target=useRef<HTMLDivElement>(null);
 const apiRef=useRef<MeetingApi|null>(null);
 const [connection,setConnection]=useState("Preparing your classroom…");
 const [joined,setJoined]=useState(false);
 const [participants,setParticipants]=useState(0);
 const [audioMuted,setAudioMuted]=useState(true);
 const [videoMuted,setVideoMuted]=useState(true);
 const [elapsed,setElapsed]=useState(0);
 const command=(name:string)=>apiRef.current?.executeCommand?.(name);
 useEffect(()=>{
  let api:MeetingApi|undefined,disposed=false,hasJoined=false;
  const record=async(event:"joined"|"left")=>{
   try{await fetch("/api/live-classes/"+encodeURIComponent(classId)+"/attendance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event}),keepalive:event==="left"});}catch{}
  };
  const mount=()=>{
   if(disposed||!target.current||!window.JitsiMeetExternalAPI)return;
   api=new window.JitsiMeetExternalAPI("meet.jit.si",{
    roomName:"ShreejiClass"+roomName,width:"100%",height:"100%",parentNode:target.current,userInfo:{displayName},
    configOverwrite:{prejoinConfig:{enabled:true},startWithAudioMuted:true,disableDeepLinking:true,enableWelcomePage:false,hideConferenceSubject:false,hideConferenceTimer:false,disableInviteFunctions:true},
    interfaceConfigOverwrite:{APP_NAME:"DuKu Meet",NATIVE_APP_NAME:"DuKu Meet",MOBILE_APP_PROMO:false,SHOW_JITSI_WATERMARK:false,SHOW_WATERMARK_FOR_GUESTS:false,SHOW_BRAND_WATERMARK:false,SHOW_POWERED_BY:false,BRAND_WATERMARK_LINK:"",DEFAULT_BACKGROUND:"#080d17",DEFAULT_REMOTE_DISPLAY_NAME:"Class participant",DEFAULT_LOCAL_DISPLAY_NAME:"You",TOOLBAR_BUTTONS:["microphone","camera","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","profile","chat","raisehand","videoquality","filmstrip","tileview","settings","select-background","mute-everyone"]}
   });
   apiRef.current=api;
   api.addListener("videoConferenceJoined",()=>{
    hasJoined=true;setJoined(true);setParticipants(1);setConnection("Connected · attendance recorded");void record("joined");
   });
   api.addListener("participantJoined",()=>setParticipants(n=>n+1));
   api.addListener("participantLeft",()=>setParticipants(n=>Math.max(1,n-1)));
   api.addListener("audioMuteStatusChanged",(e:any)=>setAudioMuted(!!e?.muted));
   api.addListener("videoMuteStatusChanged",(e:any)=>setVideoMuted(!!e?.muted));
   api.addListener("videoConferenceLeft",()=>{if(hasJoined){hasJoined=false;setJoined(false);setConnection("You left the classroom");void record("left");}});
   api.addListener("readyToClose",()=>{if(hasJoined){hasJoined=false;setJoined(false);setConnection("Classroom closed");void record("left");}});
  };
  if(window.JitsiMeetExternalAPI)mount();else{
   const script=document.createElement("script");script.src="https://meet.jit.si/external_api.js";script.async=true;script.onload=mount;script.onerror=()=>setConnection("Could not load the meeting service. Refresh and try again.");document.head.appendChild(script);
  }
  const onPageHide=()=>{if(hasJoined){hasJoined=false;void record("left");}};
  window.addEventListener("pagehide",onPageHide);
  return()=>{disposed=true;window.removeEventListener("pagehide",onPageHide);if(hasJoined)void record("left");api?.dispose();apiRef.current=null;};
 },[roomName,displayName,classId]);
 useEffect(()=>{if(!joined)return;const started=Date.now();const timer=window.setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);return()=>window.clearInterval(timer);},[joined]);
 const clock=String(Math.floor(elapsed/60)).padStart(2,"0")+":"+String(elapsed%60).padStart(2,"0");
 return <section className="portalPanel meetShell">
  <div className="meetStageHead">
   <div className="meetWatermark"><span>✦</span><div><b>DuKu Meet</b><small>DUKU BUSINESS FCA LAB</small></div></div>
   <div className="meetHeaderMeta"><span className={"meetLivePill "+(joined?"isLive":"")}>{joined?"● LIVE SESSION":"● CONNECTING"}</span><span className="meetStatus">{connection}</span></div>
  </div>
  <div className="meetToolbar" aria-label="DuKu Meet controls">
   <div className="meetToolbarIdentity"><b>{displayName}</b><span>{participants} participant{participants===1?"":"s"}{joined?" · "+clock:""}</span></div>
   <div className="meetToolbarActions">
    <button type="button" className={"meetControl "+(audioMuted?"isMuted":"")} onClick={()=>command("toggleAudio")} aria-label={audioMuted?"Unmute microphone":"Mute microphone"}>{audioMuted?"🎙️":"🎤"}<span>{audioMuted?"Unmute":"Mute"}</span></button>
    <button type="button" className={"meetControl "+(videoMuted?"isMuted":"")} onClick={()=>command("toggleVideo")} aria-label={videoMuted?"Turn camera on":"Turn camera off"}>{videoMuted?"▣":"▣"}<span>{videoMuted?"Camera on":"Camera off"}</span></button>
    <button type="button" className="meetControl" onClick={()=>command("toggleChat")}>▤<span>Chat</span></button>
    <button type="button" className="meetControl" onClick={()=>command("toggleTileView")}>▦<span>Tiles</span></button>
    <button type="button" className="meetControl" onClick={()=>target.current?.requestFullscreen?.()}>⛶<span>Full screen</span></button>
    <button type="button" className="meetControl meetLeave" onClick={()=>command("hangup")}>↗<span>Leave</span></button>
   </div>
  </div>
  <div className="meetFrame">
   <div ref={target} className="meetFrameInner"/>
   <div className="meetProviderCover" aria-hidden="true"><span>✦</span><div><b>DuKu Meet</b><small>BY DUKU BUSINESS FCA LAB</small></div></div>
  </div>
  <div className="meetBottomBar"><span><i/> Secure course classroom</span><span>Attendance is recorded automatically when you join and leave.</span></div>
 </section>;
}
