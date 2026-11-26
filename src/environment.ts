import * as THREE from 'three';
import type {View} from './engine';

// A rendered reconstruction of the recorded teal / blue navigation environment.
// No reference pixels, video, cubemap, or character are used in this layer.
const fragment=`
 precision highp float;
 varying vec2 vUv;
 uniform float time;
 uniform float focus;
 uniform vec2 pan;
 uniform vec2 fieldScale;
 uniform vec3 tint;
 uniform float systemFrame;
 float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 mat2 turn=mat2(.82,-.57,.57,.82);
 float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*noise(p);p=turn*p*2.07+vec2(17.3,8.4);a*=.48;}return s;}
 float plume(vec2 p,vec2 c,vec2 size){vec2 d=(p-c)/size;return exp(-dot(d,d));}
 void main(){
  vec2 uv=vUv;vec2 p=(uv-vec2(.5))*vec2(3.55,2.0)*fieldScale+pan*vec2(.000035,-.000035);
  float t=time*.0023;
  vec2 q=vec2(fbm(p*1.32+vec2(.1,t)),fbm(p*1.5+vec2(5.2,-t*.4)));
  vec2 r=vec2(fbm(p*2.8+q*2.9+vec2(1.7,t*.5)),fbm(p*2.1+q*3.1+vec2(8.3,2.8)));
  float mist=fbm(p*3.3+r*3.4);
  float filaments=pow(max(0.,1.-abs(fbm(p*vec2(4.7,1.6)+r*2.7)*2.-1.)),6.0);
  float detail=fbm(p*18.+q*4.0);
  // Measured composition: teal smoke low on the left, dark central pockets,
  // cobalt haze in the upper-right, narrow translucent vertical filaments.
  float leftBank=plume(p,vec2(-1.12,-.43),vec2(.73,.73));
  float lowerBank=plume(p,vec2(-.12,-.85),vec2(1.14,.40));
  float topBank=plume(p,vec2(.97,.40),vec2(1.02,.85));
  float diagonal=exp(-pow((p.x-p.y*.70+.48)*1.45,2.));
  float holes=pow(fbm(p*2.4+vec2(3.3,1.2)),1.7);
  float density=smoothstep(.28,.78,mist)*(.33+leftBank*.75+lowerBank*.33+diagonal*.36);
  vec3 color=vec3(.010,.032,.039);
  color+=vec3(.026,.125,.126)*density;
  color+=vec3(.010,.078,.151)*topBank*(.25+mist*.9);
  color+=vec3(.030,.073,.068)*filaments*(leftBank*.46+diagonal*.16);
  color+=vec3(.004,.020,.022)*detail*density;
  float threads=pow(1.-abs(noise(p*24.+r*6.)*2.-1.),18.);
  color+=vec3(.035,.070,.066)*threads*filaments*(.14+leftBank*.18);
  float depthVeil=fbm(p*1.7+q*2.0+vec2(t*.35,-t*.20));
  color+=tint*(.018+.034*density)*focus;
  color+=vec3(.008,.025,.029)*depthVeil*(.55+systemFrame*.7);
  color*=1.-holes*.50;
  color+=vec3(.009,.018,.014)*lowerBank*mist;
  color*=mix(1.,.89,focus);
  float vignette=1.-smoothstep(.25,1.0,length((uv-.5)*vec2(1.0,.83)))*.42;
  color*=vignette;
  gl_FragColor=vec4(color,1.);
 }
`;
export function addEnvironment(scene:THREE.Scene){
 const material=new THREE.ShaderMaterial({vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:fragment,uniforms:{time:{value:0},focus:{value:0},pan:{value:new THREE.Vector2()},fieldScale:{value:new THREE.Vector2(1,1)},tint:{value:new THREE.Vector3(.06,.17,.18)},systemFrame:{value:0}},depthWrite:false});
 const geometry=new THREE.PlaneGeometry(2400,1350),mesh=new THREE.Mesh(geometry,material);mesh.position.z=-950;mesh.renderOrder=-100;scene.add(mesh);
 // Fixed seeds make star locations stable through pan, zoom and interrupted input.
 let seed=0x57a2;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const positions:number[]=[],sizes:number[]=[],brightness:number[]=[],phases:number[]=[];
 for(let i=0;i<4700;i++){positions.push((random()-.5)*2400,(random()-.5)*1350,-900+random()*190);sizes.push(.5+Math.pow(random(),5)*1.8);brightness.push(.08+Math.pow(random(),3)*.40);phases.push(random()*6.283)}
 const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));starsGeo.setAttribute('size',new THREE.Float32BufferAttribute(sizes,1));starsGeo.setAttribute('brightness',new THREE.Float32BufferAttribute(brightness,1));starsGeo.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));
 const starMat=new THREE.ShaderMaterial({uniforms:{time:{value:0},density:{value:1},pixelRatio:{value:Math.min(devicePixelRatio,1.8)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`attribute float size;attribute float brightness;attribute float phase;uniform float time;uniform float pixelRatio;varying float alpha;void main(){alpha=brightness*(.88+.12*sin(time*.31+phase));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size*pixelRatio;}`,fragmentShader:`varying float alpha;uniform float density;void main(){float r=length(gl_PointCoord-.5);float a=(1.-smoothstep(.13,.5,r))*alpha*density;gl_FragColor=vec4(.66,.83,.87,a);}`});
 const stars=new THREE.Points(starsGeo,starMat);stars.renderOrder=-90;scene.add(stars);
 return {resize(width:number,height:number){const x=width/1920,y=height/1080;mesh.scale.set(x,y,1);stars.scale.set(x,y,1);material.uniforms.fieldScale.value.set(x,y)},update(elapsed:number,view:View){material.uniforms.time.value=elapsed;material.uniforms.focus.value=view.amount;material.uniforms.systemFrame.value=view.frame;const colors:Record<string,number[]>={Mars:[.25,.12,.06],Venus:[.24,.17,.07],Europa:[.16,.20,.13],Jupiter:[.17,.15,.08],Neptune:[.03,.12,.35],Uranus:[.06,.22,.25],Deimos:[.37,.06,.025],Sedna:[.22,.11,.05],Void:[.13,.17,.4]};const color=colors[view.focus||'']||[.06,.17,.18];material.uniforms.tint.value.set(...color as [number,number,number]);material.uniforms.pan.value.set(view.panX,view.panY);starMat.uniforms.time.value=elapsed;starMat.uniforms.density.value=1.-view.amount*.12;stars.position.x=view.panX*.035;stars.position.y=-view.panY*.035;stars.rotation.z=Math.sin(elapsed*.006)*.0007;},dispose(){geometry.dispose();material.dispose();starsGeo.dispose();starMat.dispose()}};
}
