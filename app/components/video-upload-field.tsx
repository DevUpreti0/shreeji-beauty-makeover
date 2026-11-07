"use client";
import {useState} from "react";

export default function VideoUploadField({courseId,name,defaultUrl=""}:{courseId:string;name:string;defaultUrl?:string}) {
  const [url,setUrl] = useState(defaultUrl);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [uploadedName,setUploadedName] = useState("");

  async function upload(file?:File) {
    if (!file) return;
    const allowed = ["video/mp4","video/webm","video/quicktime"];
    if (!allowed.includes(file.type)) { setMessage("Please choose an MP4, WEBM or MOV video."); return; }
    if (file.size > 50*1024*1024) { setMessage("This file is larger than 50 MB. Please choose a smaller video."); return; }
    setBusy(true);
    setMessage("Uploading video securely… please keep this page open.");
    const form = new FormData();
    form.set("courseId",courseId);
    form.set("file",file);
    try {
      const response = await fetch("/api/teacher/course-video",{method:"POST",body:form});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      setUrl(result.url);
      setUploadedName(file.name);
      setMessage("Upload complete. Now save this lesson to attach the video.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Video upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section style={{display:"grid",gap:9,padding:14,border:"1px solid #e5d8ce",borderRadius:10,background:"#fffaf6"}}>
    <div>
      <strong style={{display:"block",fontSize:13,color:"#65483e"}}>Upload lesson video</strong>
      <small style={{display:"block",fontSize:11,color:"#81766f",marginTop:4}}>Choose MP4, WEBM or MOV · Maximum 50 MB per video</small>
    </div>
    <label style={{display:"grid",gap:6,fontSize:11,color:"#655850"}}>
      Select video file
      <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} onChange={event=>void upload(event.target.files?.[0])}/>
    </label>
    {busy && <div style={{height:5,background:"#eee2da",borderRadius:9,overflow:"hidden"}}><div style={{height:"100%",width:"65%",background:"#a75e51"}}/></div>}
    {message && <small role="status" aria-live="polite" style={{fontSize:11,color:message.includes("complete")?"#456b4a":"#8a594b"}}>{message}</small>}
    {uploadedName && <small style={{fontSize:10,color:"#6d655f"}}>Selected: {uploadedName}</small>}
    <label style={{display:"grid",gap:5,fontSize:11,color:"#655850"}}>
      Or paste a video URL
      <input type="url" name={name} value={url} onChange={event=>setUrl(event.target.value)} placeholder="YouTube, Vimeo or hosted MP4 URL" style={{width:"100%",padding:11,border:"1px solid #e5dcd4",borderRadius:7,background:"#fff"}}/>
    </label>
    {url && url.startsWith("storage://") ? <small style={{fontSize:10,color:"#456b4a"}}>Private upload attached. Save the lesson to make it available to enrolled learners.</small> : url ? <a href={url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#a75e51"}}>Open video link ↗</a> : null}
  </section>;
}
