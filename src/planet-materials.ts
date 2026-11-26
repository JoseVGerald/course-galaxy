import * as THREE from 'three';
import type {Planet} from './data';

// All surface detail in this file is generated on the GPU. No image textures,
// baked screenshots, normal maps, displacement maps, or cubemaps are loaded.
type Profile={kind:number;seed:number;colors:[string,string,string];bump:number;shape:number;atmosphere:string;air:number};
const profiles:Record<string,Profile>={
 Earth:{kind:1,seed:7,colors:['#173a66','#cb947a','#4c5141'],bump:.60,shape:.0004,atmosphere:'#6eb9ec',air:1},
 Venus:{kind:2,seed:19,colors:['#d2a06a','#95643b','#ead3a1'],bump:.28,shape:.0006,atmosphere:'#e6bd84',air:.32},
 Jupiter:{kind:3,seed:31,colors:['#d4c4a5','#875534','#b18a63'],bump:.12,shape:0,atmosphere:'#b9ab87',air:.12},
 Saturn:{kind:4,seed:47,colors:['#cfb77f','#9f8050','#ead9ac'],bump:.055,shape:0,atmosphere:'#bba77c',air:.15},
 Uranus:{kind:5,seed:53,colors:['#3e89ad','#254d77','#aecbc7'],bump:.025,shape:0,atmosphere:'#58a3bb',air:.42},
 Neptune:{kind:5,seed:61,colors:['#244f79','#0e223c','#4a6d8c'],bump:.025,shape:0,atmosphere:'#326e9b',air:.32},
 Europa:{kind:6,seed:73,colors:['#b6a366','#777365','#d1bf8e'],bump:1.15,shape:.001,atmosphere:'#6c7e78',air:.03},
 Mercury:{kind:7,seed:89,colors:['#a77a40','#514638','#dfb276'],bump:.85,shape:.002,atmosphere:'#c09662',air:.06},
 Mars:{kind:10,seed:101,colors:['#ab583a','#663c2e','#ca8d64'],bump:1.0,shape:.003,atmosphere:'#a46b4b',air:.10},
 Ceres:{kind:0,seed:113,colors:['#625946','#32372e','#827863'],bump:1.20,shape:.035,atmosphere:'#3e5550',air:0},
 Phobos:{kind:0,seed:127,colors:['#825b48','#392f2b','#bc8d6c'],bump:1.15,shape:.075,atmosphere:'#66716b',air:0},
 Eris:{kind:13,seed:139,colors:['#967274','#4e3436','#b4918c'],bump:.80,shape:.009,atmosphere:'#566969',air:.02},
 Pluto:{kind:11,seed:149,colors:['#849895','#4b626b','#c4cdc0'],bump:.65,shape:.002,atmosphere:'#638b9b',air:.12},
 Sedna:{kind:0,seed:163,colors:['#796047','#443f32','#a58a68'],bump:.90,shape:.005,atmosphere:'#6e6a51',air:0},
 Lua:{kind:12,seed:179,colors:['#8a8e88','#4a5152','#c0c0ab'],bump:.95,shape:.003,atmosphere:'#64818a',air:.025},
 Deimos:{kind:8,seed:191,colors:['#5d2d21','#281f1e','#d3752c'],bump:1.45,shape:.115,atmosphere:'#993c20',air:.20},
 'Kuva Fortress':{kind:0,seed:211,colors:['#424b47','#1c2527','#8d7d62'],bump:1.4,shape:.12,atmosphere:'#53615e',air:0},
 Derelict:{kind:9,seed:227,colors:['#284e5b','#0d202b','#8fbab5'],bump:0,shape:0,atmosphere:'#497b9b',air:.18}
};

const fields=`
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
vec3 hash33(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<6;i++){s+=noise3(p)*a;p=p*2.04+vec3(7.1,3.7,1.3);a*=.49;}return s;}
float ridges(vec3 p){return 1.-abs(fbm(p)*2.-1.);}
vec3 warp(vec3 p){return vec3(noise3(p+1.7),noise3(p+8.3),noise3(p+3.1));}
vec2 cells(vec3 p){vec3 ip=floor(p),fp=fract(p);float first=10.,second=10.;for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 q=vec3(float(x),float(y),float(z));vec3 d=q+hash33(ip+q)-fp;float r=dot(d,d);if(r<first){second=first;first=r;}else if(r<second)second=r;}return sqrt(vec2(first,second));}
float craterField(vec3 p,float scale){vec3 ip=floor(p*scale),fp=fract(p*scale);float h=0.;for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 cell=vec3(float(x),float(y),float(z));vec3 seed=hash33(ip+cell);float radius=.16+seed.z*.23;float r=length(cell+seed-fp)/radius;float bowl=-.38*(1.-smoothstep(.05,.86,r));float rim=exp(-pow((r-.96)*8.,2.))*.18;h+=bowl+rim;}return h;}
float cloudField(vec3 p,float t){p=vec3(p.x,p.y*1.24,p.z);p.x+=t*.0016;vec3 w=warp(p*3.8);float sheets=fbm(p*5.4+w*1.3);float wisps=ridges(p*vec3(24.,39.,24.)+w*4.);return smoothstep(.50,.76,sheets+wisps*.09);}
`;

// Hand-authored spherical geographic outlines give Earth recognizable continents.
// Coast detail, terrain, mountains, snow and clouds are subsequently procedural.
const continents:Record<string,number[][]>={
 eurasia:[[-10,35],[-10,44],[-5,49],[1,51],[-4,58],[9,60],[12,70],[29,71],[42,68],[50,73],[87,76],[118,73],[142,68],[177,66],[170,54],[150,47],[141,38],[129,34],[124,23],[116,21],[110,6],[101,0],[95,8],[90,21],[80,9],[73,18],[68,25],[57,26],[48,30],[42,40],[31,41],[28,35],[20,35],[13,43],[6,43],[-1,37]],
 africa:[[-17,15],[-16,28],[-5,35],[10,37],[24,32],[32,30],[35,16],[43,12],[51,11],[43,-5],[40,-13],[34,-25],[19,-35],[12,-18],[8,-4],[-1,5],[-10,5]],
 northAmerica:[[-168,71],[-140,70],[-130,60],[-125,50],[-126,42],[-119,33],[-112,30],[-106,22],[-99,17],[-91,15],[-82,9],[-77,9],[-85,20],[-81,25],[-81,31],[-74,36],[-67,44],[-55,49],[-59,57],[-77,62],[-92,69],[-110,73],[-135,73]],
 southAmerica:[[-81,12],[-70,10],[-60,6],[-51,2],[-35,-7],[-39,-20],[-48,-29],[-55,-40],[-67,-55],[-74,-50],[-75,-30],[-81,-5]],
 australia:[[113,-23],[115,-34],[130,-33],[138,-38],[150,-37],[154,-28],[146,-16],[137,-11],[130,-13],[125,-17]],
 greenland:[[-53,60],[-42,61],[-21,70],[-19,79],[-30,83],[-54,82],[-68,76],[-58,68]],
 madagascar:[[48,-13],[51,-17],[47,-26],[44,-23]],
 japan:[[131,31],[135,34],[139,36],[141,41],[144,44],[142,38],[137,34]],
 britain:[[-5,50],[1,51],[-1,56],[-5,59],[-6,55]]
};
function polygonFunction(name:string,points:number[][]){
 const vertices=points.map(([x,y])=>`vec2(${(x*Math.PI/180).toFixed(7)},${(y*Math.PI/180).toFixed(7)})`);
 return `float ${name}(vec2 p){float d=10.,sgn=1.;vec2 a,b,e,w;${vertices.map((v,i)=>`a=${v};b=${vertices[(i+1)%vertices.length]};e=b-a;w=p-a;d=min(d,dot(w-e*clamp(dot(w,e)/dot(e,e),0.,1.),w-e*clamp(dot(w,e)/dot(e,e),0.,1.)));${points[i][1]!==points[(i+1)%points.length][1]?'if((a.y>p.y)!=(b.y>p.y)){if(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)sgn=-sgn;}':''}`).join('')}return sqrt(d)*sgn;}`;
}
const geography=Object.entries(continents).map(([name,p])=>polygonFunction(name,p)).join('\n')+`
float landDistance(vec2 p){float d=10.;${Object.keys(continents).map(name=>`d=min(d,${name}(p));`).join('')}return min(d,p.y+1.35);}
`;

const planetVertex=`
uniform float shape;
uniform float seed;
attribute vec3 surfacePoint;
attribute float surfaceRadius;
varying vec3 localPoint;
varying vec3 viewNormal;
varying vec3 viewPoint;
varying vec2 uv0;
void main(){
 localPoint=normalize(surfacePoint);uv0=uv;
 float deformation=sin(surfacePoint.x*8.+seed)*sin(surfacePoint.y*6.-seed)*cos(surfacePoint.z*7.)*.45+sin(surfacePoint.x*3.+surfacePoint.z*4.+seed)*.55;
 vec3 p=position+surfacePoint*(deformation*shape*surfaceRadius);
 viewNormal=normalize(normalMatrix*normal);
 vec4 mv=modelViewMatrix*vec4(p,1.);viewPoint=mv.xyz;
 gl_Position=projectionMatrix*mv;
}`;

const planetFragment=`
uniform vec3 colorA,colorB,colorC;
uniform vec3 lightDir;
uniform float seed,time,opacity,radius,bump;
varying vec3 localPoint,viewNormal,viewPoint;
varying vec2 uv0;
${fields}
#if BODY_KIND == 1
${geography}
#endif
void main(){
 vec3 p=normalize(localPoint),q=p+vec3(seed*.17,seed*.09,seed*.13);
 vec3 albedo=colorA;float height=0.,roughness=.89,emission=0.;
 #if BODY_KIND == 1
  vec2 ll=vec2(atan(p.z,p.x),asin(p.y));
  vec2 coastWarp=vec2(fbm(q*21.),fbm(q*24.+8.))-.5;
  float d=landDistance(ll+coastWarp*.032);
  float land=1.-smoothstep(-.008,.009,d);
  float terrain=fbm(q*19.);float ranges=pow(ridges(q*31.+warp(q*9.)*2.),4.);
  vec3 continent=mix(colorB,colorC,smoothstep(.25,.76,terrain)*.65);
  continent=mix(continent,colorB*1.18,ranges*.35);
  float shallows=exp(-abs(d)*45.)*(1.-land);
  vec3 ocean=mix(colorA*.64,colorA*1.35,fbm(q*12.))+vec3(.012,.028,.029)*shallows;
  albedo=mix(ocean,continent,land);
  float ice=smoothstep(.88,.97,abs(p.y)+terrain*.035);albedo=mix(albedo,vec3(.68,.72,.70),ice*.80);
  height=(terrain*.30+ranges*.13)*land;
  roughness=mix(.20,.94,land);
  albedo*=1.-cloudField(p+normalize(lightDir)*.025,time)*.13;
 #elif BODY_KIND == 2
  vec3 flow=warp(q*4.5);float broad=fbm(q*3.1+flow*2.1);
  float veils=fbm(q*vec3(13.,8.,13.)+flow*3.);float wisps=ridges(q*35.+flow*4.);
  albedo=mix(colorB,colorA,smoothstep(.24,.73,broad*.65+veils*.35));
  albedo=mix(albedo,colorC,pow(wisps,6.)*.21);
  float pale=exp(-length((p-vec3(-.36,.72,.59))*vec3(7.,14.,7.))*2.);
  albedo=mix(albedo,colorC,pale*.55);
  height=veils*.1+fbm(q*85.)*.012;roughness=.96;
 #elif BODY_KIND == 3 || BODY_KIND == 4
  float lat=p.y;
  vec3 flowPoint=q+warp(q*8.5)*.16;
  float waves=(fbm(flowPoint*vec3(11.,8.,11.))-.5)*.14+(noise3(q*vec3(29.,11.,29.))-.5)*.024;
  float warpY=lat+waves;
  float broad=sin(warpY*21.+sin(lat*8.)*1.7);
  float thin=sin(warpY*93.+fbm(q*38.)*7.0);
  float curl=fbm(q*43.+warp(q*11.)*3.9);
  #if BODY_KIND == 3
   float bands=smoothstep(-.68,.89,broad*.64+thin*.18+(curl-.5)*.91);
   albedo=mix(colorB,colorA,bands);albedo=mix(albedo,colorC,smoothstep(.28,.76,curl)*.25);
   albedo*=.67+curl*.63;
   float lon=atan(p.z,p.x),dx=atan(sin(lon-2.65),cos(lon-2.65));
   vec2 storm=vec2(dx/.24,(lat+.23)/.075);float sr=length(storm);
   float swirls=sin(sr*25.+atan(storm.y,storm.x)*2.+noise3(q*42.)*3.);
   float sm=1.-smoothstep(.62,1.09,sr+noise3(q*20.)*.13);
   albedo=mix(albedo,mix(colorB*.9,vec3(.43,.22,.12),swirls*.24+.43),sm*.8);
  #else
   float bands=.62+sin(warpY*36.+curl*1.2)*.13+thin*.035;
   albedo=mix(colorB,colorA,bands);albedo=mix(albedo,colorC,smoothstep(.45,.80,curl)*.22);
  #endif
  height=thin*.003+curl*.01;roughness=.97;
 #elif BODY_KIND == 5
  float cloud=fbm(q*vec3(29.,7.,29.)+warp(q*8.)*.6);float lat=p.y+noise3(q*12.)*.023;
  float ribbons=sin(lat*28.+cloud*2.0)*.06+sin(lat*71.)*.012;
  albedo=mix(colorB,colorA,smoothstep(-.7,.7,lat+ribbons));
  albedo=mix(albedo,colorC,smoothstep(.50,.95,p.y)*.64);
  albedo*=.90+cloud*.17;height=ribbons*.008+cloud*.006;roughness=.98;
 #elif BODY_KIND == 6
  vec3 warped=q*4.4+warp(q*5.7)*.27;
  vec2 plates=cells(warped);float fracture=plates.y-plates.x;
  float hairlines=abs(sin(dot(p,vec3(17.,7.,13.))+fbm(q*7.)*1.7));
  float crack=1.-smoothstep(.003,.020,fracture);
  float seam=(1.-smoothstep(.015,.050,hairlines))*.5;
  float worn=fbm(q*16.);float grain=fbm(q*135.);
  albedo=mix(colorB,colorA,smoothstep(.17,.80,worn));
  albedo=mix(albedo,colorC,smoothstep(.44,.81,grain)*.26);
  albedo*=1.-max(crack*.53,seam*.42);
  height=worn*.10+grain*.040-max(crack*.017,seam*.020);roughness=.96;
 #elif BODY_KIND == 10
  // Rust plains, basalt basins, dune fields and a long eroded canyon system.
  float lon=atan(p.z,p.x);float crust=fbm(q*5.2+warp(q*4.)*.8);
  float highlands=ridges(q*18.+warp(q*7.)*2.);
  float canyon=1.-smoothstep(.014,.056,abs(p.y+.10+sin(lon*2.7)*.13+noise3(q*13.)*.035));
  float dunes=sin(p.y*200.+fbm(q*35.)*14.)*.5+.5;
  float craters=craterField(q,19.);
  albedo=mix(colorB,colorA,smoothstep(.25,.71,crust));
  albedo=mix(albedo,colorC,pow(highlands,8.)*.30);
  albedo*=.89+dunes*.045+craters*.18;
  albedo=mix(albedo,colorB*.65,canyon*.7);
  float pole=smoothstep(.91,.98,abs(p.y)+crust*.045);
  albedo=mix(albedo,vec3(.68,.63,.55),pole*.88);
  height=crust*.15+pow(highlands,6.)*.025+craters*.035-canyon*.03;roughness=.97;
 #elif BODY_KIND == 11
  // Frozen nitrogen plains separated from fractured upland ice.
  float basins=fbm(q*4.3+warp(q*6.)*.6),ice=fbm(q*21.);
  float fractures=pow(ridges(q*29.+warp(q*8.)*2.),14.);
  float cellsIce=1.-smoothstep(.006,.04,cells(q*12.).y-cells(q*12.).x);
  albedo=mix(colorB,colorA,smoothstep(.29,.66,basins));
  albedo=mix(albedo,colorC,smoothstep(.49,.75,ice)*.7);
  albedo*=1.-cellsIce*.11-fractures*.13;
  height=basins*.12+ice*.024-cellsIce*.007;roughness=.83;
 #elif BODY_KIND == 12
  float craters=craterField(q,8.)+craterField(q+4.,23.)*.48;
  float crust=fbm(q*12.),fracture=cells(q*4.+warp(q*6.)*.22).y-cells(q*4.+warp(q*6.)*.22).x;
  float split=1.-smoothstep(.008,.032,fracture);
  albedo=mix(colorB,colorA,smoothstep(.21,.74,crust));
  albedo=mix(albedo,colorC,smoothstep(.53,.85,fbm(q*82.))*.50);
  albedo*=1.-split*.77;albedo*=.89+craters*.3;
  height=crust*.11+craters*.12-split*.09;roughness=.94;
 #elif BODY_KIND == 13
  float crust=fbm(q*6.7),scored=ridges(q*34.+warp(q*9.)*3.);
  float furrows=pow(scored,12.),grain=fbm(q*165.);
  albedo=mix(colorB,colorA,smoothstep(.20,.76,crust));
  albedo=mix(albedo,colorC,grain*.27);albedo*=.86+grain*.26-furrows*.19;
  height=crust*.17+grain*.035-furrows*.018;roughness=.96;
 #elif BODY_KIND == 8
  float tissue=fbm(q*5.+warp(q*12.)*2.3);float fold=ridges(q*14.+warp(q*5.)*2.5);
  float wound=1.-smoothstep(.025,.10,abs(fold-.69));
  albedo=mix(colorB,colorA,smoothstep(.22,.76,tissue));
  albedo=mix(albedo,colorC,wound*.62);height=tissue*.2+fold*.11;
  emission=wound*.30;roughness=.74;
 #elif BODY_KIND == 9
  float edgeGlow=pow(1.-max(viewNormal.z,0.),3.0);float arc=step(.72,sin(uv0.x*42.+uv0.y*16.))*edgeGlow;
  gl_FragColor=vec4(vec3(.12,.38,.55)*(edgeGlow+arc*.8),(.05+edgeGlow*.5)*opacity);return;
 #else
  float continents=fbm(q*5.7);float grain=fbm(q*70.);
  float craters=craterField(q,14.)+craterField(q+7.7,36.)*.40;
  float ridged=pow(ridges(q*23.+warp(q*5.)*2.),6.);
  albedo=mix(colorB,colorA,smoothstep(.23,.74,continents));
  albedo=mix(albedo,colorC,smoothstep(.4,.88,grain)*.34);
  albedo*=.87+grain*.2+craters*.17;
  height=continents*.15+grain*.037+craters*.11+ridged*.026;
  #if BODY_KIND == 7
   float hot=pow(max(0.,fbm(q*49.)-.63)*5.5,3.);
   albedo+=colorC*hot*.21;emission=hot*.09;
  #endif
 #endif
 vec3 N=normalize(viewNormal),V=normalize(-viewPoint),L=normalize(lightDir);
 vec3 dp1=dFdx(viewPoint),dp2=dFdy(viewPoint),R1=cross(dp2,N),R2=cross(N,dp1);
 float det=dot(dp1,R1);vec3 gradient=sign(det)*(dFdx(height)*R1+dFdy(height)*R2);
 N=normalize(abs(det)*N-gradient*bump*radius*.014);
 float nl=dot(N,L);float daylight=smoothstep(-.14,.72,nl);
 vec3 color=albedo*(.008+daylight*.98);
 vec3 H=normalize(L+V);float spec=pow(max(dot(N,H),0.),mix(140.,8.,roughness));
 color+=vec3(1.,.91,.77)*spec*(1.-roughness)*max(nl,0.)*.27;
 color+=albedo*emission;
 float rim=pow(1.-max(dot(normalize(viewNormal),V),0.),5.);
 color+=albedo*rim*max(nl,0.)*.045;
 gl_FragColor=vec4(color,opacity);
 #include <colorspace_fragment>
}`;

export function createPlanetMaterial(planet:Planet){
 const profile=profiles[planet.name]||profiles.Lua;
 const material=new THREE.ShaderMaterial({defines:{BODY_KIND:profile.kind},vertexShader:planetVertex,fragmentShader:planetFragment,transparent:true,uniforms:{colorA:{value:new THREE.Color(profile.colors[0])},colorB:{value:new THREE.Color(profile.colors[1])},colorC:{value:new THREE.Color(profile.colors[2])},seed:{value:profile.seed},shape:{value:profile.shape},bump:{value:profile.bump},radius:{value:planet.r},time:{value:0},opacity:{value:1},lightDir:{value:new THREE.Vector3(-.7,.5,.5)}}});
 return {material,profile};
}

const shellVertex='varying vec3 n,p;void main(){n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);p=mv.xyz;gl_Position=projectionMatrix*mv;}';
export function createAtmosphereMaterial(profile:Profile){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:shellVertex,uniforms:{tint:{value:new THREE.Color(profile.atmosphere)},strength:{value:profile.air},opacity:{value:1},lightDir:{value:new THREE.Vector3(-.7,.5,.5)}},fragmentShader:`uniform vec3 tint,lightDir;uniform float strength,opacity;varying vec3 n,p;void main(){vec3 N=normalize(n),V=normalize(-p);float rim=pow(1.-abs(dot(N,V)),3.4);float lit=smoothstep(-.4,.7,dot(N,normalize(lightDir)));float a=rim*(.05+lit*.7)*strength*opacity;gl_FragColor=vec4(tint,a);#include <colorspace_fragment>}`.replace('#include','\n#include')});}

export function createCloudMaterial(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:planetVertex,uniforms:{time:{value:0},opacity:{value:1},shape:{value:0},seed:{value:0},lightDir:{value:new THREE.Vector3(-.7,.5,.5)}},fragmentShader:`uniform float time,opacity;uniform vec3 lightDir;varying vec3 localPoint,viewNormal,viewPoint;varying vec2 uv0;${fields}void main(){vec3 p=normalize(localPoint);float c=cloudField(p,time);float day=smoothstep(-.1,.7,dot(normalize(viewNormal),normalize(lightDir)));vec3 col=vec3(.78,.75,.71)*(.015+day);gl_FragColor=vec4(col,c*.76*opacity);\n#include <colorspace_fragment>\n}`});}

export function createRingMaterial(planet:Planet){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{opacity:{value:.48},tint:{value:new THREE.Color(planet.name==='Uranus'?'#6a9fba':'#a9a083')},lightDir:{value:new THREE.Vector3(.5,.6,.4)}},vertexShader:'varying vec2 ringPoint;void main(){ringPoint=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 ringPoint;uniform float opacity;uniform vec3 tint,lightDir;void main(){float r=length(ringPoint);float band=.45+.22*sin(r*145.)+.12*sin(r*367.)+.08*sin(r*791.);float cassini=1.-smoothstep(.009,.032,abs(r-1.73));float edge=smoothstep(1.25,1.30,r)*(1.-smoothstep(1.98,2.05,r));float shadow=smoothstep(-.05,.20,dot(normalize(ringPoint),normalize(lightDir.xy))+.24);float a=clamp(band,0.,1.)*(1.-cassini*.94)*edge*opacity;gl_FragColor=vec4(tint*(.21+shadow*.67),a);\n#include <colorspace_fragment>\n}`});}
