const fixtureModel=model=>!model || /(?:fixture|stub|mock|test-model)/i.test(model);

export function assessReadiness(records,run){
  const verified=records?.sources?.filter(source=>source.verification_status==='verified')??[];
  const national=verified.filter(source=>/^(?:uae|united arab emirates)$/i.test(source.jurisdiction?.trim()??'') && source.source_type!=='benchmark');
  const benchmarks=verified.filter(source=>!national.includes(source) && source.source_type==='benchmark');
  const events=run?.events??[];
  const completed=records?.investigations?.find(record=>record.id===run?.execution?.id);
  const realRun=Boolean(completed && !fixtureModel(completed.model) && run?.execution?.status==='completed');
  const sessions=records?.sessions??[];
  const scenarioTest=sessions.some(session=>session.status==='completed' && session.events?.length>=2 && session.assessments?.length===session.events.length && session.assessments.every(item=>!fixtureModel(item.model)));
  const runReview=realRun && (records?.reviews??[]).some(item=>item.investigation_id===completed.id && item.rationale);
  const auditActions=new Set((records?.audit??[]).map(item=>item.action));
  const associatedAudit=realRun && (records?.audit??[]).some(item=>item.action==='agent.investigation_completed' && String(item.detail).includes(completed.id));
  const rows=[
    {name:'Knowledge base',checks:[
      [5,'Backend passages and file fingerprints',Boolean(records?.evidence?.some(item=>item.passage_count>0 && item.sha256))],
      [7,'Multiple verified UAE policy or guidance sources',national.length>=2],
      [5,'A verified benchmark and UAE source',national.length>0 && benchmarks.length>0],
      [8,'Measured retrieval on the target vector corpus',false],
    ]},
    {name:'Agent capability and policy gaps',checks:[
      [9,'Six checkpoints from a completed model-backed investigation',realRun && new Set(events.map(item=>item.agent)).size>=6],
      [6,'Completed staged exercise with model assessments',scenarioTest],
      [5,'Human assessment of the live investigation output',Boolean(runReview)],
      [5,'Independently validated policy gaps and benchmark comparisons',false],
    ]},
    {name:'Auditability',checks:[
      [7,'Intake and evidence events stored in the backend',auditActions.has('case.created') && auditActions.has('evidence.uploaded')],
      [6,'A verification decision and evidence fingerprint',auditActions.has('source.verification_recorded') && verified.length>0],
      [7,'Completed run tied to a backend audit event',Boolean(associatedAudit)],
      [5,'Reviewer rationale and decision audit entry',Boolean(runReview && auditActions.has('review.decision_recorded'))],
    ]},
    {name:'Architecture and oversight',checks:[
      [5,'Evidence preparation recorded',auditActions.has('evidence.uploaded')],
      [5,'Model-backed processing and outputs recorded',realRun],
      [5,'Exercise execution and human supervision evidenced',Boolean(scenarioTest && runReview)],
      [10,'ITU Lab deployment and standards mapping validated',false],
    ]},
  ].map(row=>({...row,score:row.checks.reduce((sum,[points,,passed])=>sum+(passed?points:0),0)}));
  return {rows,total:rows.reduce((sum,row)=>sum+row.score,0)};
}
