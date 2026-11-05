"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TwinCase, TwinEvent, TwinNode } from "./digital-twin";

const DigitalTwin=dynamic(()=>import("./digital-twin"),{ssr:false});
const AGENTS=["Intake & Triage","Evidence Analyst","Policy Advisor","Global Benchmark Agent","Scenario Evaluator","Review & Synthesis"];
type Job={id:string;status:string;error_type?:string|null;result_id?:string|null};
type Run={id:string;created_at:string;human_review_required:boolean;limitations?:string[];stages:{agent:string;status:string;result?:unknown;note?:string}[]};
type Execution={id:string;status:string;updated_at:string};
type Review={id:string;investigation_id:string;decision:string;reviewer:string;created_at:string};
async function api<T>(url:string,options?:RequestInit):Promise<T>{
  const r=await fetch(url,{cache:"no-store",...options});
  const value:unknown=await r.json().catch(()=>({detail:"Invalid backend response"}));
  if(!r.ok){const e=value as {detail?:string};throw new Error(e.detail??`HTTP ${r.status}`);}
  return value as T;
}
function StructuredResult({value}:{value:unknown}){
  if(value===null||value===undefined)return <p className="muted">No recorded result.</p>;
  if(Array.isArray(value))return <div className="resultList">{value.map((item,i)=><div className="resultItem" key={i}><span className="resultIndex">{String(i+1).padStart(2,"0")}</span><StructuredResult value={item}/></div>)}</div>;
  if(typeof value==="object")return <div className="resultObject">{Object.entries(value).map(([key,v])=><div className="resultField" key={key}><span className="resultKey">{key.replaceAll("_"," ")}</span><StructuredResult value={v}/></div>)}</div>;
  return <p className="resultValue">{String(value)}</p>;
}
export default function Home(){
  const [cases,setCases]=useState<TwinCase[]>([]);
  const [selectedCase,setSelectedCase]=useState("");
  const [selectedAgent,setSelectedAgent]=useState(AGENTS[0]);
  const [selectedDepartment,setSelectedDepartment]=useState("");
  const [jobs,setJobs]=useState<Job[]>([]);
  const [runs,setRuns]=useState<Run[]>([]);
  const [executions,setExecutions]=useState<Execution[]>([]);
  const [events,setEvents]=useState<TwinEvent[]>([]);
  const [reviews,setReviews]=useState<Review[]>([]);
  const [health,setHealth]=useState<"checking"|"online"|"offline">("checking");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState<"console"|"scenario"|"review"|"evidence">("console");
  const [replayIndex,setReplayIndex]=useState<number|null>(null);
  const [replaying,setReplaying]=useState(false);
  const [title,setTitle]=useState("");
  const [summary,setSummary]=useState("");
  const [domain,setDomain]=useState("Citizen services");
  const [creating,setCreating]=useState(false);
  const [reviewer,setReviewer]=useState("");
  const [reviewKey,setReviewKey]=useState("");
  const [rationale,setRationale]=useState("");
  const [ack,setAck]=useState(false);
  const [audit,setAudit]=useState<{id:string;action:string;detail:string;created_at:string}[]>([]);
  const [lastUpdated,setLastUpdated]=useState("");
  const currentCase=cases.find(c=>c.id===selectedCase);
  const currentJob=jobs[0];
  const currentRun=runs[0];
  const running=currentJob?.status==="running"||currentJob?.status==="queued";
  const nodes=useMemo<TwinNode[]>(()=>AGENTS.map(name=>{
    const event=[...events].reverse().find(e=>e.agent===name);
    const stage=currentRun?.stages.find(s=>s.agent===name);
    return {name,status:event?.status??stage?.status??"idle",sequence:event?.sequence};
  }),[events,currentRun]);
  const selectedStage=useMemo(()=>currentRun?.stages.find(s=>s.agent===selectedAgent)??[...events].reverse().find(e=>e.agent===selectedAgent)?.stage,[currentRun,events,selectedAgent]);
  const latestReviewed=reviews.some(r=>r.investigation_id===currentRun?.id);
  const refreshCases=useCallback(async()=>{
    try{
      const records=await api<TwinCase[]>("/api/cases");
      setCases(records);setSelectedCase(previous=>records.some(c=>c.id===previous)?previous:records[0]?.id??"");
      setHealth("online");
    }catch(e){setHealth("offline");setError(e instanceof Error?e.message:"Cases unavailable");}
  },[]);
  const refreshSelected=useCallback(async(id:string)=>{
    if(!id)return;
    const base=`/api/cases/${encodeURIComponent(id)}`;
    const results=await Promise.allSettled([
      api<Job[]>(base+"/jobs"),api<Run[]>(base+"/investigations"),api<Execution[]>(base+"/executions"),api<Review[]>(base+"/reviews")
    ]);
    if(results[0].status==="fulfilled")setJobs(results[0].value);
    if(results[1].status==="fulfilled")setRuns(results[1].value);
    if(results[3].status==="fulfilled")setReviews(results[3].value);
    if(results[2].status==="fulfilled"){
      setExecutions(results[2].value);
      const runId=results[2].value[0]?.id;
      if(runId)try{setEvents(await api<TwinEvent[]>(base+`/executions/${encodeURIComponent(runId)}/events`));}catch{setEvents([]);}
      else setEvents([]);
    }
    setLastUpdated(new Date().toLocaleTimeString());
  },[]);
  useEffect(()=>{const t=setTimeout(()=>void refreshCases(),0);const interval=setInterval(()=>void refreshCases(),15000);return()=>{clearTimeout(t);clearInterval(interval);};},[refreshCases]);
  useEffect(()=>{const t=setTimeout(()=>void refreshSelected(selectedCase),0);const interval=setInterval(()=>void refreshSelected(selectedCase),3000);return()=>{clearTimeout(t);clearInterval(interval);};},[selectedCase,refreshSelected]);
  useEffect(()=>{if(tab!=="review")return;void api<typeof audit>("/api/audit").then(setAudit).catch(()=>{});},[tab]);
  useEffect(()=>{
    if(!replaying||events.length===0)return;
    const interval=setInterval(()=>setReplayIndex(i=>{if(i===null)return 0;if(i>=events.length-1){setReplaying(false);return i;}return i+1;}),1200);
    return()=>clearInterval(interval);
  },[replaying,events.length]);
  async function run(){
    if(!selectedCase||running)return;
    setBusy(true);setError("");setReplayIndex(null);setReplaying(false);
    try{await api(`/api/cases/${encodeURIComponent(selectedCase)}/investigate/async`,{method:"POST"});await refreshSelected(selectedCase);setTab("console");}
    catch(e){setError(e instanceof Error?e.message:"Investigation could not be queued");}
    finally{setBusy(false);}
  }
  async function create(){
    if(title.trim().length<3||summary.trim().length<3)return;
    setBusy(true);setError("");
    try{
      const c=await api<TwinCase>("/api/cases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,summary,domain,priority:"Medium"})});
      await refreshCases();setSelectedCase(c.id);setCreating(false);setTitle("");setSummary("");
    }catch(e){setError(e instanceof Error?e.message:"Case creation failed");}finally{setBusy(false);}
  }
  async function review(decision:"approved"|"rejected"|"changes_requested"){
    if(!currentRun||!selectedCase)return;
    setBusy(true);setError("");
    try{
      await api(`/api/cases/${encodeURIComponent(selectedCase)}/investigations/${encodeURIComponent(currentRun.id)}/reviews`,{
        method:"POST",headers:{"Content-Type":"application/json","x-reviewer-key":reviewKey},
        body:JSON.stringify({decision,reviewer,rationale,acknowledged_limitations:ack})
      });
      setReviewKey("");setRationale("");setAck(false);await refreshSelected(selectedCase);
    }catch(e){setError(e instanceof Error?e.message:"Review submission failed");}finally{setBusy(false);}
  }
  const replayEvent=replayIndex!==null?events[replayIndex]:null;
  return <div className="appShell">
    <header className="top">
      <div className="identity"><div className="identityMark">U<span>◈</span></div><div><strong>UNICRON</strong><small>GOVERNMENT INTELLIGENCE TWIN</small></div></div>
      <div className="topCenter"><span className="eyebrow">SIMULATED ENVIRONMENT</span><span className="topDivider"/> <span>REAL BACKEND · ADVISORY OUTPUT</span></div>
      <div className="topRight"><span className={`connection ${health}`}><i/>{health==="online"?"API CONNECTED":health==="checking"?"CONNECTING":"API OFFLINE"}</span><span className="clock">{lastUpdated||"—"}</span></div>
    </header>
    <main className="workspace">
      <section className="viewport">
        <div className="sceneOverlay"><span className="eyebrow">DIGITAL TWIN / WORKSPACE 01</span><h1>Government intelligence,<br/><em>made observable.</em></h1><p>Explore departments, agents and persisted case workflows in an interactive 3D environment.</p></div>
        <DigitalTwin cases={cases} nodes={nodes} selectedCase={selectedCase} selectedAgent={selectedAgent} selectedDepartment={selectedDepartment} onCase={setSelectedCase} onAgent={name=>{setSelectedAgent(name);setSelectedDepartment("");setTab("console");}} onDepartment={name=>{setSelectedDepartment(name);}} events={events} replayIndex={replayIndex} live={health==="online"}/>
        <div className="sceneBottom"><div className="legend"><span><i className="legendDot mint"/> Recorded completion</span><span><i className="legendDot gold"/> Citizen case</span><span><i className="legendDot blue"/> Pending stage</span></div><span>DRAG TO ORBIT · SCROLL TO ZOOM · RIGHT-DRAG TO PAN</span></div>
        {selectedDepartment&&<div className="departmentCallout"><span className="eyebrow">SELECTED DEPARTMENT</span><strong>{selectedDepartment}</strong><p>Conceptual 3D department. No live government facility or external system is connected.</p><button onClick={()=>setSelectedDepartment("")}>Clear focus ×</button></div>}
      </section>
      <aside className="controlPanel">
        <div className="panelHead"><div><span className="eyebrow">MISSION CONTROL / 001</span><h2>Agent operations</h2></div><span className="liveIcon">◉</span></div>
        <div className="casePicker"><label htmlFor="case">ACTIVE INVESTIGATION</label><select id="case" value={selectedCase} onChange={e=>{setSelectedCase(e.target.value);setReplayIndex(null);setReplaying(false);}}><option value="">Select a case</option>{cases.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select><div className="caseMeta"><span>{currentCase?.id??"NO CASE"}</span><span>{currentCase?.priority??"—"} PRIORITY</span></div><button className="quietButton" onClick={()=>setCreating(v=>!v)}>{creating?"Close new case":"＋ Create new citizen case"}</button>
          {creating&&<div className="createForm"><input aria-label="Case title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Case title"/><textarea aria-label="Case summary" value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Describe a hypothetical case" rows={3}/><select aria-label="Domain" value={domain} onChange={e=>setDomain(e.target.value)}>{["Citizen services","Healthcare","Education","Infrastructure","Public safety","Policy"].map(x=><option key={x}>{x}</option>)}</select><button className="action" disabled={busy||title.trim().length<3||summary.trim().length<3} onClick={()=>void create()}>Save case to backend</button></div>}
        </div>
        <div className="tabs">{(["console","scenario","evidence","review"] as const).map(t=><button key={t} className={tab===t?"chosen":""} onClick={()=>setTab(t)}>{t==="console"?"AGENTS":t==="scenario"?"SCENARIO":t==="evidence"?"EVIDENCE":"REVIEW"}</button>)}</div>
        <div className="panelBody">
          {error&&<div role="alert" className="errorBox">{error}<button onClick={()=>setError("")} aria-label="Dismiss error">×</button></div>}
          {tab==="console"&&<>
            <div className="subHead"><span>EXECUTION NETWORK</span><span>{nodes.filter(n=>n.status==="completed").length}/6</span></div>
            <div className="agentRoster">{nodes.map((n,i)=><button key={n.name} className={selectedAgent===n.name?"rosterRow selected": "rosterRow"} onClick={()=>{setSelectedAgent(n.name);setSelectedDepartment("");}}><span className="rosterNumber">0{i+1}</span><span className="rosterName">{n.name}<small>{n.status==="idle"?"Not executed":n.status.replaceAll("_"," ")}</small></span><span className={`statusOrb ${n.status==="completed"?"done":n.status==="idle"?"":n.status==="source_required"?"blocked":"pending"}`}/></button>)}</div>
            <div className="inspector"><div className="subHead"><span>AGENT INSPECTOR</span><span>READ ONLY</span></div><h3>{selectedAgent}</h3><span className="inspectorStatus">{selectedStage?.status??"Awaiting execution"}</span><StructuredResult value={selectedStage?.result??selectedStage?.note}/></div>
          </>}
          {tab==="scenario"&&<>
            <div className="subHead"><span>SCENARIO LAB</span><span>RECORDED STATE</span></div>
            <p className="muted">The current backend supports queued investigations and recorded scenario evaluations. It does not support pausing a running model, injecting events or resuming a worker.</p>
            <button className="action" onClick={()=>void run()} disabled={!selectedCase||running||busy}>{running?"Investigation queued / running":"Execute real investigation"}</button>
            <div className="subHead" style={{marginTop:24}}><span>EVENT TIMELINE</span><span>{events.length} CHECKPOINTS</span></div>
            {events.length>0?<><input className="timelineRange" type="range" min={0} max={events.length-1} value={replayIndex??events.length-1} onChange={e=>{setReplayIndex(Number(e.target.value));setReplaying(false);}} aria-label="Replay event index"/><div className="replayControls"><button onClick={()=>{setReplayIndex(0);setReplaying(false);}}>↺ Start</button><button onClick={()=>{if(replayIndex===null||replayIndex>=events.length-1)setReplayIndex(0);setReplaying(v=>!v);}}>{replaying?"Ⅱ Pause replay":"▶ Replay"}</button><button onClick={()=>{setReplayIndex(null);setReplaying(false);}}>Live state</button></div><p className="muted">{replayEvent?`Event #${replayEvent.sequence}: ${replayEvent.agent} — ${replayEvent.status}`:"Showing latest persisted events"}</p></>:<p className="muted">No recorded events. Run an investigation to generate a timeline.</p>}
            <div className="inspector"><h3>Scenario Evaluator</h3><StructuredResult value={currentRun?.stages.find(s=>s.agent==="Scenario Evaluator")?.result}/></div>
          </>}
          {tab==="evidence"&&<><div className="subHead"><span>GROUNDED FINDINGS</span><span>READ ONLY</span></div><p className="muted">These findings come from the investigation record. A missing or unverified source must not be treated as an established policy.</p>{["Evidence Analyst","Policy Advisor","Global Benchmark Agent"].map(name=><div className="inspector" key={name}><h3>{name}</h3><StructuredResult value={currentRun?.stages.find(s=>s.agent===name)?.result}/></div>)}</>}
          {tab==="review"&&<><div className="subHead"><span>HUMAN OVERSIGHT</span><span>PROTECTED</span></div><p className="muted">Decisions are advisory review records only. No government action or case resolution is executed.</p>{reviews.map(r=><div className="reviewRecord" key={r.id}><strong>{r.decision}</strong><span>{r.reviewer} · {r.created_at}</span></div>)}<div className="inspector"><h3>Record a review decision</h3><input placeholder="Reviewer name" aria-label="Reviewer name" value={reviewer} onChange={e=>setReviewer(e.target.value)}/><input placeholder="Reviewer API key (not stored)" aria-label="Reviewer API key" type="password" autoComplete="off" value={reviewKey} onChange={e=>setReviewKey(e.target.value)}/><textarea placeholder="Rationale (minimum 10 characters)" aria-label="Review rationale" rows={4} value={rationale} onChange={e=>setRationale(e.target.value)}/><label className="ack"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/> I acknowledge investigation limitations</label><div className="reviewButtons"><button disabled={busy||!currentRun||latestReviewed||reviewer.length<2||rationale.length<10||!reviewKey||!ack} onClick={()=>void review("approved")}>Approve</button><button disabled={busy||!currentRun||latestReviewed||reviewer.length<2||rationale.length<10||!reviewKey} onClick={()=>void review("rejected")}>Reject</button><button disabled={busy||!currentRun||latestReviewed||reviewer.length<2||rationale.length<10||!reviewKey} onClick={()=>void review("changes_requested")}>Request changes</button></div></div><div className="inspector"><h3>Recent audit entries</h3>{audit.slice(0,8).map(a=><p className="auditEntry" key={a.id}><strong>{a.action}</strong><br/>{a.detail}</p>)}</div></>}
        </div>
        <footer className="panelFooter"><span className={running?"workingDot":""}>●</span> {currentJob?.status?.toUpperCase()??"NO JOB"} {currentJob?.error_type&&" · "+currentJob.error_type}<span>{executions[0]?.status??"No execution"}</span></footer>
      </aside>
    </main>
    <footer className="globalFooter"><span>UNICRON / HR-PRESENTS</span><span>SIMULATED GOVERNMENT ENVIRONMENT · HUMAN REVIEW REQUIRED · NO REAL-WORLD ACTIONS</span><span>BUILD 0.2 / DEVELOPMENT</span></footer>
  </div>;
}
