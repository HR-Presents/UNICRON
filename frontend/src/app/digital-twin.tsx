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
    const next={x:point[0]+8,y:point[1]+10,z:point[2]+12};
    const animation=gsap.to(camera.position,{...next,duration:1.35,ease:"power3.inOut",onUpdate:()=>{camera.lookAt(point[0],1.1,point[2]);}});
    const orbit=controls as {target?:THREE.Vector3;update?:()=>void}|undefined;
    if(orbit?.target)gsap.to(orbit.target,{x:point[0],y:1.1,z:point[2],duration:1.35,ease:"power3.inOut",onUpdate:()=>orbit.update?.()});
    return ()=>{animation.kill();};
  },[target,camera,controls]);
  return null;
}
/* Architectural massing is deliberately stylized; no photorealistic asset claim. */
function Building({name,pos,height,selected,onClick}:{name:string;pos:readonly[number,number,number];color:string;height:number;selected:boolean;onClick:()=>void}){
  const levels=5, width=4.5, depth=3.8;
  return <group position={[pos[0],0,pos[2]]} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onClick();}}>
    <mesh receiveShadow position={[0,.09,0]}><boxGeometry args={[width+1.2,.18,depth+1.2]}/><meshStandardMaterial color="#d4d1c5" roughness={.92}/></mesh>
    <mesh castShadow receiveShadow position={[0,height/2+.24,0]}><boxGeometry args={[width,height,depth]}/><meshStandardMaterial color={selected?"#c3c5b7":"#e2dfd5"} roughness={.82} metalness={.04}/></mesh>
    <mesh castShadow position={[0,height+.3,0]}><boxGeometry args={[width+.32,.18,depth+.32]}/><meshStandardMaterial color="#b3b4a7" roughness={.75}/></mesh>
    {Array.from({length:levels},(_,floor)=><group key={floor}>
      {Array.from({length:6},(_,column)=><group key={column}>
        <mesh position={[-1.82+column*.73,.78+floor*(height-.65)/levels,depth/2+.014]}>
          <planeGeometry args={[.46,.37]}/><meshStandardMaterial color="#587078" metalness={.32} roughness={.28}/>
        </mesh>
        <mesh position={[-1.82+column*.73,.78+floor*(height-.65)/levels,-depth/2-.014]} rotation={[0,Math.PI,0]}>
          <planeGeometry args={[.46,.37]}/><meshStandardMaterial color="#526b71" metalness={.32} roughness={.3}/>
        </mesh>
      </group>)}
      <mesh position={[0,.53+floor*(height-.65)/levels,depth/2+.055]}><boxGeometry args={[width+.12,.07,.12]}/><meshStandardMaterial color="#c4c2b6" roughness={.9}/></mesh>
    </group>)}
    {[-1,1].map(side=><group key={side}>
      <mesh castShadow position={[side*(width/2+.12),height/2+.2,0]}><boxGeometry args={[.26,height+.5,depth+.22]}/><meshStandardMaterial color="#c7c6b9" roughness={.85}/></mesh>
      <mesh position={[side*(width/2+.26),height/2+.1,0]} rotation={[0,side*Math.PI/2,0]}><planeGeometry args={[depth-.65,height-.65]}/><meshStandardMaterial color="#b9c2bd" roughness={.76}/></mesh>
    </group>)}
    <mesh castShadow position={[0,.56,depth/2+.42]}><boxGeometry args={[1.5,1.1,.8]}/><meshStandardMaterial color="#9baca9" metalness={.28} roughness={.42}/></mesh>
    <mesh position={[0,.62,depth/2+.84]}><planeGeometry args={[1.05,.82]}/><meshStandardMaterial color="#2f5058" metalness={.4} roughness={.25}/></mesh>
    <Text position={[0,height+1.04,0]} fontSize={.37} color="#344f4b" anchorX="center" anchorY="middle" outlineWidth={.008} outlineColor="#f3f1e8">{name}</Text>
    {selected&&<mesh position={[0,.02,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[3.2,3.25,64]}/><meshBasicMaterial color="#3e8173" transparent opacity={.95}/></mesh>}
  </group>;
}
function Agent({name,pos,status,selected,onClick}:{name:string;pos:[number,number,number];status:string;selected:boolean;onClick:()=>void}){
  const mesh=useRef<THREE.Group>(null);
  const active=activeStatus(status);
  useFrame(({clock})=>{if(mesh.current)mesh.current.position.y=pos[1]+Math.sin(clock.elapsedTime*1.7+pos[0])*.11;});
  return <group position={[pos[0],0,pos[2]]} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onClick();}}>
    <group ref={mesh} position={[0,pos[1],0]}>
      <mesh castShadow><icosahedronGeometry args={[.47,1]}/><meshPhysicalMaterial color={active?"#4c9484":"#6b8381"} metalness={.65} roughness={.18} transmission={.08} emissive={active?"#267d72":"#193b58"} emissiveIntensity={selected?.95:.3}/></mesh>
      <mesh position={[0,-.7,0]}><cylinderGeometry args={[.09,.25,.7,12]}/><meshStandardMaterial color="#8aaac7" metalness={.65} roughness={.35}/></mesh>
      <mesh position={[0,.65,0]}><torusGeometry args={[.6,.025,8,40]}/><meshBasicMaterial color={selected?"#386d63":"#7b9890"}/></mesh>
    </group>
    <mesh position={[0,.07,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.62,40]}/><meshBasicMaterial color={active?"#4c9484":"#7d9b91"} transparent opacity={.3}/></mesh>
    <Html position={[0,2.4,0]} center distanceFactor={17} style={{pointerEvents:"none"}}><div className="agentLabel"><strong>{name}</strong><span>{status==="idle"?"AWAITING":status.replaceAll("_"," ").toUpperCase()}</span></div></Html>
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
    <color attach="background" args={["#e8e7dd"]}/>
    <fog attach="fog" args={["#e8e7dd",31,80]}/>
    <ambientLight intensity={.85}/><hemisphereLight args={["#f7f4e9","#899b92",1.6]}/>
    <directionalLight position={[8,16,8]} intensity={2.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25}/>
    <Suspense fallback={null}><Environment preset="city" environmentIntensity={.18}/></Suspense>
    <group>
      <mesh receiveShadow position={[0,-.35,0]}><boxGeometry args={[29,.65,25]}/><meshStandardMaterial color="#d2d1c6" roughness={.96}/></mesh>
      <gridHelper args={[28,28,"#b6c0b5","#c6ccc1"]} position={[0,.015,0]}/>
      {departments.map(d=><Building key={d.name} {...d} selected={selectedDepartment===d.name} onClick={()=>onDepartment(d.name)}/>)}
      {locations.map(([pos,name],i)=><Agent key={name} name={name} pos={pos} status={visible[i]?.status??"idle"} selected={selectedAgent===name} onClick={()=>onAgent(name)}/>)}
      <RequestTokens cases={cases} selected={selectedCase} onCase={onCase}/>
      <Connections nodes={visible}/>
    </group>
    <ContactShadows position={[0,.02,0]} opacity={.35} scale={26} blur={2.5} far={13}/>
    <OrbitControls makeDefault enableDamping dampingFactor={.07} minDistance={9} maxDistance={43} maxPolarAngle={Math.PI*.48} minPolarAngle={.25} target={[0,1,0]}/>
    <CameraDirector target={selectedDepartment||selectedAgent}/>
    <EffectComposer multisampling={0}><Vignette eskil={false} offset={.24} darkness={.16}/></EffectComposer>
    {!live&&<Html fullscreen style={{pointerEvents:"none"}}><div className="twinWatermark">VISUALIZATION OF RECORDED STATE · NOT A LIVE GOVERNMENT SYSTEM</div></Html>}
  </>;
}
export default function DigitalTwin(props:Props){
  return <div className="twinCanvas"><Canvas shadows dpr={[1,1.65]} camera={{position:[17,19,23],fov:44,near:.1,far:130}} gl={{antialias:true,powerPreference:"high-performance"}}><World props={props}/></Canvas></div>;
}
