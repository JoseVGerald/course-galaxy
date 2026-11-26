import React,{useState,useEffect,useRef,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {planets,motion,systemOverviewNames,systemMoonParents,displayNames,displayNameLines,type Planet,type Mission} from './data';
import {createEngine,placement,view,currentPose,focusPose,overviewPose,zoomOutPose,spinOf,maxZoom,type CameraPose} from './engine';
import {Marker} from './markers';
import {OrbitGrid,gridRingsFor} from './orbits';
import {destinationPreview,interplanetaryPath,missionPath} from './paths';
import {chartViewport} from './viewport';
import {PlanetHud,PlanetOrnaments,type HudTab} from './planet-hud';
import {coordsFor,defaultPick} from './hud-content';
import './style.css';
import './chart-refinements.css';

const original='/assets/original/';
type Selection={planet:Planet;node:Mission;index:number};
// Small globe maps need more screen space before their fixed-size mission
// labels can read cleanly. Large planets retain their reference reveal point.
const detailRadius=(planet:Planet)=>Math.max(28,planet.r*1.04);
const detailFullRadius=(planet:Planet)=>Math.max(detailRadius(planet)+34,planet.r*2.15);
const bounds=planets.reduce((b,p)=>({left:Math.min(b.left,p.x-p.r),right:Math.max(b.right,p.x+p.r),top:Math.min(b.top,p.y-p.r),bottom:Math.max(b.bottom,p.y+p.r)}),{left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity});
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
// Scrolling out of an open planet: a little zoom shows more around it, but once it has
// shrunk below this share of its framed size (about three notches, or one hard scroll)
// the chart returns to the main view.
const leaveRatio=.66;
function roamingPanRange(zoom:number,camera:number,size:number,min:number,max:number){const center=(min+max)/2,half=(max-min)*zoom/2,allowed=half<=size/2?Math.max(40,(size/2-half)*.5):half-size*.25,base=center*zoom+camera-size/2;return [-allowed-base,allowed-base] as const}
const routeGradientId=(from:string,to:string)=>`route-fade-${from}-${to}`.toLowerCase().replace(/[^a-z0-9-]/g,'-');
const cameraKeys=(Object.keys(overviewPose) as (keyof CameraPose)[]);
function NameLines({name}:{name:string}){return <>{(displayNameLines[name]||[displayNames[name]||name]).map((line,index)=><span key={index}>{line}</span>)}</>}
function App(){
 const stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLDivElement>(null),audio=useRef<HTMLAudioElement>(null),orbitGrid=useRef<SVGSVGElement>(null),routeGeometry=useRef<SVGGElement>(null);
 const labels=useRef(new Map<string,HTMLButtonElement>()),graph=useRef<HTMLDivElement>(null),title=useRef<HTMLDivElement>(null),sun=useRef<HTMLDivElement>(null),nodeElements=useRef(new Map<string,HTMLButtonElement>()),remotePreviewLines=useRef(new Map<string,SVGGElement>()),remotePreviewNodes=useRef(new Map<string,SVGGElement>()),card=useRef<HTMLDivElement>(null),tooltipRef=useRef<Selection|null>(null);
 const anim=useRef<{to:CameraPose;from:CameraPose;anchor?:{x:number;y:number};done?:()=>void}|null>(null),hoverTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),focusRef=useRef<Planet|null>(null),mapRef=useRef<Planet|null>(null),freePose=useRef<CameraPose|null>(null),freeMap=useRef<Planet|null>(null),drag=useRef<{x:number;y:number;px:number;py:number;didMove:boolean;spin?:boolean;lastX?:number;lastT?:number}|null>(null),wheelLock=useRef(0),gridRef=useRef(10),suppressPlanetClick=useRef(false),scaleRef=useRef(1),releaseAfterClick=useRef(false);
 // With `pivot`, the move is a pure zoom about the one screen point that both poses share. The camera
 // offset is derived from the zoom on every frame; interpolating it separately (linear offset,
 // exponential zoom) slides that point mid-flight, and repeated scrolling compounds the slide into
 // a drift toward a corner of the planet.
 const moveCamera=useCallback((to:CameraPose,done?:()=>void,pivot=false)=>{const previous=anim.current?.done,from=currentPose(),r=to.zoom/from.zoom;let anchor:{x:number;y:number}|undefined;
  if(pivot&&Math.abs(Math.log(r))>1e-3){const fx=from.cameraX+from.panX,fy=from.cameraY+from.panY,tx=to.cameraX+to.panX,ty=to.cameraY+to.panY;anchor={x:(tx-r*fx)/(1-r),y:(ty-r*fy)/(1-r)}}
  anim.current={to:{...to},from,anchor,done:previous&&done?()=>{previous();done()}:previous||done}},[]);
 const [focus,setFocus]=useState<Planet|null>(null),[mapPlanet,setMapPlanet]=useState<Planet|null>(null),[ready,setReady]=useState(false),[webglError,setWebglError]=useState(false),[hovered,setHovered]=useState<Selection|null>(null),[selected,setSelected]=useState<Selection|null>(null),[planetHover,setPlanetHover]=useState<string|null>(null);
 const [panel,setPanel]=useState<string|null>(null),[match,setMatch]=useState('PUBLIC'),[matchMenu,setMatchMenu]=useState(false),[muted,setMuted]=useState(true),[moving,setMoving]=useState(true),[chat,setChat]=useState(false),[tab,setTab]=useState('Clan'),[help,setHelp]=useState(false),[toast,setToast]=useState(''),[started,setStarted]=useState(false);
 const say=useCallback((t:string)=>{setToast(t);window.setTimeout(()=>setToast(''),3500)},[]);
 // Mission HUD state: the selected waypoint, the open HUD tab, and the stops started this session.
 const [gridRings,setGridRings]=useState(10),[pick,setPick]=useState<Selection|null>(null),[hudTab,setHudTab]=useState<HudTab>('MISSION'),[visited,setVisited]=useState<ReadonlySet<string>>(()=>new Set<string>()),hud=useRef<HTMLDivElement>(null),leader=useRef<SVGPolylineElement>(null),pickRef=useRef<Selection|null>(null);
 pickRef.current=pick;
 const enter=useCallback((planet:Planet)=>{
   clearTimeout(hoverTimer.current);setHovered(null);setSelected(null);setPanel(null);setPlanetHover(null);view.hover=null;
   if(!focusRef.current){freePose.current=currentPose();freeMap.current=mapRef.current}mapRef.current=planet;view.detail=planet.name;setMapPlanet(planet);
   focusRef.current=planet;view.focus=planet.name;setFocus(planet);setPick(defaultPick(planet));setHudTab('MISSION');
   moveCamera(focusPose(planet));
 },[moveCamera]);
 const leave=useCallback(()=>{
  clearTimeout(hoverTimer.current);setHovered(null);setSelected(null);setPanel(null);setPlanetHover(null);view.hover=null;
  if(!focusRef.current){moveCamera(zoomOutPose(false));return}
  const restore=freePose.current||overviewPose;
  // Release the lock at input time, not after the return animation. Wheel and
  // drag input during the transition should immediately use free-camera limits.
  focusRef.current=null;view.focus=null;setFocus(null);
  mapRef.current=freeMap.current;view.detail=freeMap.current?.name||null;setMapPlanet(freeMap.current);
  freePose.current=null;freeMap.current=null;
  moveCamera(restore);
 },[moveCamera]);
 const zoomOutToSystem=useCallback(()=>{
  clearTimeout(hoverTimer.current);setHovered(null);setSelected(null);setPanel(null);setPlanetHover(null);view.hover=null;
  focusRef.current=null;view.focus=null;setFocus(null);
  mapRef.current=null;view.detail=null;setMapPlanet(null);
  freePose.current=null;freeMap.current=null;view.amount=0;
  moveCamera(overviewPose);
 },[moveCamera]);
 const zoomAt=useCallback((factor:number,px:number,py:number)=>{
  setHovered(null);setSelected(null);
  // Build on where the camera is heading, not on its lagging mid-flight pose, so a quick
  // burst of scrolling adds up in full and the leave threshold below is reached reliably.
  const prior=anim.current?anim.current.to:currentPose();
  const locked=focusRef.current;
  const freeMin=.78,focusZoom=locked?focusPose(locked).zoom:1;
  // Scrolling out of a planet: slightly shows more around it, far enough (or one hard
  // scroll) goes back to the main view. The short lock swallows the rest of the scroll
  // so it cannot interrupt the return.
  if(locked&&factor<1&&prior.zoom*factor<focusZoom*leaveRatio){wheelLock.current=performance.now()+650;leave();return}
  // Inside a planet the zoom stays centred on the planet, so zooming in or out never
  // slides the view toward a corner of it.
  if(locked){px=locked.x*prior.zoom+prior.cameraX+prior.panX;py=locked.y*prior.zoom+prior.cameraY+prior.panY}
  const min=locked?focusZoom*leaveRatio:freeMin,requested=prior.zoom*factor;
  const zoom=Math.max(min,Math.min(maxZoom,requested)),ratio=zoom/prior.zoom;
  const to={...prior,frame:Math.max(0,Math.min(1,(1-zoom)/.32)),zoom,cameraX:px-(px-prior.cameraX-prior.panX)*ratio,cameraY:py-(py-prior.cameraY-prior.panY)*ratio,panX:0,panY:0};
  const candidate=locked?null:planets.filter(p=>!systemMoonParents[p.name]).map(p=>({p,distance:Math.hypot(p.x*prior.zoom+prior.cameraX+prior.panX-px,p.y*prior.zoom+prior.cameraY+prior.panY-py)})).filter(v=>v.distance<v.p.r*prior.zoom+48&&v.p.r*zoom>detailRadius(v.p)).sort((a,b)=>a.distance-b.distance)[0]?.p;
  const previousMap=mapRef.current,v=chartViewport(innerWidth,innerHeight),previousX=previousMap?previousMap.x*zoom+to.cameraX+to.panX:0,previousY=previousMap?previousMap.y*zoom+to.cameraY+to.panY:0;
  const previousVisible=!!previousMap&&previousMap.r*zoom>detailRadius(previousMap)&&previousX+previousMap.r*zoom>-v.offsetX&&previousX-previousMap.r*zoom<1920+v.offsetX&&previousY+previousMap.r*zoom>-v.offsetY&&previousY-previousMap.r*zoom<1080+v.offsetY;
  const detailed=locked||candidate||(previousVisible?previousMap:null);
  if(detailed)mapRef.current=detailed;
  else mapRef.current=null;
  view.focus=locked?.name||null;view.detail=detailed?.name||null;to.amount=locked?1:0;
  setMapPlanet(detailed||null);moveCamera(to,undefined,true);
 },[moveCamera,leave]);
 const back=useCallback(()=>{if(selected){setSelected(null);setHovered(null)}else if(panel){setPanel(null)}else if(help){setHelp(false)}else if(focusRef.current){leave()}else{leave()}},[selected,panel,help,leave]);
 useEffect(()=>{if(!focus)setPick(null)},[focus]);
 // START MISSION: open the transport for a junction, otherwise mark the stop as started.
 const startMission=useCallback(()=>{const f=focusRef.current,p=pickRef.current;if(!f||!p)return;const n=p.node;if((n.kind==='junction'||n.kind==='travel')&&n.to){const target=planets.find(x=>x.name===n.to);if(target)enter(target);return}setVisited(v=>new Set(v).add(`${f.name}:${n.name}`));say(`Mission started: ${n.name} · ${n.type||'Mission'}`)},[enter,say]);
 // SELECT / arrow keys: step through the planet's waypoints and transports.
 const cyclePick=useCallback((step=1)=>{const f=focusRef.current;if(!f)return;const list=f.nodes.map((node,index)=>({planet:f,node,index})).filter(({node})=>node.kind!=='travel'||!!node.to),at=list.findIndex(s=>s.index===pickRef.current?.index),next=list[((at<0?0:at+step)+list.length)%list.length];if(next)setPick(next)},[]);
 useEffect(()=>{if(!canvas.current)return;return createEngine(canvas.current,()=>setReady(true),()=>{setReady(true);setWebglError(true)})},[]);
 useEffect(()=>{
  const resize=()=>{const v=chartViewport(innerWidth,innerHeight),el=stage.current!;scaleRef.current=v.scale;el.style.width=v.width+'px';el.style.height=v.height+'px';el.style.setProperty('--viewport-width',v.width+'px');el.style.setProperty('--viewport-height',v.height+'px');el.style.transform=`translate(-50%,-50%) scale(${v.scale})`};resize();addEventListener('resize',resize);return()=>removeEventListener('resize',resize);
 },[]);
 useEffect(()=>{
  let raf=0,last=performance.now();const tick=(now:number)=>{
   const dt=Math.min(50,now-last);last=now;
   if(anim.current){const a=anim.current,alpha=1-Math.exp(-Math.min(dt,50)/75);let settled=true;for(const key of cameraKeys){if(a.anchor&&(key==='cameraX'||key==='cameraY'||key==='panX'||key==='panY'))continue;const d=key==='zoom'?Math.log(a.to.zoom/view.zoom):a.to[key]-view[key];if(key==='zoom')view.zoom*=Math.exp(d*alpha);else view[key]+=d*alpha;if(Math.abs(d)>(key==='zoom'?.00001:.001))settled=false}
    if(a.anchor){const ratio=view.zoom/a.from.zoom;view.cameraX=a.anchor.x-(a.anchor.x-a.from.cameraX-a.from.panX)*ratio;view.cameraY=a.anchor.y-(a.anchor.y-a.from.cameraY-a.from.panY)*ratio;view.panX=0;view.panY=0}
    if(settled){for(const key of cameraKeys)view[key]=a.to[key];anim.current=null;a.done?.()}}
   for(const p of planets){const el=labels.current.get(p.name);if(!el)continue;const pos=placement(p),isSelected=view.focus===p.name,moon=!!systemMoonParents[p.name],overviewVisible=systemOverviewNames.has(p.name)||view.zoom>1.12||!!focusRef.current;el.style.left=pos.x+'px';el.style.top=pos.y+'px';el.style.setProperty('--radius',pos.r+'px');el.style.opacity=String(overviewVisible?(isSelected?Math.max(0,1-view.amount*2.7):pos.opacity):0);el.style.pointerEvents=moon?'none':overviewVisible?(focusRef.current?(pos.opacity>.2&&!isSelected?'auto':'none'):'auto'):'none';el.classList.toggle('detail-active',mapRef.current?.name===p.name);el.style.setProperty('--label-fade',String(view.hover&&view.hover!==p.name?.40:1));}
   const f=focusRef.current||mapRef.current;
   if(f&&graph.current){const pos=placement(f),start=detailRadius(f),full=detailFullRadius(f),alpha=Math.max(0,Math.min(1,(pos.r-start)/(full-start))),textStart=start+4,textFull=Math.max(textStart+20,f.r*2.25);graph.current.style.transform=`translate(${pos.x}px,${pos.y}px)`;graph.current.style.opacity=String(alpha);graph.current.style.pointerEvents=alpha>.6?'auto':'none';graph.current.style.setProperty('--node-text-opacity',String(Math.max(0,Math.min(1,(pos.r-textStart)/(textFull-textStart)))));routeGeometry.current?.setAttribute('transform',`scale(${pos.r/345})`);for(const n of f.nodes){const el=nodeElements.current.get(n.name);if(el){el.style.left=n.x*pos.r+'px';el.style.top=n.y*pos.r+'px'}}}
   if(f){const routeScale=Math.max(.001,placement(f).r/345);for(const node of f.nodes){if(node.kind!=='travel'||!node.to)continue;const target=planets.find(p=>p.name===node.to);if(!target)continue;const key=`${f.name}:${target.name}`,pos=placement(target),start=detailRadius(target),full=detailFullRadius(target),fade=clamp((pos.r-start)/(full-start),0,1),onscreen=pos.x+pos.r>0&&pos.x-pos.r<1920&&pos.y+pos.r>0&&pos.y-pos.r<1080;const lines=remotePreviewLines.current.get(key),nodes=remotePreviewNodes.current.get(key);if(lines)lines.style.opacity=String(onscreen?fade:0);if(nodes){nodes.style.opacity=String(onscreen ? .22*fade : 0);nodes.querySelectorAll('text').forEach(text=>{(text as SVGTextElement).style.fontSize=`${17/routeScale}px`; (text as SVGTextElement).style.letterSpacing=`${.65/routeScale}px`})}}}
   if(title.current&&f){const pos=placement(f),rawProgress=clamp((pos.r-detailRadius(f))/(detailFullRadius(f)-detailRadius(f)),0,1),progress=rawProgress*rawProgress*(3-2*rawProgress),extraLineOffset=Math.max(0,(displayNameLines[f.name]?.length||1)-1)*31;title.current.style.left=pos.x+'px';title.current.style.top=(pos.y-pos.r-82-progress*30-extraLineOffset)+'px';title.current.style.opacity=String(progress);title.current.style.fontSize=`${23+7*progress}px`;title.current.style.letterSpacing=`${6.4+2*progress}px`;title.current.style.transform=`translateX(-50%) scale(${.92+.08*progress})`;}
   if(hud.current){const hudFocus=focusRef.current,hudFade=hudFocus?clamp((view.amount-.62)/.3,0,1):0;hud.current.style.opacity=String(hudFade);hud.current.style.visibility=hudFade>.02?'visible':'hidden';
    // Leader line: from the MISSION heading, level, then a 45 degree drop to the selected waypoint.
    const picked=pickRef.current;if(leader.current){if(hudFocus&&picked&&picked.planet===hudFocus&&hudFade>.9){const pos=placement(hudFocus),nx=pos.x+picked.node.x*pos.r,ny=pos.y+picked.node.y*pos.r,sx=196,sy=184,ex=Math.max(sx+30,nx-Math.abs(ny-sy)),len=Math.hypot(nx-ex,ny-sy)||1,tx=nx-(nx-ex)/len*20,ty=ny-(ny-sy)/len*20;leader.current.setAttribute('points',`${sx},${sy} ${ex},${sy} ${tx},${ty}`)}else leader.current.setAttribute('points','')}}
   if(sun.current){sun.current.style.opacity=String(1-Math.min(1,view.amount*1.6));sun.current.style.left=(965*view.zoom+view.cameraX+view.panX)+'px';sun.current.style.top=(540*view.zoom+view.cameraY+view.panY)+'px'}
   if(orbitGrid.current){const zoomFade=clamp((view.zoom-1.12)/.98,0,1),smoothFade=zoomFade*zoomFade*(3-2*zoomFade);orbitGrid.current.style.opacity=String((1-smoothFade)*Math.max(0,1-view.amount*1.15));orbitGrid.current.style.transform=`translate(${view.cameraX+view.panX}px,${view.cameraY+view.panY}px) scale(${view.zoom})`}
   // Keep the lines and circles running to the edge of whatever is on screen: find the visible
   // corner farthest from the sun and make sure the grid has enough rings to reach it.
   {const vp=chartViewport(innerWidth,innerHeight);let far=0;for(const sx of [-vp.offsetX,1920+vp.offsetX])for(const sy of [-vp.offsetY,1080+vp.offsetY])far=Math.max(far,Math.hypot((sx-view.cameraX-view.panX)/view.zoom-965,(sy-view.cameraY-view.panY)/view.zoom-540));
    const needed=gridRingsFor(far);if(needed>gridRef.current||needed<gridRef.current-12){gridRef.current=Math.min(90,needed+4);setGridRings(gridRef.current)}}
   const tooltip=tooltipRef.current;
   if(card.current&&tooltip){const pos=placement(tooltip.planet);card.current.style.left=Math.max(85,Math.min(1345,pos.x+tooltip.node.x*pos.r-435))+'px';card.current.style.top=Math.max(170,Math.min(670,pos.y+tooltip.node.y*pos.r-360))+'px'}
   raf=requestAnimationFrame(tick);
  };raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).matches('input,textarea'))return;if(e.key==='Escape'){e.preventDefault();back()}else if(e.key.toLowerCase()==='h'){setHelp(v=>!v)}else if(e.key.toLowerCase()==='m'){setMuted(v=>!v)}else if(e.key==='Home'){leave()}else if(e.key==='-'||e.key==='_'){zoomAt(1/1.15,960,540)}else if(e.key==='+'||e.key==='='){zoomAt(1.15,960,540)}else if(e.key.toLowerCase()==='f'){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.()}else if(e.key==='Tab'){setStarted(true)}else if(focusRef.current&&e.key==='Enter'){e.preventDefault();startMission()}else if(focusRef.current&&(e.key==='ArrowRight'||e.key==='ArrowDown')){e.preventDefault();cyclePick(1)}else if(focusRef.current&&(e.key==='ArrowLeft'||e.key==='ArrowUp')){e.preventDefault();cyclePick(-1)}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[back,leave,zoomAt,startMission,cyclePick]);
 useEffect(()=>{view.motion=moving},[moving]);
 useEffect(()=>{if(!audio.current)return;audio.current.volume=.20;if(!muted)audio.current.play().catch(()=>setMuted(true));else audio.current.pause()},[muted]);
 const nodeEnter=(planet:Planet,node:Mission,index:number)=>{clearTimeout(hoverTimer.current);hoverTimer.current=setTimeout(()=>setHovered({planet,node,index}),motion.tooltipDelay)};
 const nodeLeave=()=>{clearTimeout(hoverTimer.current);if(!selected)setHovered(null)};
 const activate=(selection:Selection)=>{if(drag.current?.didMove)return;if(selection.node.kind==='travel'&&selection.node.to){const p=planets.find(p=>p.name===selection.node.to);if(p)enter(p);return}if(focusRef.current){setPick(selection);return}setSelected(selection);setHovered(selection)};
 // Pointer position in chart units, and whether it is on the open planet's disc.
 const chartPoint=(e:{clientX:number;clientY:number})=>{const b=stage.current!.getBoundingClientRect(),v=chartViewport(innerWidth,innerHeight);return {x:(e.clientX-b.left)/scaleRef.current-v.offsetX,y:(e.clientY-b.top)/scaleRef.current-v.offsetY}};
 const overPlanet=(e:{clientX:number;clientY:number})=>{const f=focusRef.current;if(!f||!stage.current)return false;const pos=placement(f),c=chartPoint(e);return Math.hypot(c.x-pos.x,c.y-pos.y)<=pos.r*1.02};
 const pointerDown=(e:React.PointerEvent)=>{const target=e.target as HTMLElement,planetTarget=target.closest('.planet-target');if(target.closest('button,input,a,.mission-card,.modal,.chat-panel,.hud-ui')&&!planetTarget)return;const interrupted=anim.current;anim.current=null;interrupted?.done?.();releaseAfterClick.current=!!focusRef.current;if(!planetTarget)stage.current?.setPointerCapture(e.pointerId);
  // Press and hold on the open planet grabs it: dragging spins it, and it keeps turning after release.
  if(focusRef.current&&!planetTarget&&overPlanet(e)){releaseAfterClick.current=false;const spin=spinOf(focusRef.current.name);spin.held=true;spin.velocity=0;stage.current?.classList.add('spinning');drag.current={x:e.clientX,y:e.clientY,px:view.panX,py:view.panY,didMove:false,spin:true,lastX:e.clientX,lastT:performance.now()};return}
  drag.current={x:e.clientX,y:e.clientY,px:view.panX,py:view.panY,didMove:false}};
 const pointerMove=(e:React.PointerEvent)=>{if(!drag.current){stage.current?.classList.toggle('over-planet',overPlanet(e));return}const d=drag.current,dx=(e.clientX-d.x)/scaleRef.current,dy=(e.clientY-d.y)/scaleRef.current;d.didMove||=Math.abs(dx)+Math.abs(dy)>5;
  // Spinning: the surface follows the pointer, so pushing right turns it one way and left the other.
  if(d.spin){const f=focusRef.current;if(!f)return;const spin=spinOf(f.name),now=performance.now(),step=(e.clientX-(d.lastX??e.clientX))/scaleRef.current,angle=step/Math.max(60,placement(f).r),seconds=Math.max(.008,(now-(d.lastT??now))/1000);d.lastX=e.clientX;d.lastT=now;spin.offset+=angle;spin.velocity=spin.velocity*.55+angle/seconds*.45;return}
  if(focusRef.current){const radius=placement(focusRef.current).r,limit=Math.min(900,Math.max(320,radius*1.1));view.panX=clamp(d.px+dx,-limit,limit);view.panY=clamp(d.py+dy,-limit,limit)}else{const [minX,maxX]=roamingPanRange(view.zoom,view.cameraX,1920,bounds.left,bounds.right),[minY,maxY]=roamingPanRange(view.zoom,view.cameraY,1080,bounds.top,bounds.bottom);view.panX=clamp(d.px+dx,minX,maxX);view.panY=clamp(d.py+dy,minY,maxY)}setHovered(null);setSelected(null);setPlanetHover(null);view.hover=null;if(!focusRef.current){const v=chartViewport(innerWidth,innerHeight),cx=960,cy=540,visible=planets.filter(p=>!systemMoonParents[p.name]).map(p=>({p,pos:placement(p)})).filter(({p,pos})=>pos.r>detailRadius(p)&&pos.x+pos.r>-v.offsetX&&pos.x-pos.r<1920+v.offsetX&&pos.y+pos.r>-v.offsetY&&pos.y-pos.r<1080+v.offsetY).sort((a,b)=>Math.hypot(a.pos.x-cx,a.pos.y-cy)-Math.hypot(b.pos.x-cx,b.pos.y-cy)),next=visible[0]?.p||null;if(next!==mapRef.current){mapRef.current=next;view.focus=null;view.detail=next?.name||null;view.amount=0;setMapPlanet(next)}}};
 const pointerUp=(e?:React.PointerEvent)=>{const d=drag.current;drag.current=null;stage.current?.classList.remove('spinning');
  if(d?.spin){const f=focusRef.current;if(f){const spin=spinOf(f.name),pos=placement(f),idle=performance.now()-(d.lastT??0);spin.held=false;
   // A quick click gives it a push: clicking its right half turns it one way, its left half the other.
   // Holding still, or a drag that stopped before release, lets go without any coasting.
   if(!d.didMove&&e&&idle<350)spin.velocity=clamp((chartPoint(e).x-pos.x)/pos.r,-1,1)*1.2;else if(idle>90)spin.velocity=0}return}
  if(d?.didMove){releaseAfterClick.current=false;suppressPlanetClick.current=true;window.setTimeout(()=>{suppressPlanetClick.current=false},0)}else if(d&&!d.didMove&&releaseAfterClick.current&&e&&!(e.target as HTMLElement).closest('button,input,a,.mission-card,.modal,.chat-panel,.hud-ui')){releaseAfterClick.current=false;leave()}};
 const wheel=(e:React.WheelEvent)=>{
  if(panel||performance.now()<wheelLock.current)return;
  const bounds=stage.current!.getBoundingClientRect(),v=chartViewport(innerWidth,innerHeight);const px=(e.clientX-bounds.left)/scaleRef.current-v.offsetX,py=(e.clientY-bounds.top)/scaleRef.current-v.offsetY;
  zoomAt(Math.exp(-e.deltaY*.0018),px,py);
 };
 const tooltip=selected||hovered;
 tooltipRef.current=tooltip;
 const activeMap=focus||mapPlanet;
 // In the mission HUD only hover emphasises routes; the selected waypoint is shown by the HUD itself.
 const hl=focus?hovered:tooltip;
 const connected=new Set<number>();if(hl&&activeMap){connected.add(hl.index);for(const [a,b]of activeMap.edges){if(a===hl.index)connected.add(b);if(b===hl.index)connected.add(a)}}
 const tooltipX=tooltip?Math.max(85,Math.min(1345,1040+tooltip.node.x*345-430)):0;
 const tooltipY=tooltip?Math.max(170,Math.min(670,552+tooltip.node.y*345-360)):0;
 const uiTabs=[['Archwing',2,'Events'],['Boss',3,'Quests'],['Alert',3,'Alerts'],['Invasion',4,'Invasions'],['Quest',12,'Syndicates'],['Nightmare',5,'Void Fissures'],['Sortie',1,'Sorties']];
 return <main className="app" onContextMenu={e=>{e.preventDefault();back()}}>
  <div className="outer-backdrop"/>
  <div ref={stage} className={`stage ${focus?'focused':''} ${tooltip?'node-hovered':''} ${started?'using-keyboard':''}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel}>
   <div className="light-vignette"/>
   <div className="chart-content">
   <div ref={sun} className="sun" style={{left:965,top:540}}><i/><b/></div>
   <div ref={canvas} className="planet-canvas"/>
   <OrbitGrid ref={orbitGrid} rings={gridRings}/>
   {webglError&&<div className="render-notice">WebGL is unavailable in this browser. Hardware acceleration is required for planet rendering.</div>}
   <div className="system-labels">
    {planets.filter(p=>!systemMoonParents[p.name]).map(p=><button key={p.name} aria-label={`Explore ${displayNames[p.name]||p.name}`} ref={el=>{if(el)labels.current.set(p.name,el)}} className={`planet-target ${planetHover===p.name?'hovered':''} special-${p.name.toLowerCase().replace(' ','-')}`} style={{left:p.x,top:p.y,'--radius':p.r+'px'} as React.CSSProperties} onPointerEnter={()=>{setPlanetHover(p.name);view.hover=p.name}} onPointerLeave={()=>{setPlanetHover(null);view.hover=null}} onClick={()=>{if(!suppressPlanetClick.current)enter(p)}} onFocus={()=>{setPlanetHover(p.name);view.hover=p.name}} onBlur={()=>{setPlanetHover(null);view.hover=null}}>
      {p.name==='Sanctuary'&&<span className="sanctuary-rift"/>}{p.name==='Dojo'&&<span className="dojo-orbit"><svg viewBox="-30 -30 60 60" aria-hidden="true"><path d="M0-27-3-11-10-5-11 5-3 12 0 26 3 12 11 5 10-5 3-11Z" fill="#776c43" stroke="#bcb99b" strokeWidth=".65"/><path d="M-4-10 0-21 4-10 4 9 0 17-4 9Z" fill="#27393c"/><path d="M-15-17-8-2-11 13M15-17 8-2 11 13M-22-4-9 2M22-4 9 2" fill="none" stroke="#b3baa2" strokeWidth="1.2"/><path d="M0-15V8" stroke="#a1e0df" strokeWidth="1"/></svg></span>}
      <span className={`planet-name ${displayNameLines[p.name]?'wrapped':''}`}><NameLines name={p.name}/></span><span className="orbit-selection"><i/><b/></span>
    </button>)}
   </div>
   {activeMap&&<>
    <div ref={title} className={`planet-title ${displayNameLines[activeMap.name]?'wrapped':''}`}><NameLines name={activeMap.name}/></div>
    <div ref={graph} className="mission-graph" key={activeMap.name}>
     <svg className="connections" viewBox="-900 -650 1800 1300" width="1800" height="1300" aria-hidden="true">
      <defs>{activeMap.nodes.filter(n=>n.kind==='travel'&&n.to).map(n=>{const target=planets.find(p=>p.name===n.to),preview=target&&destinationPreview(activeMap,target);if(!target||!interplanetaryPath(activeMap,target))return null;const far=preview?.nodes.reduce((best,current)=>Math.hypot(current.x,current.y)>Math.hypot(best.x,best.y)?current:best,preview.nodes[0]),x2=far?.x??((target.x-activeMap.x)*345/activeMap.r),y2=far?.y??((target.y-activeMap.y)*345/activeMap.r);return <linearGradient key={routeGradientId(activeMap.name,target.name)} id={routeGradientId(activeMap.name,target.name)} gradientUnits="userSpaceOnUse" x1={n.x*345} y1={n.y*345} x2={x2} y2={y2}><stop offset="0%" stopColor="#d3dad7" stopOpacity=".96"/><stop offset="34%" stopColor="#d3dad7" stopOpacity=".82"/><stop offset="66%" stopColor="#d3dad7" stopOpacity=".52"/><stop offset="88%" stopColor="#d3dad7" stopOpacity=".28"/><stop offset="100%" stopColor="#d3dad7" stopOpacity=".12"/></linearGradient>})}</defs>
      <g ref={routeGeometry}>{focus&&focus.name===activeMap.name&&<PlanetOrnaments/>}{activeMap.edges.map(([a,b],i)=>{const n=activeMap.nodes[a],k=activeMap.nodes[b];if(!n||!k||n.kind==='travel'||k.kind==='travel')return null;const relevant=!hl||a===hl.index||b===hl.index;return <path key={i} d={missionPath(activeMap,n,k)} vectorEffect="non-scaling-stroke" className={`route ${relevant?'active':'dimmed'} ${n.locked||k.locked?'locked-route':''} ${focus&&pick&&(a===pick.index||b===pick.index)?'picked-route':''}`}/>})}
      {activeMap.nodes.filter(n=>n.kind==='travel'&&n.to).map(n=>{const target=planets.find(p=>p.name===n.to),d=target&&interplanetaryPath(activeMap,target);if(!target||!d)return null;const index=activeMap.nodes.indexOf(n),relevant=!hl||connected.has(index),preview=destinationPreview(activeMap,target),key=`${activeMap.name}:${target.name}`,fade=routeGradientId(activeMap.name,target.name);return <React.Fragment key={`route-${n.name}`}><path d={d} vectorEffect="non-scaling-stroke" className={`route ${relevant?'active':'dimmed'}`} style={{stroke:`url(#${fade})`}}/>{preview&&<>
       <g className="remote-preview-lines" ref={el=>{if(el)remotePreviewLines.current.set(key,el);else remotePreviewLines.current.delete(key)}}>{preview.edges.map((edge,i)=><path key={`edge-${i}`} d={edge.d} vectorEffect="non-scaling-stroke" className={`active preview-depth-${edge.depth}`} style={{stroke:`url(#${fade})`}}/>)}</g>
       <g className="remote-preview-nodes" ref={el=>{if(el)remotePreviewNodes.current.set(key,el);else remotePreviewNodes.current.delete(key)}}>{preview.nodes.map(({node,x,y},i)=><g key={`node-${i}`} className="remote-preview-node"><rect x={x-3} y={y-3} width="6" height="6" transform={`rotate(45 ${x} ${y})`}/><text x={x+8} y={y+4}>{node.name.toUpperCase()}</text></g>)}</g>
      </>}</React.Fragment>})}
      </g>
     </svg>
     {activeMap.nodes.map((n,i)=><button key={n.name} ref={el=>{if(el)nodeElements.current.set(n.name,el);else nodeElements.current.delete(n.name)}} aria-label={`${n.name}, ${n.type}${n.level?', level '+n.level:''}`} className={`mission-node ${n.kind} ${n.locked?'locked':''} ${hl?.index===i?'active':''} ${focus&&pick?.index===i?'picked':''} ${hl&&!connected.has(i)?'unrelated':''}`} style={{left:n.x*345,top:n.y*345,animationDelay:`${i*motion.nodeStagger}ms`}} onPointerEnter={()=>nodeEnter(activeMap,n,i)} onPointerLeave={nodeLeave} onFocus={()=>nodeEnter(activeMap,n,i)} onBlur={nodeLeave} onClick={()=>activate({planet:activeMap,node:n,index:i})}>
       <Marker node={n}/><span className="node-text"><span className="node-label">{n.name}</span><span className="node-coords">{coordsFor(activeMap,n)}</span></span><span className="node-pulse"/>
     </button>)}
    </div>
   </>}
   {focus&&<PlanetHud key={focus.name} planet={focus} pick={pick?.planet===focus?pick:null} tab={hudTab} visited={visited} rootRef={hud} leaderRef={leader} onTab={setHudTab} onPick={setPick} onStart={startMission} onBack={leave} onCycle={()=>cyclePick(1)}/>}
   {!focus&&tooltip&&tooltip.node.kind!=='travel'&&(tooltip.node.kind==='junction'?<div className="junction-card" onPointerDown={e=>e.stopPropagation()}>
     <h2><img src={original+'JunctionNode.webp'} alt=""/>{tooltip.node.name}</h2><p>Complete all the goals listed below to gain access to a new planet.</p>
     {['Defeat JACKAL at FOSSA','Complete 10 waves of DEFENSE at TESSERA in a single mission','Rescue a HOSTAGE from LINEA','Defeat 10 EXIMUS enemies on VENUS'].map((s,i)=><div className={`junction-task ${i>1?'complete':''}`} key={s}><strong>{i>1?'✓':'−'}<small>{i===3?'10 / 10':i>1?'1 / 1':'0 / 1'}</small></strong><span>{s}</span></div>)}
     <h3>REWARD 4/4 · SALVAGE (1000)</h3><img className="reward" src="/assets/salvage.webp" alt="Salvage" onError={e=>e.currentTarget.style.display='none'}/><button className="flat-button junction-travel" onClick={()=>{const p=planets.find(p=>p.name===tooltip.node.to);if(p)enter(p)}}>TRAVEL TO {tooltip.node.to?.toUpperCase()}</button>
   </div>:<div ref={card} className={`mission-card ${selected?'pinned':''}`} style={{left:tooltipX,top:tooltipY}} onPointerDown={e=>e.stopPropagation()}>
     <div className="mission-image" style={{backgroundImage:`url('${original+'Corpusiceplanet1_2068x689.webp'}')`}}><div/><h2>{tooltip.node.name}</h2></div>
     <dl><dt>MISSION</dt><dd>{tooltip.node.type||'Relay'}</dd><dt>FACTION</dt><dd>{(tooltip.node as Mission&{faction?:string}).faction||tooltip.planet.faction}</dd>{tooltip.node.level&&<><dt>LEVEL</dt><dd>{tooltip.node.level}</dd></>}</dl>
     {selected&&<div className="mission-actions"><span>MISSION SELECTED</span><button className="flat-button" onClick={()=>{setSelected(null);setHovered(null)}}>CANCEL</button></div>}
   </div>)}
   </div>
   <header className="hud">
    <div className="squad">
     <div className="match-row"><button aria-label="Open navigation menu" className="menu-button" onClick={()=>setPanel(panel==='Navigation'?null:'Navigation')}><span/><span/><span/></button><button className="matchmaking" onClick={()=>setMatchMenu(v=>!v)} aria-expanded={matchMenu}>MATCHMAKING: {match}<i/></button></div>
     <div className="squad-row"><button className="profile-avatar" onClick={()=>setPanel('Squad')} aria-label="Squad profile"/><button className="add-squad" onClick={()=>setPanel('Squad')} aria-label="Invite to squad">＋</button></div>
     {matchMenu&&<div className="match-menu">{['PUBLIC','FRIENDS ONLY','INVITE ONLY','SOLO'].map(s=><button className={match===s?'current':''} key={s} onClick={()=>{setMatch(s);setMatchMenu(false)}}>{s}</button>)}</div>}
    </div>
    <nav className="world-state" aria-label="World state window">{uiTabs.map(([icon,count,name])=><button key={name} title={String(name)} aria-label={String(name)} className={panel===name?'active':''} onClick={()=>setPanel(panel===name?null:String(name))}><img src={original+icon+'.webp'} alt=""/><sup>{count}</sup></button>)}<button className="collapse-state" aria-label="Hide world state panel" onClick={()=>setPanel(null)}>▣</button></nav>
   </header>
   
   <footer className="footer">{(focus||mapPlanet)&&<button className="zoom-out" onClick={zoomOutToSystem}>ZOOM OUT</button>}</footer>
   <div className="chat-bar"><button className="chat-key" title="Open chat" onClick={()=>setChat(v=>!v)}>T</button>{['Relay','Invasion','Boss','Quest','Alert','Sortie'].map((icon,i)=><button key={icon} className={chat&&i===1?'chosen':''} aria-label={['Clan chat','Region chat','Recruiting chat','Trading chat','Questions','Squad chat'][i]} onClick={()=>{setChat(true);setTab(['Clan','Region','Recruiting','Trading','Questions','Squad'][i])}}><img src={original+icon+'.webp'} alt=""/></button>)}<button title="Hide chat" aria-label="Hide chat" onClick={()=>setChat(false)}>▣</button></div>
   {chat&&<div className="chat-panel"><div className="chat-tabs">{['Clan','Region','Recruiting','Trading','Squad'].map(t=><button key={t} onClick={()=>setTab(t)} className={tab===t?'current':''}>{t}</button>)}<button onClick={()=>setChat(false)} aria-label="Close chat">×</button></div><div className="chat-messages">{tab} channel</div><form onSubmit={e=>{e.preventDefault();say('Chat is local to this recreation.')}}><input aria-label="Chat message" placeholder="Send a message…"/></form></div>}
   {panel&&<div className="panel-shade" onClick={()=>setPanel(null)}><section className={`modal ${panel==='Navigation'?'navigation-menu':''}`} onClick={e=>e.stopPropagation()}><button className="close-panel" aria-label="Close panel" onClick={()=>setPanel(null)}>×</button>
    <h2>{panel.toUpperCase()}</h2>
    {panel==='Navigation'?<><div className="nav-actions"><button onClick={()=>{leave();setPanel(null)}}>ORIGIN SYSTEM</button><button onClick={()=>{setPanel(null);setHelp(true)}}>CONTROLS</button><button onClick={()=>setMuted(v=>!v)}>SOUND: {muted?'OFF':'ON'}</button><button onClick={()=>setMoving(v=>!v)}>AMBIENT MOTION: {moving?'ON':'OFF'}</button><button onClick={()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}}>FULLSCREEN</button><button onClick={()=>setPanel('Reference & Assets')}>REFERENCE & ASSETS</button></div><div className="planet-list">{planets.filter(p=>!systemMoonParents[p.name]).map(p=><button key={p.name} onClick={()=>enter(p)}>{displayNames[p.name]||p.name}</button>)}</div></>:panel==='Reference & Assets'?<div className="credits"><p>Visual reconstruction based on the supplied 1920 × 1080, 59.94 FPS Star Chart recording and reference images.</p><p>Planets, nebulae, star fields, cursor, mission routes and node markers are rendered from code. Map geometry is traced from the supplied images and WARFRAME Wiki chart screenshots. Preserved HUD icons and mission preview artwork: Digital Extremes.</p><p>Browser lighting, camera curves and reconstructed surfaces are under comparison. This build does not claim verified pixel equivalence.</p><a href="https://www.warframe.com" target="_blank" rel="noreferrer">Warframe · Digital Extremes</a><a href="https://wiki.warframe.com/w/Star_Chart" target="_blank" rel="noreferrer">WARFRAME Wiki · Star Chart</a></div>:panel==='Resource Drones'?<><p className="panel-copy">Select a planet to inspect its resources.</p><div className="resource-planets">{planets.filter(p=>!systemMoonParents[p.name]&&!['Void','Dojo','Sanctuary','Derelict','Kuva Fortress'].includes(p.name)).map(p=><button key={p.name} onClick={()=>enter(p)}>{displayNames[p.name]||p.name}</button>)}</div></>:panel==='Squad'?<><p className="panel-copy">MATCHMAKING: {match}</p><p className="panel-copy">Navigation is running locally. No game account is connected.</p><button className="flat-button" onClick={()=>setPanel(null)}>CLOSE</button></>:<><p className="panel-copy">{panel.toUpperCase()}</p><p className="panel-copy">The recording’s interface is reproduced here. Live Warframe activities are not connected.</p><button className="flat-button" onClick={()=>setPanel(null)}>CLOSE</button></>}
   </section></div>}
   {help&&<div className="panel-shade" onClick={()=>setHelp(false)}><section className="modal controls-modal" onClick={e=>e.stopPropagation()}><button className="close-panel" aria-label="Close controls" onClick={()=>setHelp(false)}>×</button><h2>NAVIGATION</h2><dl><dt>SELECT PLANET</dt><dd>Click a planet</dd><dt>ZOOM</dt><dd>Mouse wheel</dd><dt>PAN</dt><dd>Click and drag</dd><dt>SPIN PLANET</dt><dd>Hold and drag the open planet</dd><dt>LEAVE PLANET</dt><dd>Scroll out</dd><dt>MISSION DETAILS</dt><dd>Hover a mission node</dd><dt>RETURN</dt><dd>Escape / Right click</dd><dt>FULLSCREEN</dt><dd>F</dd><dt>SOUND</dt><dd>M</dd><dt>CONTROLS</dt><dd>H</dd></dl><button className="flat-button" onClick={()=>setHelp(false)}>CLOSE</button></section></div>}
   {toast&&<div className="toast" role="status">{toast}</div>}
   {!ready&&<div className="loading"><div className="loading-emblem">◇</div><span>NAVIGATION</span><small>INITIALIZING STAR CHART</small></div>}
  </div>
  <audio ref={audio} src="/assets/navigation-ambience.mp3" loop preload="none"/>
 </main>
}
createRoot(document.getElementById('root')!).render(<App/>);
