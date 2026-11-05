"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type CaseRecord = { id: string; title: string; summary: string; domain: string; priority: string; status: string };
type Job = { id: string; status: string; result_id?: string | null; error_type?: string | null; updated_at?: string };
type Stage = { agent: string; status: string; result?: unknown; note?: string };
type Investigation = { id: string; created_at: string; stages: Stage[]; human_review_required: boolean; limitations?: string[] };
type Event = { sequence: number; agent: string; status: string; stage: Stage; created_at: string };
type Section = "Overview" | "Cases" | "Agent Studio" | "Policy Lab" | "Scenarios" | "Audit";

const agentNames = ["Intake & Triage", "Evidence Analyst", "Policy Advisor", "Global Benchmark Agent", "Scenario Evaluator", "Review & Synthesis"];
const sections: Section[] = ["Overview", "Cases", "Agent Studio", "Policy Lab", "Scenarios", "Audit"];

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = data as { detail?: string; error?: string };
    throw new Error(error.detail ?? error.error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

export default function Home() {
  const [section, setSection] = useState<Section>("Overview");
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selected, setSelected] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [executions, setExecutions] = useState<{id: string; status: string; updated_at: string}[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [audit, setAudit] = useState<{id: string; action: string; detail: string; created_at: string}[]>([]);
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [domain, setDomain] = useState("Citizen services");
  const [query, setQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(agentNames[0]);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const current = cases.find(c => c.id === selected);
  const currentJob = jobs[0];
  const currentRun = investigations[0];
  const currentExecution = executions[0];
  const active = jobs.some(j => j.status === "queued" || j.status === "running");
  const filtered = useMemo(() => cases.filter(c => `${c.title} ${c.id} ${c.domain}`.toLowerCase().includes(query.toLowerCase())), [cases, query]);
  const stageFor = (name: string) => events.find(e => e.agent === name)?.stage ?? currentRun?.stages.find(s => s.agent === name);
  const selectedStage = stageFor(selectedAgent);

  const refreshCases = useCallback(async () => {
    try {
      const data = await request<CaseRecord[]>("/api/cases");
      setCases(data);
      setSelected(previous => data.some(c => c.id === previous) ? previous : data[0]?.id ?? "");
      setHealth("online");
      setError("");
    } catch (cause) {
      setHealth("offline");
      setError(cause instanceof Error ? cause.message : "Could not load cases");
    }
  }, []);

  const refreshCase = useCallback(async (id: string) => {
    if (!id) return;
    const [jobResult, executionResult, investigationResult] = await Promise.allSettled([
      request<Job[]>(`/api/cases/${encodeURIComponent(id)}/jobs`),
      request<{id: string; status: string; updated_at: string}[]>(`/api/cases/${encodeURIComponent(id)}/executions`),
      request<Investigation[]>(`/api/cases/${encodeURIComponent(id)}/investigations`)
    ]);
    if (jobResult.status === "fulfilled") setJobs(jobResult.value); else setError("Could not retrieve investigation jobs");
    if (executionResult.status === "fulfilled") {
      setExecutions(executionResult.value);
      const runId = executionResult.value[0]?.id;
      if (runId) {
        try { setEvents(await request<Event[]>(`/api/cases/${encodeURIComponent(id)}/executions/${encodeURIComponent(runId)}/events`)); }
        catch { setEvents([]); }
      } else setEvents([]);
    } else setError("Could not retrieve execution history");
    if (investigationResult.status === "fulfilled") setInvestigations(investigationResult.value);
    else setError("Could not retrieve investigation results");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void refreshCases(); }, 0);
    return () => clearTimeout(timer);
  }, [refreshCases]);
  useEffect(() => {
    if (!selected) return;
    const initial = setTimeout(() => { void refreshCase(selected); }, 0);
    const timer = setInterval(() => { void refreshCase(selected); }, 3500);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [selected, refreshCase]);
  useEffect(() => {
    if (section !== "Audit") return;
    void request<typeof audit>("/api/audit").then(setAudit).catch(() => setError("Audit log unavailable"));
  }, [section]);

  async function createCase() {
    if (title.trim().length < 3 || summary.trim().length < 3) return;
    setBusy(true); setError("");
    try {
      const record = await request<CaseRecord>("/api/cases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), summary: summary.trim(), domain, priority: "Medium" })
      });
      await refreshCases(); setSelected(record.id); setSection("Cases");
      setShowNew(false); setTitle(""); setSummary("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create case"); }
    finally { setBusy(false); }
  }

  async function investigate() {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      await request<Job>(`/api/cases/${encodeURIComponent(selected)}/investigate/async`, { method: "POST" });
      await refreshCase(selected);
      setSection("Agent Studio");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not queue investigation"); }
    finally { setBusy(false); }
  }

  const jobLabel = currentJob?.status ?? "Not queued";
  const selectedStatus = selectedStage?.status ?? (active ? "Waiting for agent" : "No recorded run");

  return <div className={`${styles.app} ${theme === "dark" ? styles.dark : ""}`}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><div className={styles.brandMark}>U<span>·</span></div><div><strong>UNICRON</strong><small>GOVERNMENT AI INTELLIGENCE</small></div></div>
      <div className={styles.navCaption}>WORKSPACE</div>
      <nav aria-label="Main navigation">{sections.map(name => <button key={name} className={`${styles.navItem} ${section === name ? styles.active : ""}`} onClick={() => setSection(name)}><span className={styles.navIcon}>◈</span>{name}</button>)}</nav>
      <div className={styles.sidebarBottom}><div className={styles.smallLabel}>SYSTEM STATUS</div><div className={styles.environment}><span className={`${styles.dot} ${health === "online" ? styles.good : health === "offline" ? styles.bad : ""}`}/><div><strong>FastAPI · {health}</strong><small>Local inference via worker</small></div></div><div className={styles.version}>UNICRON / HR-Presents <span>development</span></div></div>
    </aside>
    <div className={styles.mainArea}>
      <header className={styles.topbar}><div className={styles.breadcrumb}>UNICRON <span>/</span> {section}</div><div className={styles.topActions}><span className={styles.tag}>{health === "online" ? "LIVE BACKEND" : "BACKEND " + health.toUpperCase()}</span><button className={styles.iconButton} aria-label="Toggle theme" onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>{theme === "light" ? "☾" : "☀"}</button><div className={styles.avatar}>HR</div></div></header>
      <main className={styles.content}>
        <div className={styles.pageHeading}><div><div className={styles.eyebrow}>EVIDENCE · POLICY · AGENT ORCHESTRATION</div><h1>{section === "Overview" ? "Intelligence with accountability." : section}</h1><p>Live case records, persistent investigations and human-governed policy analysis.</p></div><button className={styles.primaryButton} onClick={() => setShowNew(true)}>＋ New case</button></div>
        {error && <div role="alert" className={styles.panel} style={{borderColor:"#c46c65",marginBottom:20}}><strong>Connection or operation error</strong><p>{error}</p><button className={styles.secondaryButton} onClick={() => {setError("");void refreshCases();}}>Retry</button></div>}
        {section === "Overview" && <>
          <div className={styles.metrics}><div><small>Persisted cases</small><strong>{cases.length}</strong><span>FastAPI case registry</span></div><div><small>Investigation agents</small><strong>06</strong><span>Evidence-grounded pipeline</span></div><div><small>Selected case job</small><strong style={{fontSize:22}}>{jobLabel}</strong><span>Worker-managed queue</span></div><div><small>Backend connection</small><strong className={styles.backendText}>{health}</strong><span>API data, not demo data</span></div></div>
          <div className={styles.overviewGrid}><section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.panelKicker}>ORCHESTRATION</span><h2>Agent execution</h2></div><button className={styles.textButton} onClick={() => setSection("Agent Studio")}>Open studio ↗</button></div><div className={styles.checkpoints}>{agentNames.map(name => <button key={name} className={styles.caseRow} onClick={() => {setSelectedAgent(name);setSection("Agent Studio");}}><span className={styles.caseBody}><strong>{name}</strong><small>{stageFor(name)?.status ?? "Not executed"}</small></span><span className={styles.caseStatus}>{stageFor(name)?.status ?? "Idle"}</span></button>)}</div></section><section className={styles.panel}><div className={styles.panelHeading}><h2>Recent cases</h2><button className={styles.textButton} onClick={() => setSection("Cases")}>All cases ↗</button></div><div className={styles.caseList}>{cases.slice(0,5).map(c => <button className={styles.caseRow} key={c.id} onClick={() => {setSelected(c.id);setSection("Cases");}}><span className={styles.caseBody}><strong>{c.title}</strong><small>{c.id} · {c.domain}</small></span><span className={styles.caseStatus}>{c.status}</span></button>)}{cases.length === 0 && <p>No cases saved. Create the first case to begin.</p>}</div></section></div>
        </>}
        {section === "Cases" && <div className={styles.workspaceGrid}><section className={styles.panel}><h2>Case registry</h2><input className={styles.input} placeholder="Search saved cases" value={query} onChange={e => setQuery(e.target.value)}/>{filtered.map(c => <button className={`${styles.caseRow} ${selected === c.id ? styles.selectedRow : ""}`} key={c.id} onClick={() => setSelected(c.id)}><span className={styles.caseBody}><strong>{c.title}</strong><small>{c.id} · {c.domain}</small></span><span className={styles.caseStatus}>{c.status}</span></button>)}</section><section className={styles.panel}>{current ? <><span className={styles.panelKicker}>SAVED CASE</span><h2 className={styles.detailTitle}>{current.title}</h2><p>{current.summary}</p><div className={styles.detailMeta}><span>Reference</span><strong>{current.id}</strong><span>Priority</span><strong>{current.priority}</strong><span>Case status</span><strong>{current.status}</strong><span>Latest job</span><strong>{jobLabel}</strong></div><div className={styles.divider}/><button className={styles.primaryButton} disabled={busy || active} onClick={() => void investigate()}>{active ? "Investigation in progress" : "Run six-agent investigation"}</button>{currentJob?.error_type && <p role="alert">Worker error: {currentJob.error_type}</p>}</> : <p>Select or create a case.</p>}</section></div>}
        {section === "Agent Studio" && <div className={styles.workspaceGrid}><section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.panelKicker}>LIVE ORCHESTRATION</span><h2>Six-agent execution trace</h2></div><span className={styles.tag}>{jobLabel}</span></div><label className={styles.fieldLabel} htmlFor="case-select">Case</label><select id="case-select" className={styles.input} value={selected} onChange={e => setSelected(e.target.value)}><option value="">Select a case</option>{cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select><button className={styles.primaryButton} disabled={!selected || busy || active} onClick={() => void investigate()}>Run investigation</button><div className={styles.divider}/>{agentNames.map((name,i) => <button key={name} className={`${styles.caseRow} ${selectedAgent === name ? styles.selectedRow : ""}`} onClick={() => setSelectedAgent(name)}><span className={styles.caseIcon}>{String(i+1).padStart(2,"0")}</span><span className={styles.caseBody}><strong>{name}</strong><small>{stageFor(name)?.note ?? "Awaiting execution"}</small></span><span className={styles.caseStatus}>{stageFor(name)?.status ?? "Idle"}</span></button>)}</section><section className={styles.panel}><span className={styles.panelKicker}>AGENT INSPECTOR</span><h2 className={styles.detailTitle}>{selectedAgent}</h2><div className={styles.detailMeta}><span>Stage status</span><strong>{selectedStatus}</strong><span>Execution</span><strong>{currentExecution?.status ?? "Not started"}</strong><span>Recorded events</span><strong>{events.length}</strong><span>Human review</span><strong>{currentRun?.human_review_required ? "Required" : "Not determined"}</strong></div><div className={styles.divider}/><h3>Recorded output</h3>{selectedStage ? <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:12,maxHeight:460,overflow:"auto"}}>{JSON.stringify(selectedStage.result ?? selectedStage, null, 2)}</pre> : <p>No recorded output for this stage. Start an investigation with the backend and worker running.</p>}</section></div>}
        {section === "Policy Lab" && <section className={styles.panel}><span className={styles.panelKicker}>VERIFIED SOURCES & REVIEW GATES</span><h2>Policy intelligence</h2><p>Displays the actual Policy Advisor and Global Benchmark Agent results for the selected investigation. Recommendations remain advisory and require qualified review.</p>{currentRun ? currentRun.stages.filter(s => ["Policy Advisor","Global Benchmark Agent"].includes(s.agent)).map(s => <div key={s.agent}><div className={styles.divider}/><h3>{s.agent} · {s.status}</h3><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:12}}>{JSON.stringify(s.result,null,2)}</pre></div>) : <p>Run a case investigation to view grounded policy findings.</p>}</section>}
        {section === "Scenarios" && <section className={styles.panel}><span className={styles.panelKicker}>SCENARIO EVALUATOR</span><h2>Recorded hypothetical scenario</h2><p>Scenarios are hypothetical, not predictions or executed government actions.</p>{currentRun?.stages.find(s => s.agent === "Scenario Evaluator") ? <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:12}}>{JSON.stringify(currentRun.stages.find(s => s.agent === "Scenario Evaluator")?.result,null,2)}</pre> : <p>Run a six-agent investigation to generate a scenario evaluation.</p>}</section>}
        {section === "Audit" && <section className={styles.panel}><span className={styles.panelKicker}>PERSISTED AUDIT TRAIL</span><h2>Backend activity</h2>{audit.map(item => <div key={item.id} className={styles.eventRow}><strong>{item.action}</strong> · {item.detail}<div><small>{item.created_at}</small></div></div>)}{audit.length === 0 && <p>No audit records available.</p>}</section>}
        <footer className={styles.footer}>UNICRON · HR-Presents <span>Development · Human review required for policy conclusions</span></footer>
      </main>
    </div>
    {showNew && <div className={styles.overlay} onMouseDown={e => {if(e.target === e.currentTarget)setShowNew(false);}}><div className={styles.modal} role="dialog" aria-modal="true" aria-label="Create case"><div className={styles.panelHeading}><h2>Create a persisted case</h2><button className={styles.iconButton} onClick={() => setShowNew(false)} aria-label="Close">×</button></div><p>Saved through the UNICRON FastAPI backend.</p><label className={styles.fieldLabel} htmlFor="new-title">Case title</label><input id="new-title" className={styles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Case title (minimum 3 characters)"/><label className={styles.fieldLabel} htmlFor="new-summary">Summary</label><textarea id="new-summary" className={styles.input} rows={4} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Describe the issue (minimum 3 characters)"/><label className={styles.fieldLabel} htmlFor="new-domain">Domain</label><select id="new-domain" className={styles.input} value={domain} onChange={e => setDomain(e.target.value)}><option>Citizen services</option><option>Healthcare</option><option>Education</option><option>Infrastructure</option><option>Public safety</option><option>Policy</option></select><div className={styles.modalActions}><button className={styles.secondaryButton} onClick={() => setShowNew(false)}>Cancel</button><button className={styles.primaryButton} disabled={busy || title.trim().length < 3 || summary.trim().length < 3} onClick={() => void createCase()}>{busy ? "Saving…" : "Save case"}</button></div></div></div>}
  </div>;
}
