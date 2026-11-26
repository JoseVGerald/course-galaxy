import referenceLayouts from './reference-layouts.json';
import {applyReferenceNetwork} from './reference-networks';
export type Mission={name:string;x:number;y:number;type:string;kind:string;level:string;to?:string|null;locked?:boolean;faction?:string;tileset?:string};
export type Planet={name:string;x:number;y:number;r:number;color:string;texture:string;rings?:boolean;nodes:Mission[];edges:number[][];faction:string};
// The first system view is curated around three inner worlds and eight
// distinct outer destinations. Moons render as nearby satellite bodies.
export const systemCoreNames=new Set(['Mercury','Venus','Earth']);
export const systemOuterNames=new Set(['Mars','Jupiter','Ceres','Saturn','Uranus','Neptune','Pluto','Sedna']);
export const systemMoonParents:Record<string,string>={Deimos:'Mars',Phobos:'Mars',Europa:'Jupiter',Lua:'Earth'};
export const systemOverviewNames=new Set([...systemCoreNames,...systemOuterNames,'Deimos','Phobos','Europa','Lua']);
export const displayNames:Record<string,string>={
 Mercury:'Fundamental AI Concepts',Venus:'Practical AI Tools and Techniques',Earth:'Ethical AI Usage',
 Mars:'AI in Education',Jupiter:'AI in Business',Ceres:'AI in Healthcare',Saturn:'AI in Creativity and Design',
 Uranus:'AI in Research and Science',Neptune:'AI in Engineering and Robotics',Pluto:'AI in Everyday Life',Sedna:'The Future of AI'
};
export const displayNameLines:Record<string,string[]>={
 Mercury:['Fundamental AI','Concepts'],
 Venus:['Practical AI','Tools and Techniques'],
 Saturn:['AI in Creativity','and Design'],
 Uranus:['AI in Research','and Science'],
 Neptune:['AI in Engineering','and Robotics']
};
function nodes(rows:string):Mission[]{return rows.split(';').map(row=>{const [name,x,y,type='Exterminate',kind='mission',to]=row.split('|');return {name,x:+x,y:+y,type,kind,to,level:'4–8'}})}
const layouts:Record<string,string>={
Venus:'Malva|-1.07|-1.29|Survival|dark;Montes|-.58|-1.29;Ishtar|-.81|-.99|Sabotage;Linea|.30|-.79|Rescue|dark;Tessera|.65|-.44|Defense;E Gate|.94|-.12;Unda|.18|0|Spy;Kiliken|-.20|.32|Excavation;Venera|-.55|-.30|Capture;Fossa|-1.14|-.42|Assassination|boss;Aphrodite|-.89|.01|Mobile Defense;Cytherean|-.81|.72|Interception|dark;Romula|-.10|.91|Defense|dark;V Prime|.75|.90|Survival;Mercury Junction|-1.14|-.06|Junction|junction|Mercury;To Mercury|-1.48|-.15||travel|Mercury;To Earth|1.40|-.38||travel|Earth;Vesper Relay|.94|-.91|Relay|relay',
Earth:'Eurasia|.34|-.80|Mobile Defense;Plains of Eidolon|.05|-.62|Free Roam|open;Cetus|-.15|-.52|Town|relay;Coba|.74|-.47|Defense|dark;Everest|.35|-.24|Excavation;Cervantes|.87|-.10|Sabotage;Tikal|.49|.25|Excavation|dark;Oro|.88|.43|Assassination|boss;Gaia|-.13|.69|Interception;Cambria|-.47|.85|Spy;Lith|-.74|.39|Defense;Mantle|-.42|.02|Capture;Mariana|-.70|-.31;E Prime|-.95|-.16;Iron Wake|-.88|.04|Town|relay;Pacific|.61|1.05|Rescue;Mars Junction|-.28|-1.04|Junction|junction|Mars;To Mars|-.65|-1.28||travel|Mars;Venus Junction|-.30|1.00|Junction|junction|Venus;To Venus|-.80|1.35||travel|Venus;Strata Relay|-.92|-1.04|Relay|relay;To Lua|1.34|.04||travel|Lua',
Mercury:'Apollodorus|-.70|-1.14|Survival;Boethius|-.79|-.49|Mobile Defense|dark;Terminus|-.52|.35;Caloris|-.02|.89|Rescue;Pantheon|.70|.98;Elion|.73|.27|Capture;Suisei|1.09|-.42|Spy;Odin|1.53|-.55|Interception;Tolstoj|1.03|-.98|Assassination|boss;Lares|-.24|-1.12|Defense;Larunda Relay|1.28|.49|Relay|relay;To Venus|1.35|1.08||travel|Venus',
Jupiter:'Carme|-.39|-.80|Mobile Defense;Metis|.53|-.74|Rescue;Ananke|-.12|-.49|Capture;Carpo|-.90|-.17;Callisto|.10|-.10|Interception;Cameria|.45|-.20|Survival|dark;Elara|.82|-.13|Survival|dark;Amalthea|-.31|.09|Spy;Sinai|-.10|.35|Defense|dark;Thebe|-.73|.54|Sabotage;Io|.42|.53|Defense|dark;Themisto|-.16|.83|Assassination|boss;Adrastea|1.1|.27|Sabotage;Galilea|-1.02|.94|Sabotage;Europa Junction|-1.17|0|Junction|junction|Europa;To Europa|-1.36|.07||travel|Europa;Saturn Junction|.07|1.10|Junction|junction|Saturn;To Saturn|.12|1.29||travel|Saturn;To Ceres|.82|-1.14||travel|Ceres',
Europa:'Armaros|-.67|-1.04;Naamah|.01|-.84|Assassination|boss;Kokabiel|.64|-.60|Sabotage;Abaddon|.11|-.53|Capture;Larzac|-.26|-.30|Defense|dark;Cholistan|-.71|-.54|Excavation|dark;Baal|-.89|.08;Paimon|-.49|.33|Defense;Sorath|-.45|.76|Hijack;Ose|.13|.92|Interception|dark;Morax|.66|.60|Mobile Defense;Valefor|.49|.13|Excavation;Orias|.91|.04|Rescue|dark;To Jupiter|1.30|.04||travel|Jupiter'};
const edgeSets:Record<string,number[][]>={Venus:[[0,2],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[6,8],[8,9],[9,10],[10,7],[7,11],[11,12],[12,13],[13,5],[10,14],[14,15],[5,16]],Earth:[[17,16],[16,0],[0,2],[2,1],[2,11],[11,12],[12,13],[11,10],[10,9],[9,8],[8,11],[8,15],[15,21],[4,5],[4,3],[3,1],[6,7],[7,5],[9,18],[18,19],[13,20]],Mercury:[[0,1],[1,9],[9,8],[8,6],[6,7],[7,10],[10,11],[11,4],[4,5],[5,6],[4,3],[3,2],[2,1]],Jupiter:[[0,1],[1,2],[2,4],[4,5],[1,6],[6,12],[12,10],[10,11],[11,9],[9,3],[3,0],[2,7],[7,8],[7,9],[9,13],[3,14],[14,15],[11,16],[16,17],[1,18]],Europa:[[0,1],[1,2],[2,3],[3,4],[5,6],[6,8],[7,8],[8,9],[9,10],[10,11],[11,2],[10,12],[12,2],[12,13]]};
const missionNames:Record<string,string[]>={Mars:['Olympus','Tharsis','Syrtis','Spear','Augustus','Alator','Ara','Gradivus','Vallis','Hellas','War','Wahiba'],Saturn:['Cassini','Anthe','Numa','Helene','Telesto','Dione','Rhea','Titan','Calypso','Tethys','Enceladus','Sargas Ruk'],Uranus:['Ariel','Umbriel','Ophelia','Cordelia','Sycorax','Desdemona','Rosalind','Stephano','Puck','Caelus','Titania','Assur'],Neptune:['Triton','Nereid','Proteus','Galatea','Despina','Larissa','Sao','Yursa','Kelashin','Laomedeia','Psamathe','Salacia'],Pluto:['Hydra','Nix','Outer Terminus','Oceanum','Hieracon','Sechura','Regna','Palus','Cerberus','Acheron','Minthe','Hades'],Sedna:['Yam','Merrow','Berehynia','Rusalka','Naga','Adaro','Selkie','Marid','Nakki','Vodyanoi','Kelpie','Kappa'],Ceres:['Casta','Kiste','Cinxia','Bode','Draco','Lex','Nuovo','Pallas','Gabii','Seimeni','Exta','Ker'],Eris:['Naeglar','Xini','Isos','Kala-azar','Akkad','Nimus','Saxis','Brugia','Zabala','Oestrus','Mutalist Alad V','Solium'],Phobos:['Roche','Skyresh','Stickney','Gulliver','Shklovsky','Sharpless','Kepler','Iliad','Memphis','Zeugma'],Lua:['Apollo','Copernicus','Grimaldi','Stöfler','Pavlov','Plato','Tycho','Zeipel'],Void:['Teshub','Hepit','Taranis','Tiwaz','Ani','Stribog','Ukko','Oxomoco','Marduk','Aten','Mithra','Mot'],Deimos:['Horend','Phlegyas','Formido','Dirus','Hyf','Magnacidium','Terrorem','Exequias','Cambion Drift','Necralisk'],'Kuva Fortress':['Taveuni','Dakata','Pago','Koro','Tamu','Nabuk','Rotuma','Garus'],Derelict:['Capture','Defense','Exterminate','Survival','Assassination','Sabotage'],Dojo:['Clan Dojo','Dry Dock','Observatory','Trading Post'],Sanctuary:['Sanctuary Onslaught','Elite Sanctuary Onslaught']};
function p(name:string,x:number,y:number,r:number,color:string,texture:string,rings=false):Planet {const list=layouts[name]?nodes(layouts[name]):(missionNames[name]||['Navigation']).map((n,i,arr)=>{const a=-2.2+i/arr.length*Math.PI*2,rad=i%3===1?.54:.98;return {name:n,x:Math.cos(a)*rad,y:Math.sin(a)*rad,type:['Exterminate','Survival','Defense','Spy','Capture','Sabotage'][i%6],kind:i%5===3?'dark':'mission',level:'15–25'}});return {name,x:965+(x-965)*.96,y:540+(y-540)*.96,r,color,texture,rings,nodes:list,edges:edgeSets[name]||list.map((_,i)=>[i,(i+1)%list.length]),faction:['Eris','Deimos'].includes(name)?'Infested':name==='Void'?'Orokin':['Venus','Jupiter','Europa','Neptune','Pluto'].includes(name)?'Corpus':'Grineer'}}
// The overview uses a loose inner trio and an intentionally irregular outer
// system. The values stay in the same 1920×1080 chart space as traced routes.
export const planets=[
 p('Sedna',1110,165,20,'#705c42','sedna'),
 p('Ceres',706,183,24,'#655746','ceres'),
 p('Phobos',1316,370,12,'#8e7666','phobos'),
 p('Mars',1304,361,30,'#be5131','mars'),
 p('Jupiter',535,375,49,'#ac8655','jupiter'),
 p('Europa',552,368,19,'#8f7c51','europa'),
 p('Mercury',815,545,27,'#af753f','mercury'),
 p('Venus',1033,666,33,'#d79d58','venus'),
 p('Earth',1054,413,36,'#5c8fbb','earth'),
 p('Lua',1042,407,10,'#9d9690','moon'),
 p('Pluto',1588,568,27,'#8e9b9b','pluto'),
 p('Saturn',620,818,42,'#c6a56c','saturn',true),
 p('Uranus',932,915,40,'#4eafc8','uranus',true),
 p('Neptune',1358,824,40,'#33548a','neptune'),
 p('Deimos',1292,346,11,'#a14a29','deimos')
];

// Pull the outer destinations inward by a small amount without changing their
// overall directions or the loose, non-circular layout.
for(const world of planets.filter(p=>systemOuterNames.has(p.name))){
 world.x=965+(world.x-965)*.91;
 world.y=540+(world.y-540)*.91;
}

// Keep moon models adjacent to their host planets in the system view while
// retaining their own canonical IDs, map data, textures, and node networks.
const moonOffsets:Record<string,[number,number]>={Deimos:[1.23,-.30],Phobos:[1.25,.35],Europa:[-1.22,.25],Lua:[1.20,.28]};
for(const moon of planets.filter(p=>systemMoonParents[p.name])){
 const host=planets.find(p=>p.name===systemMoonParents[moon.name]),offset=moonOffsets[moon.name];
 if(host&&offset){moon.x=host.x+offset[0]*(host.r+moon.r);moon.y=host.y+offset[1]*(host.r+moon.r)}
}
export const motion={focus:1120,return:920,hover:140,tooltipDelay:160,nodeReveal:.58,labelReveal:.78,nodeStagger:22};

// Reference-traced geometry replaces provisional ring layouts. Missing images
// do not receive invented nodes. Mission metadata and topology come from the
// WARFRAME Wiki; coordinates come from source frames. Labels are live text.
for(const planet of planets){
 const layout=(referenceLayouts as Record<string,{nodes:Mission[];edges:number[][]}>)[planet.name];
 if(!layout){planet.nodes=[];planet.edges=[];continue}
 const known=['Mercury','Venus','Earth','Jupiter','Europa'].includes(planet.name);
 if(known){
  planet.nodes=planet.nodes.map(n=>{const exact=layout.nodes.find(v=>v.name===n.name);return exact?{...n,...exact,to:exact.to||n.to}:n});
 }else {planet.nodes=layout.nodes;planet.edges=layout.edges;}
}
for(const planet of planets)applyReferenceNetwork(planet);
// Curated, reciprocal trunk routes for the current constellation. Each route
// leaves from the side facing its destination; paired chart nodes preserve a
// continuous route from the local junction to the destination chart.
const systemRoutes:[string,string][]=[
 ['Mercury','Venus'],['Venus','Earth'],['Earth','Mercury'],
 ['Earth','Mars'],['Jupiter','Ceres'],['Jupiter','Saturn'],['Saturn','Uranus'],
 ['Uranus','Neptune'],['Neptune','Pluto'],['Mars','Sedna']
];
const satelliteJunctions:Record<string,string[]>={Mars:['Phobos','Deimos'],Jupiter:['Europa'],Earth:['Lua']};
for(const planet of planets){
 // Drop every previous interplanetary exit before regenerating a single
 // reciprocal route set. Moon junctions are retained as host-map locations.
 const moonNames=new Set((satelliteJunctions[planet.name]||[]).map(name=>`${name} Junction`));
 const stale=planet.nodes.map((node,index)=>({node,index})).filter(({node})=>
  node.kind==='travel'||node.name.startsWith('To ')||
  ((node.kind==='junction'||node.name.endsWith(' Junction'))&&!moonNames.has(node.name))||
  (!!node.to&&!moonNames.has(node.name))
 );
 const remove=new Set(stale.map(({index})=>index));
 const remap:number[]=[];let next=0;planet.nodes.forEach((_,index)=>{if(!remove.has(index))remap[index]=next++});
 planet.edges=planet.edges.filter(([a,b])=>!remove.has(a)&&!remove.has(b)).map(([a,b])=>[remap[a],remap[b]]);
 planet.nodes=planet.nodes.filter((_,index)=>!remove.has(index));
 for(const node of planet.nodes.filter(n=>moonNames.has(n.name))){node.kind='mission';node.to=undefined;node.type='Satellite Junction';node.faction='Tenno';}
}
function addDeparture(source:Planet,target:Planet){
 const dx=target.x-source.x,dy=target.y-source.y,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
 const junction:Mission={name:`${target.name} Junction`,x:ux*1.02,y:uy*1.02,type:'Junction',kind:'junction',to:target.name,level:''};
 const travel:Mission={name:`To ${target.name}`,x:ux*1.38,y:uy*1.38,type:'',kind:'travel',to:target.name,level:''};
 const junctionIndex=source.nodes.length;source.nodes.push(junction);const travelIndex=source.nodes.length;source.nodes.push(travel);
 const candidates=source.nodes.slice(0,junctionIndex).map((node,i)=>({i,d:Math.hypot(node.x-junction.x,node.y-junction.y)})).filter(v=>source.nodes[v.i].kind!=='travel').sort((a,b)=>a.d-b.d);
 if(candidates[0])source.edges.push([candidates[0].i,junctionIndex]);source.edges.push([junctionIndex,travelIndex]);
}
for(const [from,to] of systemRoutes){const source=planets.find(p=>p.name===from),target=planets.find(p=>p.name===to);if(source&&target){addDeparture(source,target);addDeparture(target,source)}}
function addSatelliteLocation(parentName:string,moonName:string){
 const parent=planets.find(p=>p.name===parentName),moon=planets.find(p=>p.name===moonName);if(!parent||!moon)return;
 const name=`${moonName} Junction`,x=(moon.x-parent.x)/parent.r,y=(moon.y-parent.y)/parent.r;
 let satellite=parent.nodes.find(node=>node.name===name);
 if(satellite){satellite.x=x;satellite.y=y;satellite.kind='mission';satellite.type='Satellite Junction';satellite.to=undefined;satellite.faction='Tenno';return}
 satellite={name,x,y,type:'Satellite Junction',kind:'mission',level:'',faction:'Tenno',tileset:'Solar Rail'};
 const index=parent.nodes.length;parent.nodes.push(satellite);
 const neighbors=parent.nodes.slice(0,index).map((node,i)=>({i,d:Math.hypot(node.x-x,node.y-y)})).sort((a,b)=>a.d-b.d);
 if(neighbors[0])parent.edges.push([neighbors[0].i,index]);
}
// Keep each moon's body and a single connected junction location in its host
// map. Their standalone solar-system travel links are deliberately removed.
addSatelliteLocation('Mars','Phobos');addSatelliteLocation('Mars','Deimos');
addSatelliteLocation('Jupiter','Europa');addSatelliteLocation('Earth','Lua');
