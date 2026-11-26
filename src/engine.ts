import * as THREE from 'three';
import {planets,systemOverviewNames,systemMoonParents, type Planet} from './data';
import {addEnvironment} from './environment';
import {chartViewport} from './viewport';
import {createLandmarks} from './planet-landmarks';
import {createPlanetMaterial,createAtmosphereMaterial,createCloudMaterial,createRingMaterial} from './planet-materials';
export type View={focus:string|null;detail:string|null;amount:number;frame:number;zoom:number;cameraX:number;cameraY:number;panX:number;panY:number;hover:string|null;motion:boolean};
export type CameraPose=Pick<View,'amount'|'frame'|'zoom'|'cameraX'|'cameraY'|'panX'|'panY'>;
export const view:View={focus:null,detail:null,amount:0,frame:0,zoom:1,cameraX:0,cameraY:0,panX:0,panY:0,hover:null,motion:true};
export const overviewPose:CameraPose={amount:0,frame:0,zoom:1,cameraX:0,cameraY:0,panX:0,panY:0};
export const framePose:CameraPose={amount:0,frame:1,zoom:.78,cameraX:960*.22,cameraY:540*.22,panX:0,panY:0};
export function zoomOutPose(planetSelected:boolean):CameraPose{return {...(planetSelected?overviewPose:framePose)}}
const focusFraming:Record<string,[number,number,number]>={Venus:[870,605,350],Earth:[1080,552,365],Jupiter:[763,509,364],Europa:[975,552,345],Mercury:[1030,545,345],Saturn:[960,555,302],Uranus:[960,555,315],Neptune:[1040,550,345],Pluto:[1060,550,320],Sedna:[1040,550,330],Void:[965,540,240]};
export function focusPose(p:Planet):CameraPose {const [x,y,r]=focusFraming[p.name]||[1030,550,330];const zoom=r/p.r;return {amount:1,frame:0,zoom,cameraX:x-p.x*zoom,cameraY:y-p.y*zoom,panX:0,panY:0}}
export function currentPose():CameraPose{return {amount:view.amount,frame:view.frame,zoom:view.zoom,cameraX:view.cameraX,cameraY:view.cameraY,panX:view.panX,panY:view.panY}}
export function placement(p:Planet){
 const focusedMoonHost=systemMoonParents[view.focus||''];
 const focusedHostMoon=systemMoonParents[p.name]===view.focus;
 return {x:p.x*view.zoom+view.cameraX+view.panX,y:p.y*view.zoom+view.cameraY+view.panY,r:p.r*view.zoom,opacity:p.name===view.focus||p.name===focusedMoonHost||focusedHostMoon?1:Math.max(0,1-view.amount*1.22)};
}
function globeGeometry(source:THREE.SphereGeometry){
 const geometry=source.clone(),position=geometry.getAttribute('position'),points=new Float32Array(position.count*3),radii=new Float32Array(position.count);
 for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i),z=position.getZ(i),length=Math.hypot(x,y,z)||1;points[i*3]=x/length;points[i*3+1]=y/length;points[i*3+2]=z/length;radii[i]=1}
 geometry.setAttribute('surfacePoint',new THREE.BufferAttribute(points,3));geometry.setAttribute('surfaceRadius',new THREE.BufferAttribute(radii,1));return geometry;
}
export function createEngine(container:HTMLElement,onReady:()=>void,onError:()=>void){
 let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch{onError();return ()=>{}}
 renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-hidden','true');container.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-960,960,540,-540,.1,3000);camera.position.z=1400;
 scene.add(new THREE.AmbientLight('#a0b4b6',.7));const structureLight=new THREE.DirectionalLight('#f1debb',2.1);structureLight.position.set(-700,650,800);scene.add(structureLight);
 const environment=addEnvironment(scene);
 let viewport=chartViewport(innerWidth,innerHeight);
 const resizeResolution=()=>{viewport=chartViewport(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio*viewport.scale,1.8));renderer.setSize(viewport.width,viewport.height);camera.left=-viewport.width/2;camera.right=viewport.width/2;camera.top=viewport.height/2;camera.bottom=-viewport.height/2;camera.updateProjectionMatrix();environment.resize(viewport.width,viewport.height)};
 resizeResolution();window.addEventListener('resize',resizeResolution);
 const sphere=new THREE.SphereGeometry(1,128,96);
 const globeSphere=globeGeometry(sphere),cloudSphere=globeGeometry(sphere);
 const objects=planets.map(p=>{
  const {material,profile}=createPlanetMaterial(p);
  const landmarks=createLandmarks(p);scene.add(landmarks.group);
  const mesh=new THREE.Mesh(globeSphere,material);mesh.rotation.set(p.name==='Earth'?.24:.06,p.name==='Earth'?-1.12:p.name==='Jupiter'?1.20:.8,p.name==='Earth'?-.12:-.07);scene.add(mesh);
  const atmosphereMaterial=createAtmosphereMaterial(profile),atmosphere=new THREE.Mesh(sphere,atmosphereMaterial);atmosphere.renderOrder=3;scene.add(atmosphere);
  let clouds:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>|undefined;
  if(p.name==='Earth'){clouds=new THREE.Mesh(cloudSphere,createCloudMaterial());clouds.renderOrder=2;scene.add(clouds)}
  let ring:THREE.Mesh|undefined;
  if(p.rings){const geometry=new THREE.RingGeometry(1.25,2.05,240);
   ring=new THREE.Mesh(geometry,createRingMaterial(p));ring.rotation.set(p.name==='Uranus'?1.0:1.29,.25,p.name==='Uranus'?1.12:-.08);scene.add(ring);
  }
  return {p,mesh,material,ring,atmosphere,atmosphereMaterial,clouds,landmarks,initial:mesh.rotation.y,air:profile.air};
 });
 let raf=0,start=performance.now(),last=start,elapsed=0,firstFrame=true;
 const tick=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;if(view.motion)elapsed+=dt;
  environment.update(elapsed,view);
  for(const {p,mesh,material,ring,atmosphere,atmosphereMaterial,clouds,landmarks,initial,air} of objects){const pos=placement(p),detailActive=view.detail===p.name,focusedMoon=systemMoonParents[view.focus||'']===p.name,overviewVisible=systemOverviewNames.has(p.name)||view.zoom>1.12||!!view.focus,reveal=Math.max(20,p.r*1.18),detailProgress=detailActive?Math.max(0,Math.min(1,(pos.r-reveal)/(p.r*.75))):0;mesh.position.set(pos.x-960,540-pos.y,0);mesh.scale.setScalar(pos.r);mesh.visible=overviewVisible&&pos.opacity>.002&&pos.x+pos.r>-100-viewport.offsetX&&pos.x-pos.r<2020+viewport.offsetX&&pos.y+pos.r>-100-viewport.offsetY&&pos.y-pos.r<1180+viewport.offsetY;const bodyOpacity=pos.opacity*(view.hover&&view.hover!==p.name&&view.focus!==p.name ? .70 : 1);material.uniforms.opacity.value=bodyOpacity;material.uniforms.time.value=elapsed;material.uniforms.radius.value=pos.r;
   landmarks.group.position.copy(mesh.position);landmarks.group.scale.setScalar(pos.r);landmarks.update(bodyOpacity,elapsed);
   mesh.rotation.y=initial+elapsed*(view.focus===p.name ? .0012 : .002+detailProgress*.007);
   // Light changes with the chart focus, as in the manual zoom in the recording.
   const light=material.uniforms.lightDir.value as THREE.Vector3;const angle=Math.atan2(540-p.y,965-p.x);const sx=Math.cos(angle)*.8,sy=Math.sin(angle)*.8;
   const selectedLight:Record<string,number[]>={Earth:[-.72,.60,.14],Venus:[.28,.64,.91],Mercury:[.85,.50,.12],Jupiter:[.78,-.28,-.04],Europa:[.74,.15,-.06],Saturn:[.60,.70,.24]};
   const f=selectedLight[p.name]||[-.65,.5,.40],lightAmount=view.focus===p.name||focusedMoon?Math.max(view.amount,.42):detailProgress*.42;light.set(sx*(1-lightAmount)+f[0]*lightAmount,sy*(1-lightAmount)+f[1]*lightAmount,.50*(1-lightAmount)+f[2]*lightAmount);
   atmosphere.visible=mesh.visible&&air>0;atmosphere.position.copy(mesh.position);atmosphere.rotation.copy(mesh.rotation);atmosphere.scale.setScalar(pos.r*1.028);atmosphereMaterial.uniforms.opacity.value=material.uniforms.opacity.value;atmosphereMaterial.uniforms.lightDir.value.copy(light);
   if(clouds){clouds.visible=mesh.visible;clouds.position.copy(mesh.position);clouds.rotation.copy(mesh.rotation);clouds.rotation.y+=elapsed*.00065;clouds.scale.setScalar(pos.r*1.004);clouds.material.uniforms.opacity.value=material.uniforms.opacity.value;clouds.material.uniforms.time.value=elapsed;clouds.material.uniforms.lightDir.value.copy(light)}
   if(ring){ring.visible=mesh.visible;ring.position.copy(mesh.position);ring.scale.setScalar(pos.r);const rm=ring.material as THREE.ShaderMaterial;rm.uniforms.opacity.value=.48*pos.opacity;rm.uniforms.lightDir.value.copy(light)}
  }
  renderer.render(scene,camera);if(firstFrame){firstFrame=false;onReady()}raf=requestAnimationFrame(tick);
 };raf=requestAnimationFrame(tick);
 return ()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resizeResolution);environment.dispose();sphere.dispose();globeSphere.dispose();cloudSphere.dispose();objects.forEach(o=>{o.material.dispose();o.atmosphereMaterial.dispose();o.landmarks.dispose();o.clouds?.material.dispose();if(o.ring){o.ring.geometry.dispose();(o.ring.material as THREE.Material).dispose()}});renderer.dispose();renderer.domElement.remove()};
}
