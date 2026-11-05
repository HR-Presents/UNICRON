"use client";

import styles from "./agent-canvas.module.css";

export type AgentCanvasNode = { name: string; status: string; sequence?: number; timestamp?: string };
type Props = { nodes: AgentCanvasNode[]; selected: string; onSelect: (name: string) => void; jobStatus: string; eventCount: number };

const positions = [{x:12,y:23},{x:43,y:23},{x:74,y:23},{x:12,y:73},{x:43,y:73},{x:74,y:73}];
const edges = [[0,1],[1,2],[2,3],[3,4],[4,5]];
const point = (i: number) => positions[i];
const state = (status: string) => status === "completed" ? "complete" : status === "review_required" || status === "source_required" ? "review" : status === "failed" ? "failed" : status === "running" ? "running" : "idle";

export default function AgentCanvas({nodes,selected,onSelect,jobStatus,eventCount}:Props) {
  const running = jobStatus === "running";
  const completed = nodes.filter(n=>n.status === "completed").length;
  const current = running ? nodes.findIndex(n=>!["completed","review_required","source_required"].includes(n.status)) : -1;
  return <section className={styles.shell} aria-label="Investigation execution graph">
    <header className={styles.header}>
      <div><span className={styles.overline}>EXECUTION TOPOLOGY / PERSISTED EVENTS</span><h3>Investigation network</h3></div>
      <div className={styles.live}><span className={running ? styles.pulse : styles.indicator}/>{jobStatus === "running" ? "Worker running" : jobStatus === "queued" ? "Queued" : jobStatus === "completed" ? "Run completed" : jobStatus === "failed" ? "Run failed" : "Awaiting execution"}</div>
    </header>
    <div className={styles.canvas}>
      <div className={styles.mesh}/>
      <svg className={styles.links} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {edges.map(([a,b],i)=>{const from=point(a),to=point(b);const complete=nodes[a]?.status==="completed";const path=a===2 ? `M ${from.x} ${from.y} L 92 23 L 92 73 L ${to.x} ${to.y}` : `M ${from.x} ${from.y} L ${to.x} ${to.y}`;return <path key={i} d={path} className={complete?styles.linkComplete:styles.linkIdle}/>;})}
      </svg>
      {nodes.map((node,i)=><button key={node.name} type="button" onClick={()=>onSelect(node.name)} className={`${styles.node} ${styles[state(node.status)]} ${selected===node.name?styles.selected:""} ${current===i?styles.inProgress:""}`} style={{left:`${positions[i].x}%`,top:`${positions[i].y}%`}} aria-pressed={selected===node.name}>
        <div className={styles.nodeTop}><span className={styles.index}>0{i+1}</span><span className={styles.nodeState}>{node.status==="idle"?"WAITING":node.status.replaceAll("_"," ").toUpperCase()}</span></div>
        <strong>{node.name}</strong><small>{node.sequence ? `Event #${node.sequence}` : "No recorded event"}</small>
      </button>)}
    </div>
    <footer className={styles.footer}><span><b>{String(completed).padStart(2,"0")}</b> / 06 completed stages</span><span>{eventCount} recorded checkpoints</span><span>Source: FastAPI execution log</span></footer>
  </section>;
}
