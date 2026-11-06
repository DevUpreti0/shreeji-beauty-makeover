"use client";
import {useEffect,useRef} from "react";
declare global{interface Window{JitsiMeetExternalAPI?:new(domain:string,options:any)=>{dispose:()=>void}}}
export default function MeetingRoom({roomName,displayName}:{roomName:string;displayName:string}){
 const target=useRef<HTMLDivElement>(null);
 useEffect(()=>{let api:{dispose:()=>void}|undefined;let disposed=false;
  const mount=()=>{if(disposed||!target.current||!window.JitsiMeetExternalAPI)return;api=new window.JitsiMeetExternalAPI("meet.jit.si",{roomName:"ShreejiClass"+roomName,width:"100%",height:640,parentNode:target.current,userInfo:{displayName},configOverwrite:{prejoinConfig:{enabled:true},startWithAudioMuted:true},interfaceConfigOverwrite:{MOBILE_APP_PROMO:false}});};
  if(window.JitsiMeetExternalAPI)mount();else{const script=document.createElement("script");script.src="https://meet.jit.si/external_api.js";script.async=true;script.onload=mount;document.head.appendChild(script);}
  return()=>{disposed=true;api?.dispose();};
 },[roomName,displayName]);
 return <div className="portalPanel"><div ref={target} style={{width:"100%",minHeight:640,background:"#171717",borderRadius:12,overflow:"hidden"}}/><p style={{fontSize:12}}>Allow camera and microphone when your browser asks. Use headphones to reduce echo.</p></div>;
}
