"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls, Text } from "@react-three/drei";
import { EffectComposer, Vignette } from "@react-three/postprocessing";
import gsap from "gsap";
import * as THREE from "three";

export type TwinCase = { id:string; title:string; domain:string; status:string; priority:string };
export type TwinEvent = { sequence:number; agent:string; status:string; created_at:string; stage?:{agent:string;status:string;result?:unknown;note?:string} };
export type TwinNode = { name:string; status:string; sequence?:number };
type Props = { cases:TwinCase[]; nodes:TwinNode[]; selectedCase:string; selectedAgent:string; selectedDepartment:string; onCase:(id:string)=>void; onAgent:(name:string)=>void; onDepartment:(name:string)=>void; events:TwinEvent[]; replayIndex:number|null; live:boolean };

const departments = [
  {name:"Citizen Services",pos:[-8,0,-5] as const,color:"#328bba",height:3.6},
  {name:"Evidence Bureau",pos:[0,0,-8] as const,color:"#46a7a1",height:4.4},
  {name:"Policy Council",pos:[8,0,-5] as const,color:"#9474c7",height:4},
  {name:"Scenario Lab",pos:[-8,0,5] as const,color:"#b48a57",height:3.5},
  {name:"Human Oversight",pos:[8,0,5] as const,color:"#c7788d",height:3.9},
];
const locations:[[number,number,number],string][]=[
  [[-4.5,1.05,-1.8],"Intake & Triage"],[[-2,1.05,-3.3],"Evidence Analyst"],
  [[1.3,1.05,-3.3],"Policy Advisor"],[[4.5,1.05,-1.8],"Global Benchmark Agent"],
  [[-2.5,1.05,3],"Scenario Evaluator"],[[3,1.05,3],"Review & Synthesis"]
];
const activeStatus=(s:string)=>s==="completed"||s==="review_required"||s==="source_required";
function CameraDirector({target}:{target:string}) {
  const {camera,controls}=useThree();
  useEffect(()=>{
    const department=departments.find(d=>d.name===target);
    const agent=locations.find(d=>d[1]===target);
    const point=department?.pos ?? agent?.[0];
    if(!point)return;
    const next={x:point[0]+9,y:point[1]+13,z:point[2]+14};
    const animation=gsap.to(camera.position,{...next,duration:1.35,ease:"power3.inOut",onUpdate:()=>{camera.lookAt(point[0],1.1,point[2]);}});
    const orbit=controls as {target?:THREE.Vector3;update?:()=>void}|undefined;
    if(orbit?.target)gsap.to(orbit.target,{x:point[0],y:1.1,z:point[2],duration:1.35,ease:"power3.inOut",onUpdate:()=>orbit.update?.()});
    return ()=>{animation.kill();};
  },[target,camera,controls]);
  return null;
}
/* Architectural massing is deliberately stylized; no photorealistic asset claim. */
function Building({name,pos,height,selected,onClick}:{name:string;pos:readonly[number,number,number];color:string;height:number;selected:boolean;onClick:()=>void}){
 const width=4.8,depth=4.2;
 const towerHeight=height*1.55;
 return <group position={[pos[0],0,pos[2]]} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onClick();}}>
 <mesh receiveShadow position={[0,.14,0]}><boxGeometry args={[7,.28,6.2]}/><meshStandardMaterial color="#aeb8b2" roughness={.88}/></mesh>
 <mesh castShadow receiveShadow position={[0,towerHeight/2+.32,0]}><boxGeometry args={[width,towerHeight,depth]}/><meshPhysicalMaterial color="#879e9e" metalness={.52} roughness={.23} clearcoat={.65} clearcoatRoughness={.18}/></mesh>
 <mesh castShadow receiveShadow position={[0,towerHeight+.4,0]}><boxGeometry args={[width+.4,.18,depth+.4]}/><meshStandardMaterial color="#d1d6cd" metalness={.38} roughness={.32}/></mesh>
 {Array.from({length:9},(_,floor)=><group key={floor}>
 <mesh position={[0,.72+floor*towerHeight/9,depth/2+.04]}><boxGeometry args={[width+.04,.065,.09]}/><meshStandardMaterial color="#d9e0d9" metalness={.7} roughness={.3}/></mesh>
 <mesh position={[0,.72+floor*towerHeight/9,-depth/2-.04]}><boxGeometry args={[width+.04,.065,.09]}/><meshStandardMaterial color="#d9e0d9" metalness={.7} roughness={.3}/></mesh>
 </group>)}
 {Array.from({length:8},(_,i)=><group key={i}>
 <mesh position={[-width/2+(i+1)*width/9,towerHeight/2+.32,depth/2+.065]}><boxGeometry args={[.055,towerHeight,.09]}/><meshStandardMaterial color="#dbe2db" metalness={.72} roughness={.28}/></mesh>
 <mesh position={[-width/2+(i+1)*width/9,towerHeight/2+.32,-depth/2-.065]}><boxGeometry args={[.055,towerHeight,.09]}/><meshStandardMaterial color="#dbe2db" metalness={.72} roughness={.28}/></mesh>
 </group>)}
 <mesh castShadow position={[0,.75,depth/2+.6]}><boxGeometry args={[2.6,1.4,1.2]}/><meshPhysicalMaterial color="#dce4df" metalness={.42} roughness={.25} transmission={.06}/></mesh>
 <mesh position={[0,.8,depth/2+1.22]}><planeGeometry args={[2,1]}/><meshStandardMaterial color="#193e42" metalness={.4} roughness={.21}/></mesh>
 <Text position={[0,towerHeight+1.15,0]} fontSize={.38} color="#ecf2e9" anchorX="center" outlineWidth={.012} outlineColor="#263e3c">{name}</Text>
 {selected&&<mesh position={[0,.045,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[3.65,3.73,72]}/><meshBasicMaterial color="#b1eacb" transparent opacity={.9}/></mesh>}
 </group>;
}
function Agent({name,pos,status,selected,onClick}:{name:string;pos:[number,number,number];status:string;selected:boolean;onClick:()=>void}){
 const active=activeStatus(status),processing=status==="running"||status==="in_progress";
 return <group position={[pos[0],0,pos[2]]} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onClick();}}>
 <mesh castShadow position={[0,.22,0]}><cylinderGeometry args={[.52,.64,.35,32]}/><meshStandardMaterial color="#2b4845" metalness={.65} roughness={.3}/></mesh>
 <mesh position={[0,.45,0]}><cylinderGeometry args={[.32,.32,.12,32]}/><meshStandardMaterial color={active?"#9ddbc1":processing?"#e9c88c":"#8ba5a1"} emissive={active?"#447e6b":"#253c3a"} emissiveIntensity={selected?.65:.2}/></mesh>
 <mesh position={[0,.53,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.43,.49,48]}/><meshBasicMaterial color={selected?"#c7f6d7":"#789d91"}/></mesh>
 <Html position={[0,1.3,0]} center distanceFactor={17} style={{pointerEvents:"none"}}><div className="agentLabel"><strong>{name}</strong><span>{status==="idle"?"AWAITING":status.replaceAll("_"," ").toUpperCase()}</span></div></Html>
 </group>;
}
function Connections({nodes}:{nodes:TwinNode[]}){
  return <>{locations.slice(0,-1).map(([p],i)=>{
    const to=locations[i+1][0];
    const active=activeStatus(nodes[i]?.status??"idle");
    const points=[new THREE.Vector3(p[0],.12,p[2]),new THREE.Vector3(to[0],.12,to[2])];
    return <lineSegments key={i} geometry={new THREE.BufferGeometry().setFromPoints(points)}>
      <lineBasicMaterial color={active?"#4c9484":"#9faea6"} transparent opacity={active?.95:.45}/>
    </lineSegments>;
  })}</>;
}
function RequestTokens({cases,selected,onCase}:{cases:TwinCase[];selected:string;onCase:(id:string)=>void}){
  return <>{cases.slice(0,8).map((c,i)=>{
    const angle=i*Math.PI*2/Math.max(1,Math.min(cases.length,8));
    const x=Math.cos(angle)*3.8,z=Math.sin(angle)*5.4;
    return <group key={c.id} position={[x,.35,z]} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onCase(c.id);}}>
      <mesh castShadow rotation={[0,angle,0]}><boxGeometry args={[.5,.5,.5]}/><meshStandardMaterial color={selected===c.id?"#6fffe0":"#e2b56e"} metalness={.4} roughness={.27} emissive={selected===c.id?"#2ba38c":"#4d3419"} emissiveIntensity={.4}/></mesh>
      {selected===c.id&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,-.28,0]}><ringGeometry args={[.48,.59,32]}/><meshBasicMaterial color="#78f5d8"/></mesh>}
    </group>;
  })}</>;
}
function World({props}:{props:Props}){
  const {cases,nodes,selectedCase,selectedAgent,selectedDepartment,onCase,onAgent,onDepartment,events,replayIndex,live}=props;
  const visible=useMemo(()=>{
    if(replayIndex===null)return nodes;
    const seen=new Map<string,TwinEvent>();events.slice(0,replayIndex+1).forEach(e=>seen.set(e.agent,e));
    return nodes.map(n=>({...n,status:seen.get(n.name)?.status??"idle"}));
  },[nodes,events,replayIndex]);
  return <>
    <color attach="background" args={["#b8c9c5"]}/>
    <fog attach="fog" args={["#b8c9c5",34,85]}/>
    <ambientLight intensity={.52}/><hemisphereLight args={["#e9f3ed","#536d6a",1.25]}/>
    <directionalLight position={[8,16,8]} intensity={2.8} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25}/>
    <Suspense fallback={null}><Environment preset="city" environmentIntensity={.18}/></Suspense>
    <group>
      <mesh receiveShadow position={[0,-.35,0]}><boxGeometry args={[32,.65,28]}/><meshStandardMaterial color="#687f78" roughness={.96}/></mesh>
      <gridHelper args={[32,32,"#92a9a0","#82998f"]} position={[0,.015,0]}/>
      {departments.map(d=><Building key={d.name} {...d} selected={selectedDepartment===d.name} onClick={()=>onDepartment(d.name)}/>)}
      {locations.map(([pos,name],i)=><Agent key={name} name={name} pos={pos} status={visible[i]?.status??"idle"} selected={selectedAgent===name} onClick={()=>onAgent(name)}/>)}
      <RequestTokens cases={cases} selected={selectedCase} onCase={onCase}/>
      <Connections nodes={visible}/>
    </group>
    <ContactShadows position={[0,.02,0]} opacity={.35} scale={26} blur={2.5} far={13}/>
    <OrbitControls makeDefault enableDamping dampingFactor={.07} minDistance={9} maxDistance={43} maxPolarAngle={Math.PI*.48} minPolarAngle={.25} target={[0,1,0]}/>
    <CameraDirector target={selectedDepartment}/>
    <EffectComposer multisampling={0}><Vignette eskil={false} offset={.24} darkness={.16}/></EffectComposer>
    {!live&&<Html fullscreen style={{pointerEvents:"none"}}><div className="twinWatermark">VISUALIZATION OF RECORDED STATE · NOT A LIVE GOVERNMENT SYSTEM</div></Html>}
  </>;
}
export default function DigitalTwin(props:Props){
  return <div className="twinCanvas"><Canvas shadows dpr={[1,1.65]} camera={{position:[19,24,28],fov:43,near:.1,far:130}} gl={{antialias:true,powerPreference:"high-performance"}}><World props={props}/></Canvas></div>;
}
