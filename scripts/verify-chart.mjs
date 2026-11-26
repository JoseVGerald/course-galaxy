import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';

const hash=value=>createHash('sha256').update(value).digest('hex');
const main=fs.readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
const bars=main.slice(main.indexOf('   <header className='),main.indexOf('   {chat&&'));
assert.equal(hash(bars),'8ca8e5d06f084f8f0183b5b7269e857569eca3582dc138208cbcbdeb8e9d908b','Navigation bars changed');
assert.equal(hash(fs.readFileSync(new URL('../src/style.css',import.meta.url))),'a34d5e7abe4e4ab721565cf08a0a62fb695e842432a3f6c3f61b98265ba7f8d0','Protected original stylesheet changed');
assert.ok(!main.includes('reference-environment')&&!main.includes('/assets/labels/'),'Screenshot layers must not be loaded by the chart');
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {chartViewport}=await server.ssrLoadModule('/src/viewport.ts');
 for(const [w,h]of [[1920,1080],[2560,1080],[3440,1440],[1440,900],[900,1440]]){
  const v=chartViewport(w,h);
  assert.ok(Math.abs(v.width*v.scale-w)<1e-8&&Math.abs(v.height*v.scale-h)<1e-8,'Stage must fill viewport');
  assert.ok(Math.abs(v.offsetX+960-v.width/2)<1e-8&&Math.abs(v.offsetY+540-v.height/2)<1e-8,'Scene remains centered');
  // A wheel event at chart center maps back to the same world anchor.
  assert.ok(Math.abs(w/2/v.scale-v.offsetX-960)<1e-8&&Math.abs(h/2/v.scale-v.offsetY-540)<1e-8,'Pointer projection must follow viewport');
 }
 const {planets}=await server.ssrLoadModule('/src/data.ts');
 const {view,placement,focusPose,overviewPose}=await server.ssrLoadModule('/src/engine.ts');
 const {missionPath}=await server.ssrLoadModule('/src/paths.ts');
 const {createPlanetMaterial}=await server.ssrLoadModule('/src/planet-materials.ts');
 const {blenderTypeFor,blenderDef,mapUrl}=await server.ssrLoadModule('/src/blender-planets.ts');
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
 let routeCount=0;
 for(const p of planets){
  // Every body is a baked Blender planet: it needs a type, a colour map, and ring/cloud maps where its type has them.
  const type=blenderTypeFor[p.name],def=type&&blenderDef(p.name);assert.ok(type&&def,`${p.name} needs a Blender planet type`);assert.ok(mapUrl(type,'color'),`${p.name}: no baked colour map for ${type}`);
  if(def.clouds>0)assert.ok(mapUrl(type,'clouds'),`${p.name}: ${type} has no cloud map`);if(def.rings)assert.ok(mapUrl(type,'rings'),`${p.name}: ${type} has no ring map`);
  const material=createPlanetMaterial(def,p.r);assert.ok(/uniform sampler2D colorMap/.test(material.fragmentShader),'Planet shader must sample the baked colour map');material.dispose();
  Object.assign(view,overviewPose,{focus:null});const home=placement(p);near(home.x,p.x);near(home.y,p.y);near(home.r,p.r);
  const pose=focusPose(p);Object.assign(view,pose,{focus:p.name});const focused=placement(p);near(focused.r,p.r*pose.zoom);
  const anchor=planets.find(other=>other!==p),other=placement(anchor);
  near(other.x-focused.x,(anchor.x-p.x)*view.zoom);near(other.y-focused.y,(anchor.y-p.y)*view.zoom);
  // Return from an arbitrary panned and zoomed state must recover the overview.
  view.panX=216;view.panY=-103;view.zoom*=1.31;
  Object.assign(view,overviewPose,{focus:null});const restored=placement(p);near(restored.x,home.x);near(restored.y,home.y);near(restored.r,home.r);
  for(const [a,b]of p.edges){assert.ok(p.nodes[a]&&p.nodes[b],p.name+' has a dangling edge');const d=missionPath(p,p.nodes[a],p.nodes[b]);assert.ok(!/NaN|Infinity/.test(d),p.name+' has invalid path coordinates');const nums=d.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi).map(Number);near(nums[0],p.nodes[a].x*345);near(nums[1],p.nodes[a].y*345);near(nums.at(-2),p.nodes[b].x*345);near(nums.at(-1),p.nodes[b].y*345);routeCount++}
 }
 Object.assign(view,overviewPose,{focus:null});
 console.log(`Passed: protected navigation, live interface layers, Blender-baked planet maps, ${planets.length} planet camera mappings, overview restoration, and ${routeCount} route endpoints.`);
}finally{await server.close()}
