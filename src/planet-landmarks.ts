import * as THREE from 'three';
import type {Planet} from './data';

// Live silhouettes and orbital structures complement the GPU surface. All
// geometry is authored here; no ship, satellite or planetary bitmap is loaded.
export function createLandmarks(planet:Planet){
 const group=new THREE.Group(),geometries:THREE.BufferGeometry[]=[],materials:THREE.MeshStandardMaterial[]=[];
 const metal=new THREE.MeshStandardMaterial({color:'#665e4b',metalness:.68,roughness:.56,transparent:true});
 const rock=new THREE.MeshStandardMaterial({color:planet.name==='Deimos'?'#5e241b':'#57504a',roughness:.95,transparent:true});
 const dark=new THREE.MeshStandardMaterial({color:'#202b2b',metalness:.5,roughness:.65,transparent:true});
 const glow=new THREE.MeshStandardMaterial({color:'#371b16',emissive:'#9d2716',emissiveIntensity:1.7,transparent:true});
 materials.push(metal,rock,dark,glow);
 function mesh(geometry:THREE.BufferGeometry,material:THREE.MeshStandardMaterial,x=0,y=0,z=0){geometries.push(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);group.add(m);return m}
 let seed=planet.name.split('').reduce((s,c)=>s+c.charCodeAt(0),17);const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 if(planet.name==='Lua'){
  for(const rotation of [[.34,.18,0],[1.48,.04,.12],[.1,1.42,.05]]){const ring=mesh(new THREE.TorusGeometry(1.13,.008,5,160),metal);ring.rotation.set(...rotation as [number,number,number])}
  for(let i=0;i<26;i++){const a=random()*Math.PI*2,r=1.04+random()*.34,s=.02+random()*.055;const m=mesh(new THREE.DodecahedronGeometry(s,0),rock,Math.cos(a)*r,Math.sin(a)*r,(random()-.5)*.5);m.rotation.set(random()*3,random()*3,random()*3)}
 }
 if(planet.name==='Kuva Fortress'){
  for(let i=0;i<24;i++){const y=-1.0+i/23*1.9,x=Math.sin(i*1.8)*.34,z=(random()-.5)*.37;const m=mesh(new THREE.DodecahedronGeometry(.16+random()*.18,1),rock,x,y,z);m.scale.set(1+random(),.55+random(),.7+random())}
  for(let i=0;i<12;i++){const m=mesh(new THREE.BoxGeometry(.20+random()*.48,.065,.27+random()*.24),dark,Math.sin(i*2.1)*.28,-.85+i*.16,.26);m.rotation.z=(random()-.5)*.28;const rim=mesh(new THREE.BoxGeometry(.34,.014,.04),metal,m.position.x,m.position.y+.035,.44);rim.rotation.z=m.rotation.z}
  mesh(new THREE.CylinderGeometry(.035,.06,2.7,8),metal,.08,-.05,.32);
  for(let i=0;i<7;i++)mesh(new THREE.SphereGeometry(.024,8,6),glow,(random()-.5)*.46,(random()-.5)*1.7,.47);
 }
 if(planet.name==='Deimos'){
  for(let i=0;i<13;i++){const a=-1.7+i*.30,root=new THREE.Vector3(Math.cos(a)*.63,Math.sin(a)*.63,.05);const tip=new THREE.Vector3(Math.cos(a)*(1.15+random()*.55),Math.sin(a)*(1.15+random()*.45),-.20);const curve=new THREE.CubicBezierCurve3(root,new THREE.Vector3(root.x*1.45,root.y*.6,.16),new THREE.Vector3(tip.x*.7,tip.y+.31,-.1),tip);mesh(new THREE.TubeGeometry(curve,32,.018+random()*.022,5,false),rock);if(i%3===0)mesh(new THREE.TubeGeometry(curve,32,.006,4,false),glow)}
 }
 if(['Ceres','Phobos','Sedna','Deimos','Kuva Fortress'].includes(planet.name))for(let i=0;i<35;i++){const a=random()*Math.PI*2,r=1.14+random()*.55,s=.008+random()*.035;const m=mesh(new THREE.DodecahedronGeometry(s,0),rock,Math.cos(a)*r,Math.sin(a)*r,(random()-.5)*.65);m.rotation.set(random()*3,random()*3,random()*3)}
 return {group,update(opacity:number,time:number){group.visible=opacity>.003&&group.children.length>0;for(const material of materials)material.opacity=opacity;group.rotation.z=Math.sin(time*.02)*.006},dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}};
}
