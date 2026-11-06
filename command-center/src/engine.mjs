import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
import { departments, policies } from './scenarios.mjs';

const genesis = '0'.repeat(64);
const encode = new TextEncoder();
const canonical = entry => JSON.stringify([
  entry.caseId, entry.sequence, entry.timestamp, entry.type, entry.stage,
  entry.actor, entry.title, entry.evidence, entry.previousHash, entry.decision, entry.reason,
]);
const digest = entry => bytesToHex(sha256(encode.encode(canonical(entry))));

export async function verifyAudit(entries) {
  let previousHash = genesis;
  for (const [index, entry] of entries.entries()) {
    if (entry.sequence !== index + 1 || entry.previousHash !== previousHash || await digest(entry) !== entry.hash) return false;
    previousHash = entry.hash;
  }
  return true;
}

export function currentStage(entries) {
  return entries.filter(entry => entry.type === 'checkpoint').length - 1;
}

export async function recordCheckpoint(scenario, entries) {
  const stage = currentStage(entries) + 1;
  const step = scenario.stages[stage];
  if (!step) throw new Error('Every checkpoint has been released.');
  if (entries.some(entry => entry.caseId !== scenario.id)) throw new Error('This ledger belongs to a different case.');
  const actor = departments.find(department => department.id === step.department).role;
  return append(scenario, entries, {type:'checkpoint', stage, actor, title:step.title, evidence:step.evidence, decision:null, reason:null});
}

export async function recordReview(scenario, entries, decision, reason, acknowledged) {
  if (currentStage(entries) !== scenario.stages.length - 1) throw new Error('Release every checkpoint before reviewing.');
  if (entries.some(entry => entry.type === 'review')) throw new Error('This rehearsal already has a decision.');
  if (entries.some(entry => entry.caseId !== scenario.id)) throw new Error('This ledger belongs to a different case.');
  if (!['Approved','Returned'].includes(decision)) throw new Error('Choose a review decision.');
  if (typeof reason !== 'string' || reason.trim().length < 8 || reason.trim().length > 500) throw new Error('Enter a review reason of 8 to 500 characters.');
  if (decision === 'Approved' && !acknowledged) throw new Error('Confirm the rehearsal scope before approving.');
  return append(scenario, entries, {
    type:'review', stage:scenario.stages.length - 1, actor:'Simulation operator', title:'Human review recorded',
    evidence:scenario.stages.at(-1).evidence, decision, reason:reason.trim(),
  });
}

async function append(scenario, entries, data) {
  const entry = {
    caseId:scenario.id, sequence:entries.length + 1, timestamp:new Date().toISOString(),
    ...data, previousHash:entries.at(-1)?.hash ?? genesis,
  };
  return [...entries, {...entry, hash:await digest(entry)}];
}

const stopwords = new Set('about after are can could does for from has have how the this that then their there they was were what when where which who why will with would you your'.split(' '));
const words = text => new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(word => word.length > 2 && !stopwords.has(word)));

export function answerQuestion(question, scenario, entries, cursor) {
  const stage = scenario.stages[cursor];
  if (!stage) return {text:'Open the first incident checkpoint to begin the evidence briefing.', refs:[]};
  const visible = scenario.stages.slice(0, cursor + 1);
  const allowedEvidence = new Set(visible.flatMap(step => step.evidence));
  const allowedPolicies = new Set(visible.flatMap(step => step.policy));
  const query = words(question);
  const match = terms => [...words(terms)].filter(term => query.has(term)).length;
  const sameRecord = entries.find(entry => entry.stage === cursor && entry.type === 'checkpoint');
  if (query.has('evidence') && match('available released list records show')) {
    const records = scenario.evidence.filter(item => allowedEvidence.has(item.id));
    return {text:`Released evidence: ${records.map(item => `${item.id} · ${item.title}`).join(', ')}.`, refs:records.map(item => item.id)};
  }
  if (!/\b[ef]0[1-9]\b/i.test(question) && match('next advance sequence')) {
    const next = scenario.stages[cursor + 1];
    const review = entries.find(entry => entry.type === 'review');
    return {
      text:next ? `The next planned checkpoint is “${next.title}.”` : review ? `The operator decision is ${review.decision.toLowerCase()}. Reason: ${review.reason}` : 'The operator must review the proposed action and provide a reason. Approval requires acknowledging the simulation scope.',
      refs:sameRecord ? [`AUD-${sameRecord.sequence}`] : [],
    };
  }
  if (match('proposal propose recommended action recommendation approve approval decision') && allowedEvidence.has('E04')) {
    return {text:`${scenario.proposal} The operator owns the rehearsal decision.`, refs:['E04']};
  }
  if (!/\b[ef]0[1-9]\b/i.test(question) && match('summary summarize happened status briefing overview')) {
    const e = scenario.evidence.find(record => record.id === stage.evidence[0]);
    return {text:`${scenario.title} is at “${stage.title}.” ${stage.detail} ${e.detail}`, refs:[e.id]};
  }
  const matches = [
    ...scenario.evidence.filter(item => allowedEvidence.has(item.id)).map(item => ({id:item.id, text:item.detail, score:match(`${item.id} ${item.title} ${item.detail}`)})),
    ...policies.filter(item => allowedPolicies.has(item.id)).map(item => ({id:item.id, text:item.summary, score:match(`${item.id} ${item.title} ${item.keywords}`)})),
  ].filter(item => item.score > 0).sort((a,b) => b.score - a.score);
  const direct = matches.find(item => query.has(item.id.toLowerCase()));
  const explicitIds = [...query].filter(word => /^[ef]0[1-9]$/.test(word));
  const selected = explicitIds.length ? matches.filter(item => explicitIds.includes(item.id.toLowerCase())) : direct ? [direct] : matches.slice(0,2);
  if (!selected.length) return {
    text:'The released scenario records do not answer that question. Ask about the current incident, cite a released evidence ID, or ask what checkpoint comes next.',
    refs:[],
  };
  return {text:selected.map(item => item.text).join(' '), refs:selected.map(item => item.id)};
}
