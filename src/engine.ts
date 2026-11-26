import * as THREE from 'three';
import {planets,systemOverviewNames,systemMoonParents, type Planet} from './data';
import {addEnvironment} from './environment';
import {chartViewport} from './viewport';
import {createPlanetMaterial,createAtmosphereMaterial,createCloudMaterial,createRingMaterial} from './planet-materials';
import {blenderDef,blenderTypeOf,mapUrl,createTextureBank} from './blender-planets';
export type View={focus:string|null;detail:string|null;amount:number;frame:number;zoom:number;cameraX:number;cameraY:number;panX:number;panY:number;hover:string|null;motion:boolean};
export type CameraPose=Pick<View,'amount'|'frame'|'zoom'|'cameraX'|'cameraY'|'panX'|'panY'>;
export const view:View={focus:null,detail:null,amount:0,frame:0,zoom:1,cameraX:0,cameraY:0,panX:0,panY:0,hover:null,motion:true};
export const overviewPose:CameraPose={amount:0,frame:0,zoom:1,cameraX:0,cameraY:0,panX:0,panY:0};
export const framePose:CameraPose={amount:0,frame:1,zoom:.78,cameraX:960*.22,cameraY:540*.22,panX:0,panY:0};
export function zoomOutPose(planetSelected:boolean):CameraPose{return {...(planetSelected?overviewPose:framePose)}}
// Where a clicked planet sits while the mission HUD is open: centred between the
// two HUD columns. Ringed worlds are drawn smaller so their rings stay clear of the panels.
export const focusCenter={x:965,y:588};
const focusRadius:Record<string,number>={Saturn:176,Uranus:192,Jupiter:232};
export function focusPose(p:Planet):CameraPose {const r=focusRadius[p.name]||242,zoom=r/p.r;return {amount:1,frame:0,zoom,cameraX:focusCenter.x-p.x*zoom,cameraY:focusCenter.y-p.y*zoom,panX:0,panY:0}}
export function currentPose():CameraPose{return {amount:view.amount,frame:view.frame,zoom:view.zoom,cameraX:view.cameraX,cameraY:view.cameraY,panX:view.panX,panY:view.panY}}
// Largest a planet may grow on screen (chart px of radius). The camera's depth range is
// sized to fit it, so a planet is never cut open by the near plane when zoomed in far.
export const maxPlanetRadius=2400;
export const maxZoom=maxPlanetRadius/Math.max(...planets.map(p=>p.r));
// User spin: dragging a focused planet turns it, and letting go leaves it coasting.
export type Spin={offset:number;velocity:number;held:boolean};
const spins=new Map<string,Spin>();
export function spinOf(name:string){let spin=spins.get(name);if(!spin){spin={offset:0,velocity:0,held:false};spins.set(name,spin)}return spin}
export function placement(p:Planet){
 const focusedMoonHost=systemMoonParents[view.focus||''];
 const focusedHostMoon=systemMoonParents[p.name]===view.focus;
 return {x:p.x*view.zoom+view.cameraX+view.panX,y:p.y*view.zoom+view.cameraY+view.panY,r:p.r*view.zoom,opacity:p.name===view.focus||p.name===focusedMoonHost||focusedHostMoon?1:Math.max(0,1-view.amount*1.22)};
}
type Body={p:Planet;type:string;mesh:THREE.Mesh;material:THREE.ShaderMaterial;atmosphere:THREE.Mesh;atmosphereMaterial:THREE.ShaderMaterial;air:number;initial:number;viewTilt:number;axisTilt:number;cloudSpeed:number;clouds?:THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>;ring?:THREE.Mesh<THREE.RingGeometry,THREE.ShaderMaterial>;detail:boolean;sharp:boolean};
export function createEngine(container:HTMLElement,onReady:()=>void,onError:()=>void){
 let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch{onError();return ()=>{}}
 renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-hidden','true');container.appendChild(renderer.domElement);
 // Orthographic depth is linear, so a deep range costs no precision where it matters:
 // the camera sits beyond the biggest allowed planet (maxPlanetRadius) and its shells.
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-960,960,540,-540,.1,maxPlanetRadius*2.6);camera.position.z=maxPlanetRadius*1.3;
 const environment=addEnvironment(scene);
 let viewport=chartViewport(innerWidth,innerHeight),disposed=false;
 const resizeResolution=()=>{viewport=chartViewport(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio*viewport.scale,1.8));renderer.setSize(viewport.width,viewport.height);camera.left=-viewport.width/2;camera.right=viewport.width/2;camera.top=viewport.height/2;camera.bottom=-viewport.height/2;camera.updateProjectionMatrix();environment.resize(viewport.width,viewport.height)};
 resizeResolution();window.addEventListener('resize',resizeResolution);
 const sphere=new THREE.SphereGeometry(1,128,96),bank=createTextureBank(renderer),baseMaps:Promise<unknown>[]=[];
 const bodies:Body[]=planets.map(p=>{
  const type=blenderTypeOf(p.name),def=blenderDef(p.name),material=createPlanetMaterial(def,p.r);
  const mesh=new THREE.Mesh(sphere,material);mesh.rotation.order='ZXY';
  const ringed=!!def.rings&&!!mapUrl(type,'rings'),viewTilt=ringed?.30:.20,axisTilt=-def.tilt*Math.PI/180*.6,initial=(p.name.split('').reduce((s,c)=>s+c.charCodeAt(0),0)%628)/100;
  mesh.rotation.set(viewTilt,initial,axisTilt);scene.add(mesh);
  const {material:atmosphereMaterial,air}=createAtmosphereMaterial(def),atmosphere=new THREE.Mesh(sphere,atmosphereMaterial);atmosphere.renderOrder=3;scene.add(atmosphere);
  const body:Body={p,type,mesh,material,atmosphere,atmosphereMaterial,air,initial,viewTilt,axisTilt,cloudSpeed:def.cloud_speed??1,detail:false,sharp:false};
  baseMaps.push(bank.load(mapUrl(type,'color'),true).then(t=>{if(t&&!disposed)material.uniforms.colorMap.value=t}));
  if(def.clouds>0&&mapUrl(type,'clouds'))baseMaps.push(bank.load(mapUrl(type,'clouds'),false).then(t=>{if(!t||disposed)return;const shell=new THREE.Mesh(sphere,createCloudMaterial(t,def.clouds));shell.renderOrder=2;scene.add(shell);body.clouds=shell as Body['clouds']}));
  if(ringed&&def.rings)baseMaps.push(bank.load(mapUrl(type,'rings'),true).then(t=>{if(!t||disposed)return;const ring=new THREE.Mesh(new THREE.RingGeometry(def.rings!.inner,def.rings!.outer,256),createRingMaterial(t,def.rings!.inner,def.rings!.outer));ring.rotation.order='ZXY';ring.rotation.set(viewTilt+Math.PI/2,0,axisTilt);scene.add(ring);body.ring=ring}));
  return body;
 });
 // Normal, night-light and glint maps cost memory, so they load once a planet is large
 // enough on screen; the 4K colour map follows when its map is opened.
 const loadDetail=(b:Body)=>{if(b.detail)return;b.detail=true;const u=b.material.uniforms;
  bank.load(mapUrl(b.type,'normal'),false).then(t=>{if(t&&!disposed){u.normalMap.value=t;u.hasNormal.value=1}});
  bank.load(mapUrl(b.type,'emissive'),true).then(t=>{if(t&&!disposed){u.emissiveMap.value=t;u.hasEmissive.value=1}});
  bank.load(mapUrl(b.type,'spec'),false).then(t=>{if(t&&!disposed){u.specMap.value=t;u.hasSpec.value=1}})};
 const loadSharp=(b:Body)=>{if(b.sharp)return;b.sharp=true;bank.load(mapUrl(b.type,'color_4k'),true).then(t=>{if(t&&!disposed)b.material.uniforms.colorMap.value=t})};
 Promise.race([Promise.all(baseMaps),new Promise(resolve=>setTimeout(resolve,8000))]).then(()=>{if(!disposed)onReady()});
 let raf=0,start=performance.now(),last=start,elapsed=0;
 const selectedLight:Record<string,number[]>={Earth:[-.72,.60,.14],Venus:[.28,.64,.91],Mercury:[.85,.50,.12],Jupiter:[.78,-.28,-.04],Europa:[.74,.15,-.06],Saturn:[.60,.70,.24]};
 const tick=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;if(view.motion)elapsed+=dt;
  environment.update(elapsed,view);
  for(const b of bodies){const {p,mesh,material,atmosphere,atmosphereMaterial,clouds,ring}=b;
   const pos=placement(p),detailActive=view.detail===p.name,focusedMoon=systemMoonParents[view.focus||'']===p.name,overviewVisible=systemOverviewNames.has(p.name)||view.zoom>1.12||!!view.focus,reveal=Math.max(20,p.r*1.18),detailProgress=detailActive?Math.max(0,Math.min(1,(pos.r-reveal)/(p.r*.75))):0,shift=detailProgress*(2+Math.sin(elapsed*.7));
   mesh.position.set(pos.x-960+shift,540-pos.y,0);mesh.scale.setScalar(pos.r);
   mesh.visible=overviewVisible&&pos.opacity>.002&&pos.x+pos.r>-100-viewport.offsetX&&pos.x-pos.r<2020+viewport.offsetX&&pos.y+pos.r>-100-viewport.offsetY&&pos.y-pos.r<1180+viewport.offsetY;
   if(mesh.visible){if(pos.r>56)loadDetail(b);if(view.focus===p.name||pos.r>230)loadSharp(b)}
   const bodyOpacity=pos.opacity*(view.hover&&view.hover!==p.name&&view.focus!==p.name ? .70 : 1);material.uniforms.opacity.value=bodyOpacity;material.uniforms.time.value=elapsed;material.uniforms.radius.value=pos.r;
   const spin=spinOf(p.name);if(!spin.held){if(Math.abs(spin.velocity)>1e-3){spin.offset+=spin.velocity*dt;spin.velocity*=Math.exp(-dt*1.7)}else spin.velocity=0}
   mesh.rotation.y=b.initial+elapsed*(view.focus===p.name ? .0012 : .002+detailProgress*.007)*(p.name==='Venus'?-.4:1)+spin.offset;
   // Light changes with the chart focus, as in the manual zoom in the recording.
   const light=material.uniforms.lightDir.value as THREE.Vector3;const angle=Math.atan2(540-p.y,965-p.x);const sx=Math.cos(angle)*.8,sy=Math.sin(angle)*.8;
   const f=selectedLight[p.name]||[-.65,.5,.40],lightAmount=view.focus===p.name||focusedMoon?Math.max(view.amount,.42):detailProgress*.42;light.set(sx*(1-lightAmount)+f[0]*lightAmount,sy*(1-lightAmount)+f[1]*lightAmount,.50*(1-lightAmount)+f[2]*lightAmount);
   atmosphere.visible=mesh.visible&&b.air>0;atmosphere.position.copy(mesh.position);atmosphere.rotation.copy(mesh.rotation);atmosphere.scale.setScalar(pos.r*1.028);atmosphereMaterial.uniforms.opacity.value=material.uniforms.opacity.value;atmosphereMaterial.uniforms.lightDir.value.copy(light);
   if(clouds){clouds.visible=mesh.visible;clouds.position.copy(mesh.position);clouds.rotation.copy(mesh.rotation);clouds.rotation.y+=elapsed*.0009*b.cloudSpeed;clouds.scale.setScalar(pos.r*1.006);clouds.material.uniforms.opacity.value=material.uniforms.opacity.value;clouds.material.uniforms.lightDir.value.copy(light)}
   if(ring){ring.visible=mesh.visible;ring.position.copy(mesh.position);ring.scale.setScalar(pos.r);ring.material.uniforms.opacity.value=pos.opacity;ring.material.uniforms.lightDir.value.copy(light)}
  }
  renderer.render(scene,camera);raf=requestAnimationFrame(tick);
 };raf=requestAnimationFrame(tick);
 return ()=>{disposed=true;cancelAnimationFrame(raf);window.removeEventListener('resize',resizeResolution);environment.dispose();sphere.dispose();bank.dispose();bodies.forEach(b=>{b.material.dispose();b.atmosphereMaterial.dispose();b.clouds?.material.dispose();if(b.ring){b.ring.geometry.dispose();b.ring.material.dispose()}});renderer.dispose();renderer.domElement.remove()};
}
