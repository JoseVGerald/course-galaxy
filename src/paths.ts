import type {Planet,Mission} from './data';
import {referenceHandles} from './reference-networks';

type Curve=[number,number,number,number];
// Individually traced cubic handles, in each supplied image's pixel coordinates.
// These are geometry, not rasterized connection lines.
const traced:Record<string,{origin:[number,number,number];curves:Record<string,Curve>}>={
 Venus:{origin:[870,605,350],curves:{
  'Malva|Ishtar':[530,201,542,242], 'Montes|Ishtar':[623,158,641,240],
  'Ishtar|Linea':[704,280,921,291], 'Linea|Tessera':[1041,350,1056,417],
  'Tessera|E Gate':[1142,485,1151,544], 'E Gate|Unda':[1119,581,1003,588],
  'Unda|Kiliken':[880,628,860,677], 'Unda|Venera':[845,579,773,508],
  'Venera|Fossa':[602,482,530,462], 'Fossa|Aphrodite':[483,502,535,575],
  'Aphrodite|Kiliken':[642,663,740,685], 'Kiliken|Cytherean':[734,764,653,822],
  'Cytherean|Romula':[657,919,766,942], 'Romula|V Prime':[948,976,1075,951],
  'V Prime|E Gate':[1170,823,1176,662], 'Aphrodite|Mercury Junction':[526,594,489,584],
  'Mercury Junction|To Mercury':[438,583,393,566], 'E Gate|To Earth':[1249,534,1304,502]
 }},
 Europa:{origin:[332,405,300],curves:{
  'Armaros|Naamah':[191,99,279,121], 'Naamah|Kokabiel':[409,157,477,177],
  'Kokabiel|Abaddon':[489,231,411,225], 'Abaddon|Larzac':[321,262,284,287],
  'Cholistan|Baal':[83,292,52,370], 'Baal|Sorath':[62,517,121,592],
  'Paimon|Sorath':[184,545,169,591], 'Sorath|Ose':[240,659,299,687],
  'Ose|Morax':[428,657,491,620], 'Morax|Valefor':[538,540,473,493],
  'Valefor|Kokabiel':[480,353,555,286], 'Morax|Orias':[586,527,589,460],
  'Orias|Kokabiel':[595,347,563,272], 'Orias|To Jupiter':[648,414,683,417]
 }},
 Earth:{origin:[541,485,480],curves:{
  'Eurasia|Cetus':[643,146,501,172], 'Cetus|Mantle':[410,322,386,419],
  'Cetus|Plains of Eidolon':[495,215,521,197], 'Mantle|Mariana':[298,413,270,348],
  'Mariana|E Prime':[143,330,113,357], 'Mantle|Lith':[295,570,203,591],
  'Lith|Cambria':[198,762,258,833], 'Cambria|Gaia':[393,872,471,856],
  'Gaia|Mantle':[407,723,359,617], 'Coba|Everest':[847,319,785,351],
  'Everest|Cervantes':[789,415,879,430], 'Coba|Plains of Eidolon':[774,201,638,191],
  'Tikal|Oro':[853,644,912,674], 'Oro|Cervantes':[1042,660,1090,566],
  'Gaia|Pacific':[555,865,663,920], 'Cambria|Venus Junction':[350,920,380,950],
  'Venus Junction|To Venus':[330,1014,230,1090], 'To Mars|Mars Junction':[305,-90,380,-35],
  'Mars Junction|Eurasia':[490,-5,630,38], 'E Prime|Strata Relay':[56,227,48,125],
  'Pacific|To Lua':[1078,1019,1129,750]
 }},
 Jupiter:{origin:[763,509,364],curves:{
  'Carme|Metis':[726,173,851,184], 'Metis|Ananke':[844,252,756,271],
  'Ananke|Callisto':[693,385,752,433], 'Callisto|Cameria':[845,451,887,438],
  'Metis|Elara':[1034,290,1057,393], 'Elara|Adrastea':[1072,520,1147,565],
  'Adrastea|Io':[1134,671,1004,684], 'Io|Themisto':[849,762,775,790],
  'Themisto|Thebe':[611,806,535,755], 'Thebe|Carpo':[430,624,405,529],
  'Carpo|Carme':[477,330,549,251], 'Ananke|Amalthea':[664,400,690,480],
  'Amalthea|Sinai':[647,593,689,620], 'Amalthea|Thebe':[599,617,528,665],
  'Thebe|Galilea':[477,753,433,799], 'Carpo|Europa Junction':[408,474,382,495],
  'Europa Junction|To Europa':[327,512,299,518], 'Themisto|Saturn Junction':[739,852,765,865],
  'Saturn Junction|To Saturn':[790,921,799,932], 'Metis|To Ceres':[1015,213,1047,180]
 }},
 Mercury:{origin:[1082,382,440],curves:{
  'Apollodorus|Boethius':[652,9,691,82], 'Boethius|Lares':[736,42,876,-90],
  'Lares|Tolstoj':[1095,-143,1397,-97], 'Tolstoj|Suisei':[1628,123,1605,202],
  'Suisei|Odin':[1695,203,1778,180], 'Odin|Larunda Relay':[1810,281,1623,431],
  'Larunda Relay|To Venus':[1608,703,1624,775], 'To Venus|Pantheon':[1542,821,1468,797],
  'Pantheon|Elion':[1373,731,1372,592], 'Elion|Suisei':[1471,429,1511,290],
  'Pantheon|Caloris':[1270,803,1163,803], 'Caloris|Terminus':[953,735,872,623],
  'Terminus|Boethius':[777,437,723,278]
 }}
};
export function missionPath(planet:Planet,a:Mission,b:Mission){
 const x1=a.x*345,y1=a.y*345,x2=b.x*345,y2=b.y*345;
 const authored=referenceHandles(planet,a,b);
 if(authored)return `M${x1},${y1} C${authored[0]},${authored[1]} ${authored[2]},${authored[3]} ${x2},${y2}`;
 const reference=traced[planet.name];let handle:Curve|undefined,reverse=false;
 if(reference){handle=reference.curves[a.name+'|'+b.name];if(!handle){handle=reference.curves[b.name+'|'+a.name];reverse=!!handle}}
 if(handle&&reference){const [cx,cy,r]=reference.origin;const c=handle.map((v,i)=>(v-(i%2?cy:cx))/r*345);if(reverse)return `M${x1},${y1} C${c[2]},${c[3]} ${c[0]},${c[1]} ${x2},${y2}`;return `M${x1},${y1} C${c[0]},${c[1]} ${c[2]},${c[3]} ${x2},${y2}`}
 // Untraced edges follow a front-hemisphere great circle, rather than a common
 // arbitrary bend. Named image-traced handles above take precedence.
 const r1=Math.hypot(a.x,a.y),r2=Math.hypot(b.x,b.y);
 if(r1>.99||r2>.99){const d=Math.hypot(x2-x1,y2-y1),bend=Math.min(30,d*.06);return `M${x1},${y1} C${x1+(x2-x1)*.36-bend*a.y},${y1+(y2-y1)*.32+bend*a.x} ${x1+(x2-x1)*.70-bend*b.y},${y1+(y2-y1)*.70+bend*b.x} ${x2},${y2}`}
 const v1=[a.x,a.y,Math.sqrt(Math.max(0,1-r1*r1))],v2=[b.x,b.y,Math.sqrt(Math.max(0,1-r2*r2))];const dot=Math.max(-1,Math.min(1,v1.reduce((s,v,i)=>s+v*v2[i],0)));const theta=Math.acos(dot),sn=Math.sin(theta);let d=`M${x1},${y1}`;
 for(let i=1;i<=24;i++){const t=i/24,s1=sn>.001?Math.sin((1-t)*theta)/sn:1-t,s2=sn>.001?Math.sin(t*theta)/sn:t;d+=` L${(v1[0]*s1+v2[0]*s2)*345},${(v1[1]*s1+v2[1]*s2)*345}`}
 return d;
}

// Direction in which the authored mission path arrives at a travel node.
// The system connector uses this tangent so the two parts read as one route.
export function travelTangent(planet:Planet,node:Mission):[number,number]{
 const index=planet.nodes.indexOf(node),edge=planet.edges.find(candidate=>candidate.includes(index));
 if(edge){
  const other=planet.nodes[edge[0]===index?edge[1]:edge[0]],path=missionPath(planet,other,node);
  const values=path.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)?.map(Number);
  if(values&&values.length>=4){
   const endX=values.at(-2)!,endY=values.at(-1)!;
   const controlX=values.at(-4)!,controlY=values.at(-3)!;
   const dx=endX-controlX,dy=endY-controlY,length=Math.hypot(dx,dy);
   if(length>.001)return [dx/length,dy/length];
  }
 }
 const length=Math.hypot(node.x,node.y)||1;
 return [node.x/length,node.y/length];
}

const coordinatePattern=/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi;
function pathInActiveMap(active:Planet,planet:Planet,path:string){
 let index=0;
 return path.replace(coordinatePattern,value=>{
  const n=Number(value),coordinate=index++%2;
  const mapped=coordinate===0?planet.x-active.x+n*planet.r/345:planet.y-active.y+n*planet.r/345;
  return String(mapped*345/active.r);
 });
}
function pointInActiveMap(active:Planet,planet:Planet,node:Mission):[number,number]{
 return [(planet.x-active.x+node.x*planet.r)*345/active.r,(planet.y-active.y+node.y*planet.r)*345/active.r];
}
export function destinationPreview(active:Planet,target:Planet){
 const arrival=target.nodes.find(node=>node.kind==='travel'&&node.to===active.name);
 if(!arrival)return null;
 const arrivalIndex=target.nodes.indexOf(arrival),landingEdge=target.edges.find(edge=>edge.includes(arrivalIndex));
 if(!landingEdge)return null;
 const landingIndex=landingEdge[0]===arrivalIndex?landingEdge[1]:landingEdge[0];
 const visited=new Set([arrivalIndex,landingIndex]),frontier=[landingIndex];
 const edges:{d:string;depth:number}[]=[],nodes:{node:Mission;x:number;y:number;depth:number}[]=[];
 for(let depth=1;depth<=2;depth++){
  const next:number[]=[];
  for(const current of frontier){
   for(const edge of target.edges){
    if(!edge.includes(current))continue;
    const nextIndex=edge[0]===current?edge[1]:edge[0],node=target.nodes[nextIndex];
    if(!node||node.kind==='travel'||visited.has(nextIndex))continue;
    visited.add(nextIndex);next.push(nextIndex);
    edges.push({d:pathInActiveMap(active,target,missionPath(target,target.nodes[current],node)),depth});
    const [x,y]=pointInActiveMap(active,target,node);nodes.push({node,x,y,depth});
   }
  }
  frontier.splice(0,frontier.length,...next);
 }
 const [x,y]=pointInActiveMap(active,target,target.nodes[landingIndex]);
 return {edges,nodes:[{node:target.nodes[landingIndex],x,y,depth:0},...nodes]};
}

// Build the connected junction-to-junction route in the active planet map's
// coordinate space. The junction edges and the interplanetary span become one
// SVG path, so there is no style or geometry seam where one part ends.
export function interplanetaryPath(active:Planet,target:Planet){
 const departure=active.nodes.find(node=>node.kind==='travel'&&node.to===target.name);
 const arrival=target.nodes.find(node=>node.kind==='travel'&&node.to===active.name);
 if(!departure||!arrival)return null;
 const departureIndex=active.nodes.indexOf(departure),arrivalIndex=target.nodes.indexOf(arrival);
 const departureEdge=active.edges.find(edge=>edge.includes(departureIndex));
 const arrivalEdge=target.edges.find(edge=>edge.includes(arrivalIndex));
 if(!departureEdge||!arrivalEdge)return null;
 const departureNeighbor=active.nodes[departureEdge[0]===departureIndex?departureEdge[1]:departureEdge[0]];
 const arrivalNeighbor=target.nodes[arrivalEdge[0]===arrivalIndex?arrivalEdge[1]:arrivalEdge[0]];
 const mapPoint=(x:number,y:number)=>[(x-active.x)*345/active.r,(y-active.y)*345/active.r] as const;
 const departurePath=pathInActiveMap(active,active,missionPath(active,departureNeighbor,departure));
 const arrivalPath=pathInActiveMap(active,target,missionPath(target,arrival,arrivalNeighbor));
 const arrivalTail=arrivalPath.replace(/^M[^A-Za-z]*/, '');
 const [dx,dy]=travelTangent(active,departure),[ax,ay]=travelTangent(target,arrival);
 const sx=active.x+departure.x*active.r,sy=active.y+departure.y*active.r;
 const ex=target.x+arrival.x*target.r,ey=target.y+arrival.y*target.r;
 const length=Math.hypot(ex-sx,ey-sy),handle=Math.min(48,length*.32);
 const [c1x,c1y]=mapPoint(sx+dx*handle,sy+dy*handle);
 const [c2x,c2y]=mapPoint(ex+ax*handle,ey+ay*handle);
 const [endX,endY]=mapPoint(ex,ey);
 return `${departurePath} C${c1x},${c1y} ${c2x},${c2y} ${endX},${endY} ${arrivalTail}`;
}

