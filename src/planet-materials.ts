import * as THREE from 'three';
import {blankMaps,type BlenderDef} from './blender-planets';

// The planet surfaces are the baked Blender maps (colour, normal, night lights,
// glint, clouds, rings). Shading follows the web galaxy: lit by the chart's sun,
// with a soft terminator so small worlds still read clearly.
const planetVertex=`
varying vec2 vUv;
varying vec3 vNormalV,vEastV,vNorthV,vViewPos;
void main(){
 vUv=uv;
 vec3 n=normalize(position);
 vec3 east=cross(vec3(0.,1.,0.),n);float le=length(east);east=le>1e-5?east/le:vec3(1.,0.,0.);
 vec3 north=cross(n,east);
 vNormalV=normalize(normalMatrix*n);vEastV=normalize(normalMatrix*east);vNorthV=normalize(normalMatrix*north);
 vec4 mv=modelViewMatrix*vec4(position,1.);vViewPos=mv.xyz;
 gl_Position=projectionMatrix*mv;
}`;

const planetFragment=`
uniform sampler2D colorMap,normalMap,emissiveMap,specMap;
uniform float hasNormal,hasEmissive,hasSpec,emissiveStrength,emissiveAlways,specStrength,lunar,normalStrength;
uniform vec3 lightDir;
uniform float opacity,time,radius;
varying vec2 vUv;
varying vec3 vNormalV,vEastV,vNorthV,vViewPos;
void main(){
 vec3 Ng=normalize(vNormalV),N=Ng;
 if(hasNormal>.5){
  vec3 t=texture2D(normalMap,vUv).xyz*2.-1.;t.xy*=normalStrength;
  N=normalize(normalize(vEastV)*t.x+normalize(vNorthV)*t.y+Ng*max(t.z,.05));
 }
 vec3 V=normalize(-vViewPos),L=normalize(lightDir);
 float ndlG=dot(Ng,L),ndl=dot(N,L);
 vec3 albedo=texture2D(colorMap,vUv).rgb;
 // Soft wrapped light so the night edge fades instead of cutting off.
 float day=smoothstep(-.12,.66,mix(ndl,ndlG,.35));
 float mu0=max(ndl,0.),mu=max(dot(N,V),0.);
 float regolith=2.*mu0/(mu0+mu+1e-3)*.62;
 float diffuse=mix(day,day*(.55+regolith),lunar);
 vec3 color=albedo*(.014+diffuse*1.04);
 if(hasSpec>.5){
  float sm=texture2D(specMap,vUv).r*specStrength;
  vec3 H=normalize(L+V);float ndh=max(dot(Ng,H),0.);
  float glint=pow(ndh,200.)*2.6+pow(ndh,34.)*.2;
  color+=vec3(1.,.93,.8)*sm*glint*smoothstep(0.,.2,ndlG);
 }
 if(hasEmissive>.5){
  float night=mix(1.-smoothstep(-.14,.08,ndlG),1.,emissiveAlways);
  color+=texture2D(emissiveMap,vUv).rgb*emissiveStrength*.55*night;
 }
 float rim=pow(1.-max(dot(Ng,V),0.),5.);
 color+=albedo*rim*max(ndlG,0.)*.07;
 gl_FragColor=vec4(color,opacity);
 #include <colorspace_fragment>
}`;

export type PlanetMaterial=THREE.ShaderMaterial;
export function createPlanetMaterial(def:BlenderDef,radius:number){
 const material=new THREE.ShaderMaterial({vertexShader:planetVertex,fragmentShader:planetFragment,transparent:true,uniforms:{
  colorMap:{value:blankMaps.black},normalMap:{value:blankMaps.flat},emissiveMap:{value:blankMaps.black},specMap:{value:blankMaps.black},
  hasNormal:{value:0},hasEmissive:{value:0},hasSpec:{value:0},
  emissiveStrength:{value:def.emissive_strength},emissiveAlways:{value:def.emissive_always?1:0},
  specStrength:{value:def.spec},lunar:{value:def.lunar},normalStrength:{value:1},
  radius:{value:radius},time:{value:0},opacity:{value:1},lightDir:{value:new THREE.Vector3(-.7,.5,.5)}
 }});
 return material;
}

const shellVertex='varying vec3 n,p;void main(){n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);p=mv.xyz;gl_Position=projectionMatrix*mv;}';
// Blender's atmosphere colour and strength drive the glow around the limb.
export function createAtmosphereMaterial(def:BlenderDef){
 const color=def.atmo?new THREE.Color(...def.atmo.color):new THREE.Color('#ffffff');
 const air=def.atmo?Math.min(1,def.atmo.intensity*.62+def.atmo.thickness*3):0;
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:shellVertex,uniforms:{tint:{value:color},strength:{value:air},opacity:{value:1},lightDir:{value:new THREE.Vector3(-.7,.5,.5)}},fragmentShader:`uniform vec3 tint,lightDir;uniform float strength,opacity;varying vec3 n,p;void main(){vec3 N=normalize(n),V=normalize(-p);float rim=pow(1.-abs(dot(N,V)),3.4);float lit=smoothstep(-.4,.7,dot(N,normalize(lightDir)));float a=rim*(.05+lit*.7)*strength*opacity;gl_FragColor=vec4(tint,a);#include <colorspace_fragment>}`.replace('#include','\n#include')});
 return {material,air};
}

// Cloud shell from the baked cloud map (red channel is coverage).
export function createCloudMaterial(map:THREE.Texture,amount:number){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:planetVertex,uniforms:{cloudMap:{value:map},amount:{value:amount},opacity:{value:1},lightDir:{value:new THREE.Vector3(-.7,.5,.5)}},fragmentShader:`uniform sampler2D cloudMap;uniform float amount,opacity;uniform vec3 lightDir;varying vec2 vUv;varying vec3 vNormalV,vEastV,vNorthV,vViewPos;void main(){float d=texture2D(cloudMap,vUv).r;float ndl=dot(normalize(vNormalV),normalize(lightDir));float day=smoothstep(-.12,.6,ndl);vec3 tint=mix(vec3(1.,.62,.42),vec3(1.),smoothstep(0.,.3,ndl));vec3 col=vec3(.94,.95,.97)*tint*(.02+day*1.02);gl_FragColor=vec4(col,clamp(d*amount*1.05,0.,1.)*opacity);\n#include <colorspace_fragment>\n}`});
}

// Ring strip from the Blender bake: u runs from the inner to the outer edge.
export function createRingMaterial(map:THREE.Texture,inner:number,outer:number){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{ringMap:{value:map},inner:{value:inner},outer:{value:outer},opacity:{value:1},lightDir:{value:new THREE.Vector3(.5,.6,.4)}},vertexShader:'varying vec2 ringPoint;void main(){ringPoint=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D ringMap;uniform float inner,outer,opacity;uniform vec3 lightDir;varying vec2 ringPoint;void main(){float t=(length(ringPoint)-inner)/(outer-inner);if(t<0.||t>1.)discard;vec4 s=texture2D(ringMap,vec2(t,.5));float lit=smoothstep(-.35,.45,dot(normalize(ringPoint),normalize(lightDir.xy)))*.62+.38;gl_FragColor=vec4(s.rgb*(.22+lit*.86),s.a*opacity);\n#include <colorspace_fragment>\n}`});
}
