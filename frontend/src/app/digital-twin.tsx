"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls, RoundedBox, Text } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
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
function Building({name,pos,color,height,selected,onClick}:{name:string;pos:readonly[number,number,number];color:string;height:number;selected:boolean;onClick:()=>void}){
  return <group position={pos as unknown as [number,number,number]} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onClick();}}>
    <RigidBody type="fixed" colliders="cuboid">
      <RoundedBox args={[4,height,3.4]} radius={0.12} smoothness={4} position={[0,height/2,0]} castShadow receiveShadow>
        <meshStandardMaterial color={selected?"#42678b":"#172d43"} metalness={0.64} roughness={0.31}/>
      </RoundedBox>
    </RigidBody>
    {Array.from({length:3},(_,floor)=>Array.from({length:5},(_,column)=><mesh key={floor+"-"+column} position={[-1.55+column*.77,.85+floor*(height/3.6),1.72]}>
      <planeGeometry args={[.48,.28]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected?1.2:.4} metalness={.25} roughness={.28}/>
    </mesh>))}
    <mesh position={[0,height+.08,0]}><boxGeometry args={[4.25,.14,3.65]}/><meshStandardMaterial color={color} metalness={.7} roughness={.24}/></mesh>
    <Text position={[0,height+.75,0]} fontSize={.45} color="#e7f2ff" anchorX="center" anchorY="middle" outlineWidth={.014} outlineColor="#06121d">{name}</Text>
    {selected&&<mesh position={[0,.05,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[2.6,2.8,64]}/><meshBasicMaterial color="#62e9d1" transparent opacity={.9}/></mesh>}
  </group>;
}
function Agent({name,pos,status,selected,onClick}:{name:string;pos:[number,number,number];status:string;selected:boolean;onClick:()=>void}){
  const mesh=useRef<THREE.Group>(null);
  const active=activeStatus(status);
  useFrame(({clock})=>{if(mesh.current)mesh.current.position.y=pos[1]+Math.sin(clock.elapsedTime*1.7+pos[0])*.11;});
  return <group position={[pos[0],0,pos[2]]} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onClick();}}>
    <group ref={mesh} position={[0,pos[1],0]}>
      <mesh castShadow><icosahedronGeometry args={[.47,1]}/><meshPhysicalMaterial color={active?"#6fe9d0":"#88a9c9"} metalness={.65} roughness={.18} transmission={.08} emissive={active?"#267d72":"#193b58"} emissiveIntensity={selected?.95:.3}/></mesh>
      <mesh position={[0,-.7,0]}><cylinderGeometry args={[.09,.25,.7,12]}/><meshStandardMaterial color="#8aaac7" metalness={.65} roughness={.35}/></mesh>
      <mesh position={[0,.65,0]}><torusGeometry args={[.6,.025,8,40]}/><meshBasicMaterial color={selected?"#d3fff5":"#5d8bad"}/></mesh>
    </group>
    <mesh position={[0,.07,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.62,40]}/><meshBasicMaterial color={active?"#3bb69e":"#1b547b"} transparent opacity={.3}/></mesh>
    <Html position={[0,2.4,0]} center distanceFactor={17} style={{pointerEvents:"none"}}><div className="agentLabel"><strong>{name}</strong><span>{status==="idle"?"AWAITING":status.replaceAll("_"," ").toUpperCase()}</span></div></Html>
  </group>;
}
function Courier({from,to,progress}:{from:[number,number,number];to:[number,number,number];progress:number}){
  const ref=useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{
    if(!ref.current)return;
    const t=(clock.elapsedTime*.22+progress)%1;
    ref.current.position.set(THREE.MathUtils.lerp(from[0],to[0],t),1.1+Math.sin(t*Math.PI)*1.5,THREE.MathUtils.lerp(from[2],to[2],t));
    ref.current.rotation.y+=.015;
  });
  return <mesh ref={ref}><octahedronGeometry args={[.16,0]}/><meshStandardMaterial color="#75ffdd" emissive="#1abf9f" emissiveIntensity={2} metalness={.4} roughness={.2}/></mesh>;
}
function Connections({nodes}:{nodes:TwinNode[]}){
  return <>{locations.slice(0,-1).map(([p],i)=>{
    const to=locations[i+1][0];const color=activeStatus(nodes[i]?.status??"idle")?"#4de0c0":"#36516b";
    const start=new THREE.Vector3(p[0],.32,p[2]);const end=new THREE.Vector3(to[0],.32,to[2]);
    const points=[start,new THREE.Vector3((p[0]+to[0])/2,.32,(p[2]+to[2])/2),end];
    const geometry=new THREE.BufferGeometry().setFromPoints(points);
    return <group key={i}><line geometry={geometry}><lineBasicMaterial color={color} transparent opacity={.9}/></line>{activeStatus(nodes[i]?.status??"idle")&&<Courier from={p} to={to} progress={i*.13}/>}</group>;
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
    <color attach="background" args={["#07111f"]}/>
    <fog attach="fog" args={["#07111f",25,75]}/>
    <ambientLight intensity={.8}/><hemisphereLight args={["#b4ddff","#101827",1.5]}/>
    <directionalLight position={[8,16,8]} intensity={3.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25}/>
    <Suspense fallback={null}><Environment preset="city" environmentIntensity={.4}/></Suspense>
    <Physics gravity={[0,-9.81,0]} colliders={false}>
      <RigidBody type="fixed" colliders="cuboid"><mesh receiveShadow position={[0,-.35,0]}><boxGeometry args={[27,.65,23]}/><meshStandardMaterial color="#101e30" roughness={.83} metalness={.18}/></mesh></RigidBody>
      <gridHelper args={[27,27,"#264c63","#1a344b"]]} position={[0,.015,0]}/>
      {departments.map(d=><Building key={d.name} {...d} selected={selectedDepartment===d.name} onClick={()=>onDepartment(d.name)}/>)}
      {locations.map(([pos,name],i)=><Agent key={name} name={name} pos={pos} status={visible[i]?.status??"idle"} selected={selectedAgent===name} onClick={()=>onAgent(name)}/>)}
      <RequestTokens cases={cases} selected={selectedCase} onCase={onCase}/>
      <Connections nodes={visible}/>
    </Physics>
    <ContactShadows position={[0,.02,0]} opacity={.35} scale={26} blur={2.5} far={13}/>
    <OrbitControls makeDefault enableDamping dampingFactor={.07} minDistance={9} maxDistance={43} maxPolarAngle={Math.PI*.48} minPolarAngle={.25} target={[0,1,0]}/>
    <CameraDirector target={selectedDepartment||selectedAgent}/>
    <EffectComposer multisampling={0}><Bloom intensity={.4} luminanceThreshold={1.15} mipmapBlur/><Vignette eskil={false} offset={.18} darkness={.6}/></EffectComposer>
    {!live&&<Html fullscreen style={{pointerEvents:"none"}}><div className="twinWatermark">VISUALIZATION OF RECORDED STATE · NOT A LIVE GOVERNMENT SYSTEM</div></Html>}
  </>;
}
export default function DigitalTwin(props:Props){
  return <div className="twinCanvas"><Canvas shadows dpr={[1,1.65]} camera={{position:[17,19,23],fov:44,near:.1,far:130}} gl={{antialias:true,powerPreference:"high-performance"}}><World props={props}/></Canvas></div>;
}
