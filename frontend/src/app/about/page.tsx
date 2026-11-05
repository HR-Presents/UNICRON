"use client";
import {useState} from "react";
import Link from "next/link";
import "../contact/hubtown.css";
import "./about.css";

const stages=[
 ["01","Intake & Triage","Frame the question, define scope and identify the decision context."],
 ["02","Evidence Analyst","Review eligible sources, provenance and gaps in the record."],
 ["03","Policy Advisor","Analyze policy implications without presenting advice as binding law."],
 ["04","Global Benchmark Agent","Compare relevant international frameworks and practices."],
 ["05","Scenario Evaluator","Examine hypothetical outcomes and practical trade-offs."],
 ["06","Review & Synthesis","Consolidate findings and preserve the human decision gate."]
];
export default function AboutPage(){
 const [menu,setMenu]=useState(false);
 return <div className="hub">
 <header className="hubNav"><Link href="/home" className="hubLogo">UNICRON<span>®</span></Link><span className="hubNavCenter">INTELLIGENCE / HUMAN GOVERNANCE / AI FOR GOOD</span><button className="hubMenuButton" onClick={()=>setMenu(!menu)} aria-expanded={menu}>{menu?"Close":"Menu"} <span>{menu?"×":"☰"}</span></button></header>
 {menu&&<nav className="hubOverlay" aria-label="Main menu"><button className="hubClose" onClick={()=>setMenu(false)}>Close ×</button>{[["Home","/home"],["About UNICRON","/about"],["Intelligence workspace","/"],["Agent network","/network"],["Launch a case","/contact"]].map(([label,href],i)=><Link href={href} key={href} onClick={()=>setMenu(false)}><small>0{i+1}</small>{label}<span>↗</span></Link>)}</nav>}
 <main>
 <section className="hubHero aboutHero"><div className="hubEyebrow">UNICRON / ABOUT THE PLATFORM <span>01 — 04</span></div><h1>Beyond <em>answers.</em></h1><div className="hubHeroFoot"><p>Intelligence that can be examined.<br/>Decisions that remain human.</p><span>SCROLL TO EXPLORE ↓</span></div></section>
 <section className="hubIntro"><div className="hubIndex">01 / OUR PURPOSE</div><div><h2>Knowledge in service<br/>of <em>better decisions.</em></h2><p>UNICRON is an experimental public-sector intelligence platform built for the ITU AI for Good UAE hackathon. It combines evidence-grounded AI investigation, cross-national policy learning and human oversight.</p><p>Its outputs are advisory. Policy conclusions require qualified human review and jurisdiction-specific validation.</p></div></section>
 <section className="aboutStatement"><span className="hubIndex">02 / HOW IT WORKS</span><div><p>Six specialized stages.<br/><em>One accountable workflow.</em></p><span>Every stage can be inspected through the investigation workspace, with recorded checkpoints and source provenance where available.</span></div></section>
 <section className="aboutAgents"><div className="hubIndex">03 / THE AGENT NETWORK</div><div className="aboutAgentList">{stages.map(([number,name,description])=><div className="aboutAgentRow" key={number}><span>{number}</span><h3>{name}</h3><p>{description}</p><span className="aboutArrow">↗</span></div>)}</div></section>
 <section className="hubManifesto"><div className="hubIndex">04 / EXPLORE UNICRON</div><h2>From the first question<br/>to <em>human judgment.</em></h2><p>Create a case, inspect the agent stages and review evidence, scenario checkpoints and governance records through the existing platform.</p><Link href="/contact">Start an investigation <span>↗</span></Link><div><Link href="/">Open intelligence workspace <span>↗</span></Link></div></section>
 </main><footer className="hubFooter"><span>UNICRON®</span><p>PUBLIC-SECTOR INTELLIGENCE<br/>ITU AI FOR GOOD / UAE</p><Link href="/contact">LAUNCH A CASE ↗</Link><small>© {new Date().getFullYear()} UNICRON</small></footer>
 </div>
}