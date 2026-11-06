import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';

const zero='0'.repeat(64);
const encode=new TextEncoder();
const hash=data=>bytesToHex(sha256(encode.encode(JSON.stringify(data))));

export function exportSnapshot(caseId,run,records){
  const rows=[...(records.audit??[])].sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));
  let head=zero;
  const auditChain=rows.map((row,index)=>{
    const entry={sequence:index+1,previousHash:head,id:row.id,caseId:row.case_id,action:row.action,detail:row.detail,createdAt:row.created_at};
    head=hash(entry);
    return {...entry,hash:head};
  });
  const payload={format:'unicron-backend-evidence-v2',caseId,exportedAt:new Date().toISOString(),run,records,auditChain};
  return {...payload,integrity:{algorithm:'SHA-256',auditHead:head,contentHash:hash(payload)}};
}

export function verifySnapshot(snapshot){
  if(!snapshot || !Array.isArray(snapshot.auditChain))return false;
  const {integrity,...payload}=snapshot;
  if(integrity?.algorithm!=='SHA-256' || integrity.contentHash!==hash(payload))return false;
  let head=zero;
  for(const [index,entry] of payload.auditChain.entries()){
    const {hash:claimed,...record}=entry;
    if(record.sequence!==index+1 || record.previousHash!==head || hash(record)!==claimed)return false;
    head=claimed;
  }
  return integrity.auditHead===head;
}
