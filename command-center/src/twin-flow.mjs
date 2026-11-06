import {departmentFor} from './live-api.mjs';
import {departments} from './scenarios.mjs';

const groundPoints = points => points.map(([x,z])=>[x,.12,z]);

export const citizenRoutes = [
  {
    id:'arrivals',label:'Intake arrivals',color:'#a5ecab',count:4,seconds:18,
    points:groundPoints([[-11.8,1],[-8,1],[-6,1],[-5,1.6],[-5,3.1]]),
  },
  {
    id:'assisted',label:'Assisted access',color:'#ffd083',count:3,seconds:21,
    points:groundPoints([[-5.25,3.3],[-4.7,2],[-3.8,1.03],[-2.4,1.03],[-1.75,1.85],[-1.12,2.65],[-.95,5.25]]),
  },
  {
    id:'departures',label:'Service departures',color:'#a4dcf4',count:4,seconds:25,
    points:groundPoints([[-.55,5.3],[-.55,3],[-.5,2.1],[.9,1.95],[2.5,.85],[4,.85],[8,.85],[11.8,.85]]),
  },
];

export const handoffColor = '#dfbaff';

export function deriveHandoffs(events) {
  const handoffs=[];
  for(let index=1;index<events.length;index++){
    const previous=events[index-1];
    const next=events[index];
    const from=departments.find(department=>department.id===departmentFor(previous.agent));
    const to=departments.find(department=>department.id===departmentFor(next.agent));
    if(!from || !to || from===to)continue;
    handoffs.push({id:`${previous.sequence}-${next.sequence}`,from,to,agent:next.agent});
  }
  return handoffs;
}

export function routeProgress(index,count,elapsed,seconds) {
  return (index/count + elapsed/seconds)%1;
}
