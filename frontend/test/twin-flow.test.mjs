import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {citizenRoutes,deriveHandoffs,routeProgress} from '../src/twin-flow.mjs';

const events = [
  'Intake & Triage','Evidence Analyst','Policy Advisor',
  'Global Benchmark Agent','Scenario Evaluator','Review & Synthesis',
].map((agent,index)=>({agent,sequence:index+1,status:'completed'}));

test('handoffs follow recorded stage order and skip within-department transitions',()=>{
  assert.deepEqual(deriveHandoffs(events).map(({id,from,to})=>[id,from.id,to.id]),[
    ['1-2','intake','evidence'],['2-3','evidence','policy'],
    ['4-5','policy','lab'],['5-6','lab','oversight'],
  ]);
  assert.deepEqual(deriveHandoffs(events.slice(0,1)),[]);
  assert.deepEqual(deriveHandoffs([events[0],{sequence:2,agent:'Unmapped'},events[2]]),[]);
});

test('simulated routes use separate bounded paths and evenly spaced travelers',()=>{
  assert.equal(new Set(citizenRoutes.map(route=>route.id)).size,3);
  for(const {points,count,seconds} of citizenRoutes){
    assert.ok(points.every(([x,y,z])=>Math.abs(x)<=12 && y>=.1 && Math.abs(z)<=10));
    assert.notDeepEqual(points[0],points.at(-1));
    assert.equal(routeProgress(0,count,seconds,seconds),0);
    assert.equal(routeProgress(1,count,0,seconds),1/count);
    assert.equal(routeProgress(0,count,seconds/2,seconds),.5);
  }
});
