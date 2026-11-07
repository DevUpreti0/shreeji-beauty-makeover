"use client";
import {useEffect,useRef,useState} from "react";
declare global {interface Window {JitsiMeetExternalAPI?:new(domain:string,options:any)=>MeetingApi}}
type MeetingApi={dispose:()=>void;addListener:(event:string,callback:(data?:any)=>void)=>void;executeCommand?:(name:string,...args:any[])=>void};
export default function MeetingRoom({roomName,displayName,classId}:{roomName:string;displayName:string;classId:string}){
 const target=useRef<HTMLDivElement>(null),apiRef=useRef<MeetingApi|null>(null),joinedAt=useRef<number|null>(null);
 const [connection,setConnection]=useState("Preparing your classroom…"),[joined,setJoined]=useState(false),[participants,setParticipants]=useState(0),[audioMuted,setAudioMuted]=useState(true),[videoMuted,setVideoMuted]=useState(true),[elapsed,setElapsed]=useState(0),[attempt,setAttempt]=useState(0),[loadError,setLoadError]=useState("");
 const command=(name:string)=>apiRef.current?.executeCommand?.(name);
 const domain=(process.env.NEXT_PUBLIC_JITSI_DOMAIN||"meet.jit.si").replace(/^https?:\\/\\//,"").replace(/\\/$/,"");
 useEffect(()=>{
  let api:MeetingApi|undefined,disposed=false,hasJoined=false,script:HTMLScriptElement|null=null;
  const record=async(event:"joined"|"left")=>{try{await fetch("/api/live-classes/"+encodeURIComponent(classId)+"/attendance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event}),keepalive:event==="left"});}catch{}};
  const mount=()=>{
   if(disposed||!target.current||!window.JitsiMeetExternalAPI)return;
   setLoadError("");setConnection("Connecting to DuKu Meet…");
   api=new window.JitsiMeetExternalAPI(domain,{roomName:"ShreejiClass"+roomName,width:"100%",height:"100%",parentNode:target.current,userInfo:{displayName},
    configOverwrite:{prejoinConfig:{enabled:true},startWithAudioMuted:true,disableDeepLinking:true,enableWelcomePage:false,hideConferenceSubject:false,hideConferenceTimer:false,disableInviteFunctions:true,enableNoAudioDetection:true,enableNoisyMicDetection:true,enableClosePage:true},
    interfaceConfigOverwrite:{APP_NAME:"DuKu Meet",NATIVE_APP_NAME:"DuKu Meet",MOBILE_APP_PROMO:false,SHOW_JITSI_WATERMARK:false,SHOW_WATERMARK_FOR_GUESTS:false,SHOW_BRAND_WATERMARK:false,SHOW_POWERED_BY:false,BRAND_WATERMARK_LINK:"",DEFAULT_BACKGROUND:"#080d17",DEFAULT_REMOTE_DISPLAY_NAME:"Class participant",DEFAULT_LOCAL_DISPLAY_NAME:"You",TOOLBAR_BUTTONS:["microphone","camera","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","profile","chat","raisehand","videoquality","filmstrip","tileview","settings","select-background","mute-everyone"]}});
   apiRef.current=api;
   api.addListener("videoConferenceJoined",()=>{if(disposed)return;hasJoined=true;joinedAt.current=Date.now();setJoined(true);setParticipants(1);setConnection("Connected · attendance recorded");void record("joined");});
   api.addListener("participantJoined",()=>setParticipants(n=>n+1));
   api.addListener("participantLeft",()=>setParticipants(n=>Math.max(1,n-1)));
   api.addListener("audioMuteStatusChanged",(e:any)=>setAudioMuted(!!e?.muted));
   api.addListener("videoMuteStatusChanged",(e:any)=>setVideoMuted(!!e?.muted));
   api.addListener("connectionEstablished",()=>setConnection("Connection established"));
   api.addListener("connectionInterrupted",()=>setConnection("Connection interrupted · reconnecting…"));
   api.addListener("connectionRestored",()=>setConnection("Connection restored"));
   api.addListener("connectionFailed",()=>{setConnection("Meeting connection failed");setLoadError("Your internet connection or the meeting service may be unavailable. Check your network and retry.");});
   api.addListener("conferenceFailed",(e:any)=>{setConnection("Could not join the classroom");setLoadError(e?.message||"The meeting could not be joined. Please retry.");});
   api.addListener("videoConferenceLeft",()=>{if(hasJoined){hasJoined=false;setJoined(false);setConnection("You left the classroom");void record("left");}});
   api.addListener("readyToClose",()=>{if(hasJoined){hasJoined=false;setJoined(false);setConnection("Classroom closed");void record("left");}});
  };
  if(window.JitsiMeetExternalAPI)mount();else{
   const existing=document.querySelector<HTMLScriptElement>('script[data-duku-jitsi="true"]');
   if(existing){script=existing;if((existing as any).dataset.loaded==="true")mount();else{existing.addEventListener("load",mount,{once:true});existing.addEventListener("error",()=>{existing.remove();setLoadError("Could not load the meeting service. Check your internet connection and retry.");},{once:true});}}
   else{script=document.createElement("script");script.src="https://"+domain+"/external_api.js";script.async=true;script.dataset.dukuJitsi="true";script.onload=()=>{script!.dataset.loaded="true";mount();};script.onerror=()=>{script?.remove();setConnection("Meeting service unavailable");setLoadError("Could not load the meeting service. Check your internet connection and retry.");};document.head.appendChild(script);}
  }
  const onPageHide=()=>{if(hasJoined){hasJoined=false;void record("left");}};
  window.addEventListener("pagehide",onPageHide);
  return()=>{disposed=true;window.removeEventListener("pagehide",onPageHide);if(hasJoined)void record("left");api?.dispose();apiRef.current=null;};
 },[roomName,displayName,classId,attempt]);
 useEffect(()=>{if(!joined)return;const timer=window.setInterval(()=>setElapsed(joinedAt.current?Math.floor((Date.now()-joinedAt.current)/1000):0),1000);return()=>window.clearInterval(timer);},[joined]);
 const clock=String(Math.floor(elapsed/60)).padStart(2,"0")+":"+String(elapsed%60).padStart(2,"0");
 return <section className="portalPanel meetShell">
  <div className="meetStageHead"><div className="meetWatermark"><span>✦</span><div><b>DuKu Meet</b><small>DUKU BUSINESS FCA LAB</small></div></div><div className="meetHeaderMeta"><span className={"meetLivePill "+(joined?"isLive":"")}>{joined?"● LIVE SESSION":"● "+(loadError?"RECONNECT NEEDED":"CONNECTING")}</span><span className="meetStatus" role="status">{connection}</span></div></div>
  <div className="meetToolbar" aria-label="DuKu Meet controls"><div className="meetToolbarIdentity"><b>{displayName}</b><span>{participants} participant{participants===1?"":"s"}{joined?" · "+clock:""}</span></div><div className="meetToolbarActions">
   <button type="button" className={"meetControl "+(audioMuted?"isMuted":"")} onClick={()=>command("toggleAudio")} aria-label={audioMuted?"Unmute microphone":"Mute microphone"}>🎙️<span>{audioMuted?"Unmute":"Mute"}</span></button>
   <button type="button" className={"meetControl "+(videoMuted?"isMuted":"")} onClick={()=>command("toggleVideo")} aria-label={videoMuted?"Turn camera on":"Turn camera off"}>▣<span>{videoMuted?"Camera on":"Camera off"}</span></button>
   <button type="button" className="meetControl" onClick={()=>command("toggleChat")}>▤<span>Chat</span></button>
   <button type="button" className="meetControl" onClick={()=>command("toggleShareScreen")}>▧<span>Share screen</span></button>
   <button type="button" className="meetControl" onClick={()=>command("toggleRaiseHand")}>✋<span>Raise hand</span></button>
   <button type="button" className="meetControl" onClick={()=>command("toggleTileView")}>▦<span>Tiles</span></button>
   <button type="button" className="meetControl" onClick={()=>command("toggleSettings")}>⚙<span>Devices</span></button>
   <button type="button" className="meetControl" onClick={()=>target.current?.requestFullscreen?.()}>⛶<span>Full screen</span></button>
   <button type="button" className="meetControl meetLeave" onClick={()=>command("hangup")}>↗<span>Leave</span></button>
  </div></div>
  {loadError&&<div role="alert" className="formMessage" style={{margin:"10px 0"}}>{loadError} <button type="button" className="outline" onClick={()=>{setLoadError("");setConnection("Retrying meeting connection…");setAttempt(x=>x+1);}}>Retry connection</button></div>}
  <div className="meetFrame"><div ref={target} className="meetFrameInner"/><div className="meetProviderCover" aria-hidden="true"><span>✦</span><div><b>DuKu Meet</b><small>BY DUKU BUSINESS FCA LAB</small></div></div></div>
  <div className="meetBottomBar"><span><i/> Course classroom · attendance tracking enabled</span><span>Use Devices to select your microphone, camera and speakers. Use Share screen for demonstrations.</span></div>
 </section>;
}