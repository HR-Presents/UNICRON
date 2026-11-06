import React,{useEffect,useState} from 'react';
import {api,forCase} from './live-api.mjs';
import {Icon} from './Icons.jsx';

const get=(form,key)=>String(form.get(key)??'').trim();
const officialUrl=value=>typeof value==='string' && /^https:\/\//i.test(value);

function SourceControls({record,source,submit,disabled}){
  async function handle(event){
    event.preventDefault();
    const form=event.currentTarget;
    const fields=new FormData(form);
    if(!source){
      const result=await submit(record.id+'/provenance',Object.fromEntries(['document_title','authority','jurisdiction','official_url','source_type'].map(key=>[key,get(fields,key)])),{method:'PUT'});
      if(result)form.reset();
      return;
    }
    const decision=event.nativeEvent.submitter?.value;
    if(!decision)return;
    const result=await submit(record.id+'/verify',{
      decision,reviewer:get(fields,'reviewer'),rationale:get(fields,'rationale'),
      checked_url:fields.has('checked_url'),checked_authority:fields.has('checked_authority'),checked_document:fields.has('checked_document'),
    });
    if(result)form.reset();
  }
  if(source?.verification_status && source.verification_status!=='unverified')return null;
  return <details className="source-controls">
    <summary>{source?'Review source':'Register provenance'}</summary>
    <form onSubmit={handle} className="workbench-form">
      {source?<>
        <label>Reviewer name<input name="reviewer" minLength={2} maxLength={180} required/></label>
        <label>Review rationale<textarea name="rationale" minLength={15} maxLength={2000} required/></label>
        <div className="checks-inline">
          <label><input type="checkbox" name="checked_url"/> URL checked</label>
          <label><input type="checkbox" name="checked_authority"/> Authority checked</label>
          <label><input type="checkbox" name="checked_document"/> File checked</label>
        </div>
      </>:<>
        <label>Document title<input name="document_title" minLength={3} maxLength={250} required/></label>
        <div className="form-columns"><label>Publishing authority<input name="authority" minLength={2} maxLength={180} required/></label><label>Jurisdiction<input name="jurisdiction" minLength={2} maxLength={100} required/></label></div>
        <label>Publisher URL<input name="official_url" type="url" placeholder="https://" maxLength={1000} required/></label>
        <label>Source type<select name="source_type"><option value="policy">Policy</option><option value="guidance">Guidance</option><option value="benchmark">Benchmark</option><option value="other">Other evidence</option></select></label>
      </>}
      <div className="review-actions">
        {source && <button className="button secondary" value="rejected" disabled={disabled}>Reject source</button>}
        <button className="button primary" value="verified" disabled={disabled}>{source?'Verify source':'Save provenance'}</button>
      </div>
    </form>
  </details>;
}

export default function EvidenceWorkbench({id,records,mutate,busy,connected,reviewAvailable,renderData}){
  const [search,setSearch]=useState('');
  const [results,setResults]=useState(null);
  const [searching,setSearching]=useState(false);
  const [error,setError]=useState('');
  const [controller,setController]=useState(null);
  useEffect(()=>()=>controller?.abort(),[controller]);
  const path=forCase(id);
  const files=records?.evidence??[];
  async function upload(event){
    event.preventDefault();
    const form=event.currentTarget;
    const payload=new FormData(form);
    const file=payload.get('file');
    if(!file?.size || file.size>2*1024*1024){setError('Choose a nonempty file up to 2 MiB.');return;}
    setError('');
    if(await mutate(path+'/evidence',payload))form.reset();
  }
  async function retrieve(event){
    event.preventDefault();
    if(searching || !connected)return;
    const task=new AbortController();
    setController(task);setSearching(true);setError('');setResults(null);
    try {setResults(await api(path+'/evidence/search?q='+encodeURIComponent(search.trim())+'&limit=10',{signal:task.signal}));}
    catch(failure){if(!task.signal.aborted)setError(failure.message);}
    finally{if(!task.signal.aborted)setSearching(false);}
  }
  return <div className="detail-body">
    <div className="detail-heading"><div><div className="eyebrow small">CASE SOURCES</div><h2>Evidence workspace</h2></div><button className="button secondary" onClick={()=>mutate(path+'/evidence/analyze')} disabled={busy || !connected || !files.length}>Run Evidence Analyst <Icon name="spark" size={15}/></button></div>
    <p className="detail-copy">Attach public policy documents and approved exercise evidence. Attachments are indexed into passages and given a file fingerprint.</p>
    <div className="evidence-tools">
      <form className="workbench-form record" onSubmit={upload}>
        <h3>Attach evidence</h3>
        <label>Evidence file<input type="file" name="file" accept=".txt,.md,.csv,.json,.pdf" required/></label>
        <label>Source note<input name="source_note" maxLength={1000} placeholder="Publisher or context"/></label>
        <button className="button primary" disabled={busy || !connected}><Icon name="plus" size={15}/> Add to case</button>
      </form>
      <form className="workbench-form record" onSubmit={retrieve}>
        <h3>Find passages</h3>
        <label>Search terms<input value={search} onChange={event=>setSearch(event.target.value)} minLength={3} maxLength={300} required placeholder="service continuity"/></label>
        <button className="button secondary" disabled={searching || !connected || !files.length}>{searching?'Searching…':'Search case evidence'}</button>
      </form>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {results && <section className="passages" aria-live="polite"><h3>{results.total_matches} matching passages</h3>{results.results.map(result=><details className="record" key={result.citation}><summary>{result.filename} · Passage {result.position}</summary><p>{result.content}</p><code>{result.citation}</code></details>)}</section>}
    <div className="records">{files.map(file=>{
      const source=records.sources.find(item=>item.document_id===file.id);
      return <article className="record" key={file.id}>
        <div><span className="ref static">{source?.verification_status??'unverified'}</span><span className="micro">{file.passage_count} PASSAGES</span></div>
        <h3>{source?.document_title??file.filename}</h3>
        <p>{source?.authority??file.source_note} {source?.jurisdiction&&`· ${source.jurisdiction}`}</p>
        {officialUrl(source?.official_url) && <a className="inline-action" href={source.official_url} target="_blank" rel="noreferrer">Publisher record <Icon name="right" size={14}/></a>}
        <details><summary>File fingerprint</summary><code>{file.sha256}</code></details>
        {reviewAvailable && <SourceControls record={file} source={source} disabled={busy || !connected} submit={(route,body,options)=>mutate(path+'/evidence/'+route,body,options)}/>}
      </article>;
    })}</div>
    {!files.length && <p className="detail-copy">No documents attached to this case yet.</p>}
    {records?.analyses?.[0] && <details className="record desk-response"><summary>Latest Evidence Analyst output · {records.analyses[0].model}</summary>{renderData(records.analyses[0].result)}</details>}
  </div>;
}
