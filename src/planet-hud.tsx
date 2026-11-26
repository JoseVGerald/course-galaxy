import React from 'react';
import {displayNames,displayNameLines,type Mission,type Planet} from './data';
import {portraitUrl} from './blender-planets';
import {coordsFor,hashOf,infoFor,isStop,levelLabel,objectivesFor,progressFor,supplies} from './hud-content';
import './planet-hud.css';

export type Pick={planet:Planet;node:Mission;index:number};
export const hudTabs=['MISSION','ROUTES','SUPPLIES'] as const;
export type HudTab=typeof hudTabs[number];

// Orbit ring, compass markers and dashed arcs drawn around the focused planet.
// Lives inside the chart's route <g>, so it is in planet-radius units (345 = the disc)
// and scales with the planet. The back half of the ring is masked by the planet disc.
const R=345,rad=(deg:number)=>deg*Math.PI/180;
const polar=(radius:number,deg:number)=>`${(Math.cos(rad(deg))*radius).toFixed(1)} ${(Math.sin(rad(deg))*radius).toFixed(1)}`;
const arc=(radius:number,from:number,to:number)=>`M${polar(radius,from)}A${radius} ${radius} 0 ${Math.abs(to-from)>180?1:0} 1 ${polar(radius,to)}`;
const ringTilt=-38,ringA=R*1.52,ringB=R*.74;
const halfRing=(sweep:0|1)=>{const c=Math.cos(rad(ringTilt))*ringA,s=Math.sin(rad(ringTilt))*ringA;return `M${(-c).toFixed(1)} ${(-s).toFixed(1)}A${ringA} ${ringB} ${ringTilt} 0 ${sweep} ${c.toFixed(1)} ${s.toFixed(1)}`};
export function PlanetOrnaments(){
 return <g className="hud-ornaments" aria-hidden="true">
  <defs><mask id="hud-disc-mask" maskUnits="userSpaceOnUse" x="-900" y="-650" width="1800" height="1300"><rect x="-900" y="-650" width="1800" height="1300" fill="#fff"/><circle r={R} fill="#000"/></mask></defs>
  <circle r={R*1.035} className="halo"/>
  <g className="dash-spin"><path className="dash" d={arc(R*1.13,150,236)}/><path className="dash" d={arc(R*1.13,52,126)}/><path className="dash fine" d={arc(R*1.2,262,318)}/><path className="dash fine" d={arc(R*1.2,330,372)}/></g>
  <path className="orbit-back" d={halfRing(1)} mask="url(#hud-disc-mask)" vectorEffect="non-scaling-stroke"/>
  <path className="orbit-front" d={halfRing(0)} vectorEffect="non-scaling-stroke"/>
  {[0,90,180,270].map(angle=><polygon key={angle} className="compass" points="-14,-10 14,-10 0,11" transform={`rotate(${angle}) translate(0 ${-R*1.27})`}/>)}
  {[45,135,225,315].map(angle=><path key={angle} className="shield" d="M-7-9H7V2L0 10-7 2Z" transform={`rotate(${angle}) translate(0 ${-R*1.2}) rotate(${-angle})`}/>)}
 </g>
}

function NameLines({name}:{name:string}){return <>{(displayNameLines[name]||[displayNames[name]||name]).map((line,i)=><span key={i}>{line}</span>)}</>}
const sector=(from:number,to:number,inner:number,outer:number)=>`M${polar(inner,from)}L${polar(outer,from)}A${outer} ${outer} 0 0 1 ${polar(outer,to)}L${polar(inner,to)}A${inner} ${inner} 0 0 0 ${polar(inner,from)}Z`;
const Radiation=()=><svg viewBox="-12 -12 24 24" className="hud-icon" aria-hidden="true"><circle r="2.3"/>{[-90,30,150].map(a=><path key={a} d={sector(a-30,a+30,4.6,10.5)}/>)}</svg>;
const Alert=()=><svg viewBox="-12 -12 24 24" className="hud-icon" aria-hidden="true"><path d="M0-10 10 8H-10Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M0-4V3M0 5.5V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const Skull=({x,y,tone}:{x:number;y:number;tone:'red'|'green'})=><g transform={`translate(${x} ${y})`} className={`pin ${tone}`}><path d="M0 0-6-13A7 7 0 1 1 6-13Z"/><circle cy="-17" r="4.2" className="pin-face"/>{tone==='red'&&<><circle cx="-1.6" cy="-17.4" r=".9"/><circle cx="1.6" cy="-17.4" r=".9"/></>}</g>;
// A small wireframe terrain, reseeded from the selected waypoint.
function Terrain({seed}:{seed:number}){
 const ridge=Array.from({length:25},(_,i)=>`${i*10},${(58-Math.sin(i*.55+seed*9)*13-Math.sin(i*1.3+seed*17)*7-Math.sin(i*.21+seed*3)*9).toFixed(1)}`);
 return <svg viewBox="0 0 240 104" className="hud-terrain" aria-hidden="true" preserveAspectRatio="none">
  <defs><linearGradient id="terrain-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#35e08a" stopOpacity=".38"/><stop offset="1" stopColor="#35e08a" stopOpacity=".02"/></linearGradient></defs>
  <g className="grid">{[64,72,81,91,102].map(y=><path key={y} d={`M0 ${y}H240`}/>)}{Array.from({length:13},(_,i)=><path key={i} d={`M${120+(i-6)*7} 60L${(i-6)*38+120} 104`}/>)}</g>
  <path className="area" d={`M0,104L${ridge.join('L')}L240,104Z`}/>
  <path className="ridge" d={`M${ridge.join('L')}`}/>
  <Skull x={56+seed*14} y={52} tone="red"/><Skull x={176-seed*16} y={56} tone="red"/><Skull x={118+seed*10} y={46} tone="green"/>
 </svg>
}

type Props={planet:Planet;pick:Pick|null;tab:HudTab;visited:ReadonlySet<string>;rootRef:React.Ref<HTMLDivElement>;leaderRef:React.Ref<SVGPolylineElement>;onTab:(tab:HudTab)=>void;onPick:(pick:Pick)=>void;onStart:()=>void;onBack:()=>void;onCycle:()=>void};
export function PlanetHud({planet,pick,tab,visited,rootRef,leaderRef,onTab,onPick,onStart,onBack,onCycle}:Props){
 const info=infoFor(planet),progress=progressFor(planet,visited),node=pick?.node,seed=hashOf(planet.name+(node?.name||''));
 const travels=!!node&&(node.kind==='junction'||node.kind==='travel')&&!!node.to;
 const objectives=node?objectivesFor(planet,node):[];
 const rows=planet.nodes.map((n,index)=>({n,index})).filter(({n})=>n.kind!=='travel'||!!n.to);
 const visitedStop=(n:Mission)=>visited.has(`${planet.name}:${n.name}`);
 return <div ref={rootRef} className="planet-hud">
  <nav className="hud-ui hud-tabs" aria-label="Planet panels">{hudTabs.map(t=><button key={t} className={tab===t?'on':''} onClick={()=>onTab(t)}>{t}</button>)}</nav>
  <header className="hud-title">
   <svg viewBox="-12 -12 24 24" className="hud-title-icon" aria-hidden="true"><circle r="9" fill="none" stroke="currentColor" strokeWidth="1.3"/><circle r="3" fill="currentColor"/><path d="M-9 0H-5M5 0H9M0-9V-5M0 5V9" stroke="currentColor" strokeWidth="1.3"/></svg>
   <div className="hud-title-row"><span className="hud-bars left"><i/><i/><i/><i/></span><h1><NameLines name={planet.name}/></h1><span className="hud-bars right"><i/><i/><i/><i/></span></div>
   <p>Solar System: Origin System</p>
  </header>
  <aside className="hud-ui hud-left" onWheel={e=>e.stopPropagation()}>
   <div className="hud-head"><span>{tab}</span><i/></div>
   {tab==='MISSION'&&(node?<>
    <div className="hud-banner"><img src={portraitUrl(planet.name)} alt=""/><div><h2>{node.name}</h2><small>{coordsFor(planet,node)}</small></div></div>
    <h3 className="hud-label"><i/>BRIEF</h3>
    <p className="hud-copy">{info.brief}</p>
    <div className="hud-rule"/>
    {objectives.map(o=><div key={o.tier} className={`hud-objective ${o.tier}`}><svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0-9 9 0 0 9-9 0Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray={o.tier==='optional'?'2.4 2.4':'none'}/>{o.tier!=='primary'&&<path d="M0-3.6 3.6 0 0 3.6-3.6 0Z" fill="currentColor"/>}</svg><div><b>{o.tier.toUpperCase()}:</b><p>{o.text}</p></div></div>)}
   </>:<p className="hud-copy">Select a waypoint on the planet to see its brief.</p>)}
   {tab==='ROUTES'&&<ul className="hud-list">{rows.map(({n,index})=><li key={n.name+index}><button className={pick?.index===index?'on':''} onClick={()=>onPick({planet,node:n,index})}>
     <svg viewBox="-12 -12 24 24" aria-hidden="true"><path d={n.kind==='travel'||n.kind==='junction'?'M0-10 10 0 0 10-10 0Z M0-5 5 0 0 5-5 0Z':'M0-6 6 0 0 6-6 0Z'} fill={n.kind==='travel'||n.kind==='junction'?'none':'currentColor'} stroke="currentColor" strokeWidth="1.5"/></svg>
     <span>{n.name}<small>{n.kind==='travel'?'TRANSPORT':n.kind==='junction'?'JUNCTION':(n.type||'MISSION').toUpperCase()}</small></span>{isStop(n)&&visitedStop(n)&&<em>DONE</em>}</button></li>)}</ul>}
   {tab==='SUPPLIES'&&<ul className="hud-list supplies">{supplies(planet).map(s=><li key={s.name}><div><span>{s.name}<small>{s.note}</small></span><strong>{s.value}</strong></div></li>)}</ul>}
  </aside>
  <svg className="hud-leader" width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden="true"><polyline ref={leaderRef} points=""/></svg>
  <aside className="hud-ui hud-right">
   <section className="hud-card"><h4><i/>DEPLOYMENT</h4><div className="coord-tag">{node?coordsFor(planet,node):'--'}</div><Terrain seed={seed}/></section>
   <section className="hud-card"><h4><i/>EXPLORATION PROGRESS</h4>
    <div className="hud-meter"><b style={{width:`${progress.percent}%`}}/><i style={{left:`${progress.percent}%`}}/></div>
    <div className="hud-meta"><span>{progress.percent.toFixed(3)}%</span></div>
    <div className="hud-meta"><small>{info.goal}</small><small>Mission {progress.done} / {progress.total}</small></div></section>
   <section className="hud-card warn"><h4><Radiation/>WARNING<small>{info.note}</small></h4><p><b>Notice:</b> {info.warning}</p></section>
   <section className="hud-card danger"><h4>COURSE DIFFICULTY: <b>LEVEL {info.level}</b></h4>
    <div className="hud-segments">{[1,2,3,4,5].map(i=><i key={i} className={i<=info.level?'on':''}/>)}</div>
    <div className="hud-flag"><Alert/>{levelLabel(info.level)}</div></section>
  </aside>
  <div className="hud-ui hud-start"><button disabled={!node} onClick={onStart}>{travels?`TRAVEL TO ${(node?.to||'').toUpperCase()}`:'START MISSION'}</button></div>
  <button className="hud-ui hud-key back" onClick={onBack}><kbd>ESC</kbd>BACK</button>
  <button className="hud-ui hud-key select" onClick={onCycle}>SELECT<kbd aria-hidden="true"><i/></kbd></button>
 </div>
}
