"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type Section = "Overview" | "Cases" | "Agent Studio" | "Knowledge" | "Policy Lab" | "Scenarios" | "Audit";
type Case = { id: string; title: string; domain: string; status: "Review" | "Investigating" | "New"; priority: "High" | "Medium" | "Low"; summary: string; };
const initialCases: Case[] = [
  { id: "DEMO-001", title: "Delayed municipal service resolution", domain: "Citizen services", status: "Review", priority: "High", summary: "A citizen reports repeated delays and inconsistent updates about a public service request." },
  { id: "DEMO-002", title: "District service interruption", domain: "Infrastructure", status: "Investigating", priority: "Medium", summary: "Multiple service reports suggest a localized outage requiring coordinated response." },
  { id: "DEMO-003", title: "Conflicting eligibility guidance", domain: "Policy", status: "New", priority: "Medium", summary: "Two published guidance documents appear to provide different eligibility criteria." },
];
const agents = [
  { id: "intake", name: "Intake & Triage", role: "Normalize reports and detect missing information", x: 8, y: 17 },
  { id: "evidence", name: "Evidence Analyst", role: "Retrieve and assess supporting documents", x: 37, y: 8 },
  { id: "policy", name: "Policy Advisor", role: "Check regulatory alignment and cross-border lessons", x: 70, y: 17 },
  { id: "risk", name: "Risk Assessor", role: "Evaluate impact, uncertainty and constraints", x: 8, y: 64 },
  { id: "synthesis", name: "Case Synthesizer", role: "Reconcile findings and flag disagreements", x: 37, y: 71 },
  { id: "scenario", name: "Scenario Evaluator", role: "Test proposed decisions under changing conditions", x: 70, y: 64 },
];
const sections: { name: Section; symbol: string }[] = [
  { name: "Overview", symbol: "◫" }, { name: "Cases", symbol: "▤" }, { name: "Agent Studio", symbol: "⌘" },
  { name: "Knowledge", symbol: "▧" }, { name: "Policy Lab", symbol: "⚖" }, { name: "Scenarios", symbol: "◇" }, { name: "Audit", symbol: "≡" },
];

export default function Home() {
  const [section, setSection] = useState<Section>("Overview");
  const [cases, setCases] = useState<Case[]>(initialCases);
  const [selectedCase, setSelectedCase] = useState<string>("DEMO-001");
  const [selectedAgent, setSelectedAgent] = useState<string>("evidence");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [backend, setBackend] = useState<"checking" | "online" | "offline">("checking");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [scenario, setScenario] = useState("outage");
  const [scenarioResult, setScenarioResult] = useState(false);
  const [events, setEvents] = useState<string[]>(["Demo workspace initialized. No live agent runs have been started."]);
  const currentCase = cases.find(c => c.id === selectedCase) ?? cases[0];
  const currentAgent = agents.find(a => a.id === selectedAgent) ?? agents[0];
  const filtered = useMemo(() => cases.filter(c => `${c.id} ${c.title} ${c.domain}`.toLowerCase().includes(query.toLowerCase())), [cases, query]);
  useEffect(() => { fetch("/api/health", { cache: "no-store" }).then(r => setBackend(r.ok ? "online" : "offline")).catch(() => setBackend("offline")); }, []);
  const log = (message: string) => setEvents(e => [message, ...e].slice(0, 12));
  function addCase() {
    if (!newTitle.trim()) return;
    const id = `LOCAL-${String(cases.length + 1).padStart(3, "0")}`;
    setCases(cs => [{ id, title: newTitle.trim(), domain: "Citizen services", status: "New", priority: "Low", summary: newSummary.trim() || "Awaiting supporting evidence." }, ...cs]);
    setSelectedCase(id); setSection("Cases"); setShowNew(false); setNewTitle(""); setNewSummary("");
    log(`Created local case ${id}. This case is not yet saved to the backend.`);
  }
  return (
    <div className={`${styles.app} ${theme === "dark" ? styles.dark : ""}`}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><div className={styles.brandMark}>C<span>·</span></div><div><strong>CIVITAS</strong><small>GOVERNMENT INTELLIGENCE</small></div></div>
        <div className={styles.navCaption}>WORKSPACE</div>
        <nav aria-label="Main navigation">{sections.map(item => <button key={item.name} className={`${styles.navItem} ${section === item.name ? styles.active : ""}`} onClick={() => setSection(item.name)}><span className={styles.navIcon}>{item.symbol}</span>{item.name}{section === item.name && <span className={styles.navArrow}>↗</span>}</button>)}</nav>
        <div className={styles.sidebarBottom}><div className={styles.smallLabel}>ENVIRONMENT</div><div className={styles.environment}><span className={`${styles.dot} ${backend === "online" ? styles.good : backend === "offline" ? styles.bad : ""}`}/><div><strong>Local development</strong><small>API {backend === "checking" ? "checking…" : backend}</small></div></div><div className={styles.version}>CIVITAS / HR-Presents <span>v0.1</span></div></div>
      </aside>
      <div className={styles.mainArea}>
        <header className={styles.topbar}><div className={styles.breadcrumb}>CIVITAS <span>/</span> {section}</div><div className={styles.topActions}><span className={styles.demoLabel}>DEMONSTRATION DATA</span><button className={styles.iconButton} aria-label="Toggle color theme" onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>{theme === "light" ? "☾" : "☀"}</button><div className={styles.avatar}>HR</div></div></header>
        <main className={styles.content}>
          <div className={styles.pageHeading}><div><div className={styles.eyebrow}>GOVERNMENT SERVICES / INTELLIGENCE WORKSPACE</div><h1>{section === "Overview" ? "A clearer view of every decision." : section}</h1><p>{section === "Overview" ? "Evidence, policy and agent collaboration — in one accountable workspace." : "Explore evidence-grounded workflows with clearly labeled demonstration data."}</p></div><button className={styles.primaryButton} onClick={() => setShowNew(true)}>＋ New case</button></div>
          {section === "Overview" && <>
            <div className={styles.metrics}><div><small>Cases in workspace</small><strong>{cases.length.toString().padStart(2, "0")}</strong><span>Local demonstration</span></div><div><small>Configured agents</small><strong>{agents.length.toString().padStart(2, "0")}</strong><span>Not executing</span></div><div><small>Knowledge documents</small><strong>00</strong><span>Awaiting ingestion</span></div><div><small>Backend connection</small><strong className={styles.backendText}>{backend}</strong><span>FastAPI health endpoint</span></div></div>
            <div className={styles.overviewGrid}><section className={`${styles.panel} ${styles.graphPanel}`}><div className={styles.panelHeading}><div><span className={styles.panelKicker}>ORCHESTRATION</span><h2>Agent network</h2></div><button className={styles.textButton} onClick={() => setSection("Agent Studio")}>Open studio ↗</button></div><AgentGraph selected={selectedAgent} onSelect={setSelectedAgent}/><div className={styles.graphFooter}><span><span className={styles.dot}/> 6 configured nodes</span><span>Click a node to inspect</span></div></section><section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.panelKicker}>WORK QUEUE</span><h2>Recent cases</h2></div><button className={styles.textButton} onClick={() => setSection("Cases")}>All cases ↗</button></div><div className={styles.caseList}>{cases.slice(0,4).map(c => <button key={c.id} className={styles.caseRow} onClick={() => {setSelectedCase(c.id);setSection("Cases");}}><span className={styles.caseIcon}>↗</span><span className={styles.caseBody}><strong>{c.title}</strong><small>{c.id} · {c.domain}</small></span><span className={styles.caseStatus}>{c.status}</span></button>)}</div></section></div>
            <div className={styles.bottomGrid}><section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.panelKicker}>TRACEABILITY</span><h2>Decision lifecycle</h2></div></div><div className={styles.steps}>{["Intake", "Evidence", "Agent review", "Policy check", "Human approval"].map((s,i) => <div key={s} className={styles.step}><span>{String(i+1).padStart(2,"0")}</span><strong>{s}</strong></div>)}</div><p className={styles.muted}>A reference workflow; execution tracking will appear when the orchestration backend is connected.</p></section><section className={`${styles.panel} ${styles.accentPanel}`}><span className={styles.panelKicker}>SCENARIO LAB</span><h2>What changes when a service fails?</h2><p>Explore policy constraints, incomplete evidence and conflicting agent recommendations.</p><button className={styles.secondaryButton} onClick={() => setSection("Scenarios")}>Explore scenarios ↗</button></section></div>
          </>}
          {section === "Cases" && <div className={styles.workspaceGrid}><section className={styles.panel}><div className={styles.panelHeading}><h2>Case registry</h2><span className={styles.tag}>Local data</span></div><input className={styles.input} placeholder="Search cases or domains" value={query} onChange={e => setQuery(e.target.value)}/><div className={styles.caseList}>{filtered.map(c => <button key={c.id} className={`${styles.caseRow} ${selectedCase === c.id ? styles.selectedRow : ""}`} onClick={() => setSelectedCase(c.id)}><span className={styles.caseBody}><strong>{c.title}</strong><small>{c.id} · {c.domain}</small></span><span className={styles.caseStatus}>{c.status}</span></button>)}{filtered.length === 0 && <p className={styles.muted}>No matching cases.</p>}</div></section><section className={styles.panel}><span className={styles.panelKicker}>CASE DETAIL</span><h2 className={styles.detailTitle}>{currentCase.title}</h2><p>{currentCase.summary}</p><div className={styles.detailMeta}><span>Reference</span><strong>{currentCase.id}</strong><span>Priority</span><strong>{currentCase.priority}</strong><span>Status</span><strong>{currentCase.status}</strong></div><div className={styles.divider}/><h3>Review checkpoints</h3><div className={styles.checkpoints}>{["Evidence collected", "Source provenance verified", "Regulatory constraints assessed", "Agent disagreement resolved", "Human decision recorded"].map(t => <label key={t}><input type="checkbox" onChange={e => log(`${currentCase.id}: ${t} ${e.target.checked ? "checked" : "unchecked"} locally.`)}/>{t}</label>)}</div><p className={styles.muted}>Changes are local to this browser session until case persistence is implemented.</p></section></div>}
          {section === "Agent Studio" && <div className={styles.workspaceGrid}><section className={`${styles.panel} ${styles.graphPanel}`}><div className={styles.panelHeading}><div><span className={styles.panelKicker}>AGENT TOPOLOGY</span><h2>Orchestration map</h2></div><span className={styles.tag}>Configured · idle</span></div><AgentGraph selected={selectedAgent} onSelect={setSelectedAgent}/></section><section className={styles.panel}><span className={styles.panelKicker}>SELECTED AGENT</span><h2 className={styles.detailTitle}>{currentAgent.name}</h2><p>{currentAgent.role}</p><div className={styles.detailMeta}><span>Execution</span><strong>Not started</strong><span>Tools</span><strong>Pending integration</strong><span>Trace</span><strong>No run recorded</strong></div><div className={styles.divider}/><h3>Design principle</h3><p>Every agent run should expose its inputs, evidence citations, uncertainty, outputs and decision trail.</p></section></div>}
          {section === "Knowledge" && <section className={`${styles.panel} ${styles.emptyPanel}`}><div className={styles.emptyGlyph}>▧</div><span className={styles.panelKicker}>KNOWLEDGE BASE</span><h2>Ground answers in verifiable sources.</h2><p>Document ingestion, source versioning, citations and cross-national policy retrieval will live here. No documents have been ingested yet.</p><span className={styles.tag}>Integration pending</span></section>}
          {section === "Policy Lab" && <section className={`${styles.panel} ${styles.emptyPanel}`}><div className={styles.emptyGlyph}>⚖</div><span className={styles.panelKicker}>POLICY INTELLIGENCE</span><h2>Compare decisions against real policy.</h2><p>This workspace will map UAE regulations and international policy lessons to service decisions, with cited provisions and human review.</p><span className={styles.tag}>Verified sources required</span></section>}
          {section === "Scenarios" && <div className={styles.workspaceGrid}><section className={styles.panel}><span className={styles.panelKicker}>SCENARIO DESIGNER</span><h2 className={styles.detailTitle}>Explore a government service incident.</h2><p>Choose a demonstration scenario to preview the evaluation questions the agents will need to address.</p><label className={styles.fieldLabel} htmlFor="scenario">Scenario</label><select id="scenario" className={styles.input} value={scenario} onChange={e => {setScenario(e.target.value);setScenarioResult(false);}}><option value="outage">Multi-district service outage</option><option value="evidence">Complaint with conflicting evidence</option><option value="policy">Cross-jurisdiction policy conflict</option></select><button className={styles.primaryButton} onClick={() => {setScenarioResult(true);log("Scenario preview opened; no AI evaluation executed.");}}>Preview evaluation framework</button></section><section className={styles.panel}><span className={styles.panelKicker}>EVALUATION FRAMEWORK</span><h2 className={styles.detailTitle}>{scenarioResult ? "Questions to evaluate" : "Awaiting scenario selection"}</h2>{scenarioResult ? <div className={styles.checkpoints}>{["What evidence is missing or contradictory?", "Which regulatory constraints apply?", "Where might agents disagree?", "Which decisions require human approval?", "How should outcome quality be measured?"].map(t => <div key={t} className={styles.question}>↗ {t}</div>)}</div> : <p>Run the preview to display the evaluation criteria. This does not invoke an LLM or claim simulated results.</p>}</section></div>}
          {section === "Audit" && <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.panelKicker}>LOCAL EVENT LOG</span><h2>Workspace activity</h2></div><span className={styles.tag}>Not persisted</span></div><div className={styles.caseList}>{events.map((event,i) => <div key={`${event}-${i}`} className={styles.eventRow}><span className={styles.eventDot}/> {event}</div>)}</div></section>}
          <footer className={styles.footer}>CIVITAS · HR-Presents <span>Development preview · No live government data</span></footer>
        </main>
      </div>
      {showNew && <div className={styles.overlay} onMouseDown={e => {if(e.target === e.currentTarget)setShowNew(false);}}><div className={styles.modal} role="dialog" aria-modal="true" aria-label="Create case"><div className={styles.panelHeading}><h2>Create a local case</h2><button className={styles.iconButton} onClick={() => setShowNew(false)} aria-label="Close">×</button></div><p>Draft a case for interface testing. It will not be saved to the backend yet.</p><label className={styles.fieldLabel}>Case title</label><input className={styles.input} autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Delayed permit response"/><label className={styles.fieldLabel}>Summary</label><textarea className={styles.input} rows={4} value={newSummary} onChange={e => setNewSummary(e.target.value)} placeholder="Describe the incident and available evidence"/><div className={styles.modalActions}><button className={styles.secondaryButton} onClick={() => setShowNew(false)}>Cancel</button><button className={styles.primaryButton} disabled={!newTitle.trim()} onClick={addCase}>Create case</button></div></div></div>}
    </div>
  );
}
function AgentGraph({selected,onSelect}:{selected:string;onSelect:(id:string)=>void}){
  return <div className={styles.graph} role="group" aria-label="Interactive agent topology"><svg className={styles.connections} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M22 28 L51 19 L84 28 M22 28 L22 74 L51 81 L84 74 L84 28 M51 19 L51 81 M22 28 L84 74"/></svg>{agents.map(a => <button key={a.id} onClick={() => onSelect(a.id)} className={`${styles.agentNode} ${selected === a.id ? styles.agentSelected : ""}`} style={{left:`${a.x}%`,top:`${a.y}%`}}><span className={styles.nodeDot}/><strong>{a.name}</strong><small>{selected === a.id ? "Selected" : "Inspect node ↗"}</small></button>)}</div>
}
