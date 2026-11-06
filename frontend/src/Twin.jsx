import React, {Component, useEffect, useMemo, useRef, useState} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {Html, OrbitControls} from '@react-three/drei';
import {gsap} from 'gsap';
import * as THREE from 'three';
import {departments, policies} from './scenarios.mjs';
import {handoffColor, routeProgress} from './twin-flow.mjs';

async function createRenderer({canvas}) {
  const options={alpha:false,antialias:true,powerPreference:'high-performance'};
  const context=canvas.getContext('webgl2',options);
  if(context)return new THREE.WebGLRenderer({canvas,context,...options});

  const {SVGRenderer}=await import('three/addons/renderers/SVGRenderer.js');
  const renderer=new SVGRenderer();
  const svg=renderer.domElement;
  svg.classList.add('software-scene');
  svg.setAttribute('aria-hidden','true');
  renderer.setPrecision(1);
  canvas.parentElement.prepend(svg);
  canvas.classList.add('software-hit-target');
  const resize=renderer.setSize.bind(renderer);
  const render=renderer.render.bind(renderer);
  let previous=0;
  renderer.setSize=(width,height)=>{
    canvas.style.width=width+'px';
    canvas.style.height=height+'px';
    resize(width,height);
  };
  renderer.render=(scene,camera)=>{
    const now=performance.now();
    if(scene.userData.throttle && now-previous<42)return;
    previous=now;
    render(scene,camera);
  };
  renderer.domElement=canvas;
  renderer.dispose=()=>svg.remove();
  return renderer;
}

const limestone = '#9d9c7f';
const trim = '#ccc4a4';
const glass = '#48716a';
const ground = '#29382e';
const view = [17,22,26];
const target = [0,.35,0];
const cameraViews = {
  overview:{position:view,target},
  street:{position:[-13,5.3,13],target:[-.5,1.5,0]},
  plan:{position:[0,34,.1],target},
};
const labelHeights = {pavilion:3.5,tower:6.65,council:4.7,lab:4.55,oversight:4.9};

function Block({at, size, color, glow, roughness=.84, metalness=0, shadow=false, order=0}) {
  return <mesh position={at} castShadow={shadow} receiveShadow={shadow} renderOrder={order}>
    <boxGeometry args={size}/><meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={glow ?? '#000000'} emissiveIntensity={glow ? .26 : 0}/>
  </mesh>;
}

function Round({at, size, color, sides=48, shadow=false, order=0}) {
  return <mesh position={at} castShadow={shadow} receiveShadow={shadow} renderOrder={order}>
    <cylinderGeometry args={[...size,sides]}/><meshStandardMaterial color={color} roughness={.85}/>
  </mesh>;
}

function Floors({w,d,n,offset=.55,step=.56,color=trim}) {
  return Array.from({length:n},(_,i)=><Block key={i} at={[0,offset+i*step,0]} size={[w,.085,d]} color={color}/>);
}

function Fins({w,d,h,n,color=trim}) {
  return Array.from({length:n},(_,i)=><Block key={i} at={[(i/(n-1)-.5)*(w-.2),h/2+.25,d/2+.02]} size={[.06,h,.11]} color={color}/>);
}

function RoofStrip({at,size}) {
  return <Block at={at} size={size} color="#a4bd98" glow="#8fcf96"/>;
}

function Architecture({kind}) {
  if (kind === 'pavilion') return <>
    <Block at={[0,1.1,0]} size={[4.65,1.8,3]} color={glass} metalness={.25} shadow/>
    <Floors w={4.9} d={3.25} n={4} step={.47}/><Fins w={4.65} d={3} h={1.8} n={12}/>
    <Block at={[0,2.15,0]} size={[5.15,.22,3.55]} color={trim} shadow/>
    <Block at={[-.66,2.33,-.21]} size={[2.65,.16,1.96]} color="#5b6e4d"/>
    <Block at={[0,.93,1.95]} size={[1.62,.16,.9]} color={trim}/>
    <Block at={[0,.57,1.58]} size={[.95,.64,.13]} color="#223b33" glow="#607a55"/>
    <RoofStrip at={[1.7,2.29,.7]} size={[.65,.03,1.1]}/>
  </>;
  if (kind === 'tower') return <>
    <Block at={[0,1.16,0]} size={[4.38,1.9,3.75]} color={limestone} shadow/>
    <Block at={[.27,3.55,-.15]} size={[3.12,4.75,2.76]} color="#52766d" metalness={.24} shadow/>
    <group position={[.27,0,-.15]}><Floors w={3.29} d={2.92} n={9} offset={1.35} step={.52}/><Fins w={3.12} d={2.76} h={5.55} n={8}/></group>
    <Block at={[.27,5.98,-.15]} size={[3.43,.19,3.02]} color={trim} shadow/>
    <Block at={[.27,6.17,-.43]} size={[1.69,.22,1.02]} color="#657f76"/>
    <Block at={[1.28,6.3,-.42]} size={[.08,.49,.08]} color={trim}/>
    <RoofStrip at={[-1.62,2.13,.05]} size={[.55,.05,2.85]}/>
    <Block at={[.1,.79,1.91]} size={[1.75,1.08,.13]} color="#2f5348" glow="#597a60"/>
  </>;
  if (kind === 'council') return <>
    <Round at={[0,.29,0]} size={[2.62,2.75,.29]} color={trim} shadow/>
    <Round at={[0,1.43,0]} size={[2.16,2.33,2.3]} color="#668478" shadow/>
    {Array.from({length:20},(_,i)=>{
      const angle=i*Math.PI/10;
      return <Block key={i} at={[Math.cos(angle)*2.25,1.49,Math.sin(angle)*2.25]} size={[.13,2.32,.13]} color={trim}/>;
    })}
    <Round at={[0,2.59,0]} size={[2.5,2.52,.23]} color={trim} shadow/>
    <Round at={[0,2.82,0]} size={[1.62,1.85,.3]} color="#6f7e65" shadow/>
    <Round at={[0,3.1,0]} size={[1.1,1.55,.26]} color="#9e9f73" shadow/>
    <Round at={[0,3.27,0]} size={[.51,1.08,.14]} color="#c8b986"/>
    <RoofStrip at={[0,3.36,0]} size={[.52,.05,.52]}/>
  </>;
  if (kind === 'lab') return <>
    <Block at={[0,1.27,0]} size={[4.65,2.18,3.53]} color="#617d68" shadow/>
    <Block at={[-.73,2.77,-.25]} size={[3.21,1.35,2.73]} color={glass} metalness={.28} shadow/>
    <Floors w={4.85} d={3.69} n={4} step={.52}/><Fins w={4.65} d={3.53} h={2.1} n={10}/>
    <Block at={[-.73,3.48,-.25]} size={[3.44,.14,2.92]} color={trim} shadow/>
    {[0,1,2,3].map(i=><Block key={i} at={[-1.78+i*.63,3.63,-.35]} size={[.43,.16,1.66]} color="#394f4c" metalness={.35}/>)}
    <RoofStrip at={[1.57,2.41,0]} size={[.87,.04,2.62]}/>
    <Block at={[-.2,.74,1.82]} size={[1.5,.93,.15]} color="#213f38"/>
  </>;
  return <>
    <Block at={[0,1.2,0]} size={[4.85,2.1,3.64]} color={limestone} shadow/>
    <Block at={[0,1.3,1.88]} size={[4.34,1.84,.17]} color={glass} metalness={.23}/>
    <Floors w={4.99} d={3.91} n={4} step={.56}/><Fins w={4.52} d={3.85} h={2.2} n={9}/>
    <Block at={[0,2.76,-.33]} size={[3.88,1.17,2.69]} color="#9c9675" shadow/>
    <Block at={[0,3.36,-.33]} size={[4.13,.17,2.93]} color={trim} shadow/>
    <Block at={[0,3.51,-.43]} size={[2.87,.17,1.55]} color="#687658"/>
    <Block at={[0,.95,2.21]} size={[2.22,.18,.75]} color={trim}/>
    <Block at={[0,.54,1.96]} size={[1.18,.65,.18]} color="#25433d"/>
    <RoofStrip at={[1.38,3.52,-.43]} size={[.44,.04,1.15]}/>
  </>;
}

const treeSpots = [[-11,-8],[-11,-4],[-11,4],[-11,7],[-10,9],[-4,8],[-3.2,-9],[5,-9.7],[9,-8],[10,-6],[11,2],[11,5],[9,9],[3,8.8],[-4,-2],[2,4.5],[-2.5,3.4],[-2.3,-5.4]];

function Tree({x,z,index}) {
  const scale = .82+(index%3)*.13;
  return <group position={[x,.04,z]} scale={scale}>
    <Round order={-2} at={[0,.18,0]} size={[.06,.09,.36]} color="#8b8160" sides={8}/>
    <mesh position={[0,.54,0]} castShadow><icosahedronGeometry args={[.39,1]}/><meshStandardMaterial color={index%2 ? '#59714c':'#456447'} roughness={1} flatShading/></mesh>
  </group>;
}

function Campus() {
  return <>
    <Block order={-10} at={[0,-.63,0]} size={[26,.68,22]} color="#14211c" shadow/>
    <Block order={-9} at={[0,-.24,0]} size={[25.5,.24,21.5]} color="#3d5141" shadow/>
    <Block order={-8} at={[0,-.09,0]} size={[24.7,.11,20.7]} color={ground} shadow/>
    <gridHelper renderOrder={-7} args={[24.4,32,'#657059','#405044']} position={[0,-.027,0]} scale={[1,1,.825]}/>
    <Block order={-6} at={[0,.01,0]} size={[24.5,.066,2.15]} color="#46564a"/>
    <Block order={-6} at={[0,.012,0]} size={[2.25,.066,20.5]} color="#46564a"/>
    <Block order={-5} at={[0,.052,1.19]} size={[24.5,.021,.065]} color="#75806a"/>
    <Block order={-5} at={[0,.052,-1.19]} size={[24.5,.021,.065]} color="#75806a"/>
    <Block order={-5} at={[1.19,.052,0]} size={[.065,.021,20.5]} color="#75806a"/>
    <Block order={-5} at={[-1.19,.052,0]} size={[.065,.021,20.5]} color="#75806a"/>
    {Array.from({length:19},(_,i)=><Block key={i} order={-4} at={[-11.5+i*1.28,.052,0]} size={[.46,.025,.034]} color="#b3a37a"/>)}
    {Array.from({length:15},(_,i)=><Block key={i} order={-4} at={[0,.052,-9.1+i*1.31]} size={[.034,.025,.46]} color="#b3a37a"/>)}
    <Round order={-3} at={[0,.095,0]} size={[2.15,2.15,.13]} color="#7a8266"/>
    <Round order={-2} at={[0,.18,0]} size={[1.86,1.86,.12]} color="#364d40"/>
    <Round order={-1} at={[0,.25,0]} size={[1.22,1.32,.11]} color="#8b9071"/>
    <Round at={[0,.31,0]} size={[1.04,1.04,.09]} color="#517f72"/>
    <Round at={[0,.43,0]} size={[.19,.32,.29]} color="#a1b697"/>
    <group position={[-.96,.06,5.58]}>
      <Block at={[0,.09,0]} size={[1.6,.18,1.45]} color="#887450"/>
      <Block at={[0,.59,-.33]} size={[1.23,.8,.38]} color="#546759"/>
      <Block at={[0,1.1,-.12]} size={[1.57,.14,1.08]} color="#d1a969"/>
      <Block at={[-.59,.62,.28]} size={[.09,.86,.09]} color="#bac2a4"/>
      <Block at={[.59,.62,.28]} size={[.09,.86,.09]} color="#bac2a4"/>
    </group>
    {treeSpots.map(([x,z],i)=><Tree key={i} x={x} z={z} index={i}/>)}
    {[-1,1].map(sign=><group key={sign}>
      <Block order={-8} at={[0,-.33,sign*10.76]} size={[25.4,.075,.035]} color="#a4a17d"/>
      <Block order={-8} at={[sign*12.77,-.33,0]} size={[.035,.075,21.5]} color="#858e70"/>
    </group>)}
  </>;
}

function Building({department, selected, active, onSelect}) {
  const {id, name, code, pos, kind, color} = department;
  const [hover,setHover] = useState(false);
  return <group position={pos}>
    <Block at={[0,.085,0]} size={[6.15,.19,5.62]} color={selected ? '#a9ad81':'#606d57'} shadow/>
    <Block at={[0,.205,0]} size={[5.75,.13,5.22]} color={selected ? '#879479':'#4a5a48'}/>
    <group onPointerOver={event=>{event.stopPropagation();setHover(true);}} onPointerOut={()=>setHover(false)} onClick={event=>{event.stopPropagation();if(event.delta<6)onSelect(id);}}>
      <Architecture kind={kind}/>
    </group>
    {(selected || hover || active) && <mesh rotation={[-Math.PI/2,0,0]} position={[0,.204,0]}>
      <ringGeometry args={[3.35,3.43,64]}/><meshBasicMaterial color={color} transparent opacity={selected ? .92:.62}/>
    </mesh>}
    <Html position={[0,labelHeights[kind],0]} center zIndexRange={[5,1]} style={{pointerEvents:'none'}}>
      <button type="button" tabIndex={-1} className={`map-tag ${selected?'map-tag-active':''}`} style={{'--pin':color,pointerEvents:'auto'}} onClick={()=>onSelect(id)} aria-label={`Focus ${name} on map`}>
        <span>{code}</span>{department.map}
      </button>
    </Html>
  </group>;
}

function MovingRoute({points,color,count,motion,seconds=7,dispatch=false}) {
  const curve=useMemo(()=>new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)),false,'centripetal'),[points]);
  const path=useMemo(()=>new Float32Array(curve.getPoints(40).flatMap(point=>point.toArray())),[curve]);
  const starts=useMemo(()=>Array.from({length:count},(_,i)=>curve.getPointAt(i/count)),[curve,count]);
  const beadCount=dispatch?0:count;
  const beadStarts=useMemo(()=>Array.from({length:beadCount},(_,i)=>curve.getPointAt((i+.5)/beadCount)),[curve,beadCount]);
  const elapsed=useRef(0);
  const travelers=useRef([]);
  const beads=useRef([]);
  const direction=useMemo(()=>new THREE.Vector3(),[]);
  useFrame((_,delta)=>{
    if(!motion)return;
    elapsed.current+=Math.min(delta,.08);
    for(let i=0;i<count;i++){
      const traveler=travelers.current[i];
      if(!traveler)continue;
      const progress=routeProgress(i,count,elapsed.current,seconds);
      curve.getPointAt(progress,traveler.position);
      if(!dispatch){
        curve.getTangentAt(progress,direction);
        traveler.rotation.y=Math.atan2(direction.x,direction.z);
        traveler.position.y+=.038*Math.abs(Math.sin(elapsed.current*11+i));
        const bead=beads.current[i];
        if(bead)curve.getPointAt(routeProgress(i+.5,count,elapsed.current,seconds),bead.position);
      }
    }
  });
  return <>
    <line renderOrder={dispatch?1:-1}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[path,3]}/></bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={dispatch?.66:.78}/>
    </line>
    {starts.map((start,i)=><group key={i} ref={element=>{travelers.current[i]=element;}} position={start}>
      {dispatch ? <mesh><octahedronGeometry args={[.19]}/><meshBasicMaterial color={color}/></mesh> : <>
        <mesh position={[0,.19,0]}><cylinderGeometry args={[.082,.112,.27,5]}/><meshBasicMaterial color={color}/></mesh>
        <mesh position={[0,.39,0]}><sphereGeometry args={[.077,6,4]}/><meshBasicMaterial color="#f7e4c7"/></mesh>
      </>}
    </group>)}
    {beadStarts.map((start,i)=><mesh key={i} position={start} ref={element=>{beads.current[i]=element;}}>
      <sphereGeometry args={[.155,8,5]}/><meshBasicMaterial color={color}/>
    </mesh>)}
  </>;
}

function Handoff({handoff,motion}) {
  const {from,to}=handoff;
  const points=useMemo(()=>{
    const end=department=>[department.pos[0],labelHeights[department.kind]+.65,department.pos[2]];
    const start=end(from);
    const finish=end(to);
    return [start,[(start[0]+finish[0])/2,Math.max(start[1],finish[1])+2,(start[2]+finish[2])/2],finish];
  },[from,to]);
  return <MovingRoute points={points} color={handoffColor} count={motion?1:0} motion={motion} dispatch/>;
}

function AgentMarker({department,motion,onSelect}) {
  const pulse = useRef(null);
  useFrame(({clock})=>{
    if (!pulse.current) return;
    const scale = motion ? 1+.32*Math.sin(clock.elapsedTime*3.4) : 1;
    pulse.current.scale.setScalar(scale);
  });
  if(!department)return null;
  const [x,,z]=department.pos;
  return <group position={[x+2.7,.45,z+2.35]} onClick={event=>{event.stopPropagation();onSelect(department.id);}}>
    <Round at={[0,0,0]} size={[.29,.43,.27]} color="#406f57"/>
    <mesh position={[0,.39,0]}><octahedronGeometry args={[.26]}/><meshBasicMaterial color={department.color}/></mesh>
    <mesh ref={pulse} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.44,.5,32]}/><meshBasicMaterial color={department.color} transparent opacity={.75}/></mesh>
  </group>;
}

function CameraRig({focus, cameraView, command, viewReset, motion}) {
  const {camera,size,invalidate}=useThree();
  const narrow=size.width / size.height < 1.18;
  const orbit=useRef(null);
  const previousCommand=useRef(null);
  useEffect(()=>{
    const controls=orbit.current;
    if(!controls) return undefined;
    const point=departments.find(department=>department.id===focus)?.pos;
    const preset=cameraViews[cameraView];
    const look=point ? [point[0],1.4,point[2]] : preset.target;
    const position=point ? [point[0]+8,9,point[2]+12] : narrow ? preset.position.map(value=>value*1.22) : preset.position;
    const animation=gsap.timeline({defaults:{duration:motion ? .95 : 0,ease:'power3.inOut'},onUpdate:()=>{controls.update();invalidate();}});
    animation.to(camera.position,{x:position[0],y:position[1],z:position[2]},0);
    animation.to(controls.target,{x:look[0],y:look[1],z:look[2]},0);
    const interrupt=()=>animation.kill();
    controls.addEventListener('start',interrupt);
    return ()=>{animation.kill();controls.removeEventListener('start',interrupt);};
  },[camera,cameraView,focus,invalidate,motion,narrow,viewReset]);
  useEffect(()=>{
    if(!command || previousCommand.current===command || !orbit.current)return undefined;
    previousCommand.current=command;
    const controls=orbit.current;
    const direction=camera.position.clone().sub(controls.target);
    direction.setLength(THREE.MathUtils.clamp(direction.length()*(command.zoom>0?.81:1.23),controls.minDistance,controls.maxDistance));
    direction.add(controls.target);
    const tween=gsap.to(camera.position,{x:direction.x,y:direction.y,z:direction.z,duration:motion?.3:0,onUpdate:()=>{controls.update();invalidate();}});
    return ()=>tween.kill();
  },[camera,command,invalidate,motion]);
  return <OrbitControls ref={orbit} target={target} enableDamping dampingFactor={.09} minDistance={8} maxDistance={51} minPolarAngle={.002} maxPolarAngle={1.38}/>;
}

function World({focus, onSelect, cameraView, command, viewReset, layers, active, motion, animateActivity, continuous, routes, handoffs}) {
  const activeDepartment=departments.find(department=>department.id===active);
  const {gl,scene}=useThree();
  const software=!gl.isWebGLRenderer;
  useEffect(()=>{scene.userData.throttle=continuous;},[scene,continuous]);
  return <>
    <color attach="background" args={['#17251e']}/>
    <fog attach="fog" args={['#17251e',49,94]}/>
    <ambientLight intensity={.68} color={software ? "#c5d4c4" : "#ffffff"}/>
    <hemisphereLight args={['#e1efcf','#2e493a',1.7]}/>
    <directionalLight position={[-9,17,11]} intensity={software ? .85 : 2.65} color="#fff0c8" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-17} shadow-camera-right={17} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-normalBias={.035}/>
    <Campus/>
    {departments.map(department=><Building key={department.id} department={department} selected={focus===department.id} active={layers.agents && active===department.id} onSelect={onSelect}/>)}
    {routes.map(route=><MovingRoute key={route.id} {...route} motion={motion && continuous}/>)}
    {handoffs.map((handoff,index)=><Handoff key={handoff.id} handoff={handoff} motion={motion && animateActivity && index===handoffs.length-1}/>)}
    {layers.agents && <AgentMarker department={activeDepartment} onSelect={onSelect} motion={motion && animateActivity}/>}
    {layers.policy && policies.map(policy=>{
      const [x,,z]=departments.find(department=>department.id===policy.department).pos;
      return <group position={[x,.235,z]} key={policy.id}>
        <mesh renderOrder={-2} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[6.5,6]}/><meshBasicMaterial color={policy.color} transparent opacity={.14} depthWrite={false} polygonOffset polygonOffsetFactor={-1}/></mesh>
        <Html position={[2.45,.16,2.6]} center zIndexRange={[5,1]} style={{pointerEvents:'none'}}><span className="policy-pin" style={{'--pin':policy.color}}>{policy.id}</span></Html>
      </group>;
    })}
    <CameraRig focus={focus} cameraView={cameraView} command={command} viewReset={viewReset} motion={motion}/>
  </>;
}

class SceneBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed ? this.props.fallback : this.props.children;}
}

const mapX = x => 50+x*3.8;
const mapY = z => 50+z*4.6;
const mapPoint = ([x,,z]) => `${mapX(x)},${mapY(z)}`;

function FlatMap({focus,onSelect,active,layers,routes,handoffs}) {
  return <div className="flat-map">
    <svg className="flat-flow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {routes.map(route=><polyline key={route.id} points={route.points.map(mapPoint).join(' ')} fill="none" stroke={route.color} strokeWidth=".65"/>)}
      {handoffs.map(({id,from,to})=><polyline key={id} points={[from.pos,to.pos].map(mapPoint).join(' ')} fill="none" stroke={handoffColor} strokeWidth=".65" strokeDasharray="1.5 1"/>)}
    </svg>
    <div className="flat-center">CIVIC PLAZA</div>
    {departments.map(department=><button key={department.id} className={focus===department.id?'active':''} onClick={()=>onSelect(department.id)} style={{'--left':`${mapX(department.pos[0])}%`,'--top':`${mapY(department.pos[2])}%`,'--pin':department.color}}><small>{department.code}{layers.agents && active===department.id?' · ACTIVE':''}{layers.policy ? policies.filter(policy=>policy.department===department.id).map(policy=>` · ${policy.id}`).join('') : ''}</small>{department.name}</button>)}
    <span className="flat-notice">Campus plan</span>
  </div>;
}

export default function Twin(props) {
  const fallback=<FlatMap {...props}/>;
  const animateActivity=props.animateActivity ?? true;
  const continuous=Boolean(!props.flat && props.motion && ((props.mapVisible && props.routes.length>0) || (animateActivity && ((props.layers.agents && props.active) || props.handoffs.length>0))));
  return <>
    <div className={props.flat?'twin-scene twin-scene-hidden':'twin-scene'} aria-hidden={props.flat || undefined} inert={props.flat || undefined}>
      <SceneBoundary fallback={fallback}>
        <Canvas aria-label="Interactive 3D civic campus" frameloop={continuous?'always':'demand'} shadows dpr={[1,1.35]} camera={{position:view,fov:38,near:.1,far:105}} gl={createRenderer} fallback={fallback}>
          <World {...props} animateActivity={!props.flat && animateActivity} continuous={continuous}/>
        </Canvas>
      </SceneBoundary>
    </div>
    {props.flat && fallback}
  </>;
}
