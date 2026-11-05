"use client";
import { useState } from "react";
import Link from "next/link";
import "./hubtown.css";

const agents = ["Intake & Triage","Evidence Analyst","Policy Advisor","Global Benchmark Agent","Scenario Evaluator","Review & Synthesis"];
export default function ContactPage(){
 const [menu,setMenu]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState("");
 const [title,setTitle]=useState(""),[summary,setSummary]=useState(""),[domain,setDomain]=useState("Government Services");
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setResult("");
  try{
   const response=await fetch("/api/cases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,summary,domain,priority:"Medium"})});
   if(!response.ok)throw new Error("Case creation failed ("+response.status+"). Check the backend connection.");
   const data=await response.json();if(!data.id)throw new Error("Backend did not return a case ID.");
   setResult(data.id);setTitle("");setSummary("");
  }catch(err){setError(err instanceof Error?err.message:"Unable to create case.");}finally{setBusy(false)}
 }
 return <div className="hub">
 <header className="hubNav"><Link href="/" className="hubLogo">UNICRON<span>®</span></Link><span className="hubNavCenter">INTELLIGENCE / HUMAN GOVERNANCE / AI FOR GOOD</span><button type="button" className="hubMenuButton" onClick={()=>setMenu(!menu)} aria-expanded={menu}>{menu?"Close":"Menu"} <span>{menu?"×":"☰"}</span></button></header>
 {menu&&<nav className="hubOverlay" aria-label="Main menu"><button onClick={()=>setMenu(false)} className="hubClose">Close ×</button>{[["Overview","/"],["Investigations","/#investigations"],["Agent network","/#agents"],["Launch a case","/contact"]].map(([name,url],i)=><Link key={name} onClick={()=>setMenu(false)} href={url}><small>0{i+1}</small>{name}<span>↗</span></Link>)}</nav>}
 <main>
 <section className="hubHero"><div className="hubEyebrow">UNICRON / START AN INVESTIGATION <span>01 — 04</span></div><h1>Get in <em>touch.</em></h1><div className="hubHeroFoot"><p>Bring a question to intelligence.<br/>Explore it with evidence.</p><span>SCROLL TO EXPLORE ↓</span></div></section>
 <section className="hubIntro"><div className="hubIndex">01 / THE PLATFORM</div><div><h2>Every important decision<br/>begins with a <em>question.</em></h2><p>UNICRON brings together policy evidence, international benchmarks, scenario evaluation and human oversight in one traceable investigation workflow.</p></div></section>
 <section className="hubDetails"><div className="hubIndex">02 / INVESTIGATION INTAKE</div><div className="hubDetailGrid"><div className="hubSide"><h3>Drop us a line.</h3><p>Describe a real public-sector question. Your case will be saved in the UNICRON backend for review and investigation.</p><div className="hubRule"/><small>AGENT PIPELINE</small>{agents.map((a,i)=><div className="hubAgent" key={a}><span>{String(i+1).padStart(2,"0")}</span>{a}</div>)}</div>
 <form className="hubForm" onSubmit={submit}><div className="hubFormHeader">CREATE AN INVESTIGATION <span>ALL FIELDS REQUIRED *</span></div><label>Investigation title *<input required minLength={3} maxLength={180} placeholder="Enter the central question" value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Application domain *<select value={domain} onChange={e=>setDomain(e.target.value)}><option>Government Services</option><option>Healthcare</option><option>Education</option><option>Environment</option><option>Transportation</option><option>Public Safety</option><option>Other</option></select></label><label>Investigation context *<textarea required minLength={10} rows={5} placeholder="Describe the scenario, relevant jurisdictions, evidence and decision to be evaluated…" value={summary} onChange={e=>setSummary(e.target.value)}/></label><p className="hubConsent">Investigations are advisory and require qualified human review. Do not include confidential personal information or classified material.</p><button className="hubSubmit" disabled={busy} type="submit">{busy?"Submitting…":"Submit investigation"} <span>↗</span></button>{error&&<p role="alert" className="hubError">{error}</p>}{result&&<p role="status" className="hubSuccess">Case created: <strong>{result}</strong>. Open the investigation workspace from the main platform to review and run it.</p>}</form></div></section>
 <section className="hubManifesto"><div className="hubIndex">03 / OUR APPROACH</div><h2>Built for evidence.<br/><em>Designed for accountability.</em></h2><p>Six coordinated agent stages. Verified sources. Recorded decisions. Human review at the center.</p><Link href="/">Explore UNICRON <span>↗</span></Link></section>
 </main><footer className="hubFooter"><span>UNICRON®</span><p>PUBLIC-SECTOR INTELLIGENCE<br/>ITU AI FOR GOOD / UAE</p><Link href="/">BACK TO PLATFORM ↗</Link><small>© {new Date().getFullYear()} UNICRON</small></footer>
 </div>
}