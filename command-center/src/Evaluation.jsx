import React from 'react';
import {Icon} from './Icons.jsx';
import {assessReadiness} from './readiness.mjs';

export default function Evaluation({records,run}){
  const rating=assessReadiness(records,run);
  return <section className="detail-section evaluation" aria-label="Readiness">
    <div className="detail-body">
      <div className="detail-heading"><div><div className="eyebrow small"><Icon name="shield" size={15}/> CASE VALIDATION</div><h2>Readiness</h2></div><span className="score-chip">{records?`${rating.total}/100`:'Awaiting case evidence'}</span></div>
      <p className="detail-copy">Internal score based on the selected case’s persisted evidence. Each area has 25 points. Checks stay open until supporting records are available.</p>
      <div className="criteria-list">{rating.rows.map(row=><article className="rubric-card" key={row.name}>
        <div className="rubric-head"><h3>{row.name}</h3><strong>{records?`${row.score}/25`:'— / 25'}</strong></div>
        <progress aria-label={row.name} value={row.score} max="25"/>
        <ul>{row.checks.map(([points,label,passed])=><li key={label}><span className={passed?'passed':'waiting'}>{passed?<Icon name="check" size={13}/>:<span aria-hidden="true">○</span>}</span><span>{label}</span><small>{passed?'+'+points:points} pts</small></li>)}</ul>
      </article>)}</div>
    </div>
  </section>;
}
