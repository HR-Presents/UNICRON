export const departments = [
  { id:'intake', no:'01', name:'Citizen Services', map:'Citizen Services', code:'CIV', pos:[-7,0,5], color:'#9ce0ae', kind:'pavilion', role:'Intake & Triage', detail:'Receives fictional service requests, flags access barriers and identifies which cases need a continuity route.' },
  { id:'evidence', no:'02', name:'Evidence Bureau', map:'Evidence Bureau', code:'EVB', pos:[-7,0,-5], color:'#9cccdc', kind:'tower', role:'Evidence Analyst', detail:'Checks the provenance and scope of simulated alerts before the incident team relies on them.' },
  { id:'policy', no:'03', name:'Policy Council', map:'Policy Council', code:'PLC', pos:[2,0,-7], color:'#e5ca91', kind:'council', role:'Policy Advisor', detail:'Connects proposed actions to fictional controls, flags gaps and surfaces limits for review.' },
  { id:'lab', no:'04', name:'Scenario Lab', map:'Scenario Lab', code:'LAB', pos:[8,0,-2.5], color:'#a9d6b5', kind:'lab', role:'Scenario Evaluator', detail:'Rehearses how a proposed response changes access, recovery or escalation inside the simulated case.' },
  { id:'oversight', no:'05', name:'Human Oversight', map:'Human Oversight', code:'HOV', pos:[6,0,6.2], color:'#e4b79e', kind:'oversight', role:'Review & Synthesis', detail:'Receives the proposed action and supporting evidence. An operator records a reasoned rehearsal decision.' },
];

export const policies = [
  {id:'F01', title:'Incident handling', department:'evidence', color:'#8dcde0', summary:'Preserve evidence, verify scope and keep recovery decisions reviewable.', keywords:'incident contain containment security logs recovery triage scope', theme:'UAE-001 incident response theme'},
  {id:'F02', title:'Assisted access', department:'intake', color:'#9ce0ae', summary:'Keep an assisted route available and collect only the fields required to maintain access.', keywords:'citizen accessibility access inclusion assisted hotline citizens people alternate service language disability queue', theme:'UAE-003 accessibility theme'},
  {id:'F03', title:'Data minimization', department:'policy', color:'#e5ca91', summary:'Restrict unnecessary exports and request only the fields required for reconciliation.', keywords:'privacy export data fields interoperability reconciliation authorization provider transfer', theme:'UAE-005 interoperability theme'},
];

export const scenarios = [
  {
    id:'UAE-042', title:'Permit portal disruption', short:'Permit portal', brief:'A fictional permit portal begins rejecting submissions after a scheduled release. The rehearsal follows the first report through human review.', risk:'High', citizens:148, routes:'Portal → assisted desk',
    evidence:[
      {id:'E01', title:'Intake snapshot', department:'intake', type:'Service desk fixture', detail:'A five-minute fixture recorded 148 simulated requests and repeated submission failures after a scheduled release.'},
      {id:'E02', title:'Service error sample', department:'evidence', type:'Gateway log fixture', detail:'Sampled submission requests returned elevated 503 responses. The fixture contains aggregate counts and no citizen identifiers.'},
      {id:'E03', title:'Assisted route check', department:'policy', type:'Continuity checklist fixture', detail:'The rehearsal desk can accept permit references and callback preferences. Identity documents are outside the simulated intake scope.'},
      {id:'E04', title:'Fallback rehearsal', department:'lab', type:'Scenario result fixture', detail:'A limited assisted desk can absorb simulated priority requests while the evidence team checks portal recovery.'},
    ],
    stages:[
      ['intake','Incident detected','Intake records failed permit submissions and opens the rehearsal.',['E01'],['F01']],
      ['evidence','Scope corroborated','The evidence agent compares the intake spike with the synthetic gateway sample.',['E01','E02'],['F01']],
      ['policy','Continuity control mapped','The policy agent maps the assisted channel and limits collection to essential fields.',['E03'],['F02','F03']],
      ['lab','Fallback route rehearsed','The lab assesses a temporary assisted desk for priority requests.',['E03','E04'],['F02']],
      ['oversight','Operator review','Review the assisted desk proposal, confirm its limits and record a decision.',['E02','E03','E04'],['F01','F02','F03']],
    ],
    proposal:'Offer a temporary assisted permit desk. Limit collection to the permit reference and callback preference, and review the route after portal recovery.',
  },
  {
    id:'UAE-057', title:'Resident export alert', short:'Export alert', brief:'A fictional benefits provider attempts a bulk resident-data export. The rehearsal traces the scope and prepares a bounded response for review.', risk:'Critical', citizens:84, routes:'Intake → manual lookup',
    evidence:[
      {id:'E01', title:'Export anomaly', department:'intake', type:'Export alert fixture', detail:'A bulk export was attempted outside the simulated change window for 84 synthetic records.'},
      {id:'E02', title:'Provider access trace', department:'evidence', type:'Authorization log fixture', detail:'A simulated integration credential initiated the export. The trace does not establish whether any files left the boundary.'},
      {id:'E03', title:'Minimum-field register', department:'policy', type:'Data register fixture', detail:'Reconciliation needs a case reference and disposition only. The alert included unnecessary contact and address fields.'},
      {id:'E04', title:'Manual access fallback', department:'lab', type:'Scenario result fixture', detail:'A simulated manual lookup keeps essential resident inquiries available while the export path is isolated.'},
    ],
    stages:[
      ['intake','Anomaly reported','Intake routes the unusual bulk export to the evidence team.',['E01'],['F01']],
      ['evidence','Access trace reviewed','The evidence agent identifies the credential and records uncertainty about transfer.',['E01','E02'],['F01','F03']],
      ['policy','Export scope challenged','The policy agent identifies fields outside the stated reconciliation purpose.',['E02','E03'],['F03']],
      ['lab','Manual lookup exercised','The lab rehearses keeping essential resident queries available during a scoped restriction.',['E03','E04'],['F02','F03']],
      ['oversight','Operator review','Review temporary export restrictions and a minimum-field evidence request.',['E02','E03','E04'],['F01','F02','F03']],
    ],
    proposal:'Temporarily restrict the simulated bulk export, preserve the access trace, and request a minimum-field reconciliation report.',
  },
  {
    id:'UAE-063', title:'Digital identity outage', short:'Identity outage', brief:'A fictional sign-in outage interrupts appointment booking. The rehearsal explores an accessible alternate route while technical scope is verified.', risk:'Elevated', citizens:213, routes:'Online → callback desk',
    evidence:[
      {id:'E01', title:'Booking desk report', department:'intake', type:'Service desk fixture', detail:'A fictional appointment desk logged 213 interrupted sign-in attempts during the exercise window.'},
      {id:'E02', title:'Identity status trace', department:'evidence', type:'Availability fixture', detail:'The synthetic sign-in dependency timed out. The fixture includes no evidence of credential compromise.'},
      {id:'E03', title:'Callback accessibility check', department:'policy', type:'Accessibility checklist fixture', detail:'The callback rehearsal supports a language preference and records only a booking reference and a callback preference.'},
      {id:'E04', title:'Queue capacity rehearsal', department:'lab', type:'Scenario result fixture', detail:'A simulated callback desk prioritizes time-sensitive appointments while staff test the sign-in recovery window.'},
    ],
    stages:[
      ['intake','Booking failures reported','Intake opens an incident after interrupted sign-in attempts.',['E01'],['F01','F02']],
      ['evidence','Availability scoped','The evidence agent links the booking failures to a timed-out identity dependency.',['E01','E02'],['F01']],
      ['policy','Callback control mapped','The policy agent checks accessibility and minimum callback data.',['E03'],['F02','F03']],
      ['lab','Callback capacity exercised','The lab tests a priority callback queue in the exercise.',['E03','E04'],['F02']],
      ['oversight','Operator review','Review the temporary callback route and conditions for returning to normal booking.',['E02','E03','E04'],['F01','F02','F03']],
    ],
    proposal:'Offer a temporary priority callback queue with a language preference and monitor the simulated sign-in recovery window.',
  },
].map(scenario => ({
  ...scenario,
  stages:scenario.stages.map(([department,title,detail,evidence,policy]) => ({department,title,detail,evidence,policy})),
}));
