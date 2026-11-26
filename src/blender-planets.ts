import * as THREE from 'three';
import catalog from '../web/assets/planets.json';

// Every body on the star chart is one of the planets baked in Blender
// (blender/planetgen -> web/assets/planets). The textures are read straight from
// web/assets/planets, so re-baking in Blender updates the chart as well.
// Change a value below to give a chart body a different Blender world.
export const blenderTypeFor:Record<string,string>={
 Mercury:'mesa',Venus:'veil',Earth:'terra',Lua:'luna',
 Mars:'dune',Phobos:'tholos',Deimos:'sulfura',
 Jupiter:'jovian',Europa:'glacier',Ceres:'halite',
 Saturn:'saturn',Uranus:'cyane',Neptune:'neptune',Pluto:'sylva',Sedna:'prisma'
};

export type BlenderDef={
 id:string;name:string;kind:string;tilt:number;
 atmo:{color:number[];thickness:number;intensity:number;sunset:number[]}|null;
 spec:number;emissive_strength:number;emissive_always?:boolean;
 clouds:number;cloud_speed?:number;lunar:number;
 rings?:{inner:number;outer:number};
};
const defs=new Map<string,BlenderDef>((catalog.planets as unknown as BlenderDef[]).map(d=>[d.id,d]));
export const blenderDef=(planetName:string)=>defs.get(blenderTypeFor[planetName]||'luna')!;
export const blenderTypeOf=(planetName:string)=>blenderTypeFor[planetName]||'luna';

const maps=import.meta.glob('../web/assets/planets/*/{color,color_4k,clouds,normal,spec,emissive,rings}.{webp,png}',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const portraits=import.meta.glob('../renders/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const mapUrl=(type:string,file:string)=>maps[`../web/assets/planets/${type}/${file}.webp`]||maps[`../web/assets/planets/${type}/${file}.png`];
// Full Blender portrait render of a planet, used for the mission banner.
export const portraitUrl=(planetName:string)=>portraits[`../renders/${blenderTypeOf(planetName)}.png`];

function placeholder(r:number,g:number,b:number){const t=new THREE.DataTexture(new Uint8Array([r,g,b,255]),1,1);t.needsUpdate=true;return t}
export const blankMaps={black:placeholder(0,0,0),flat:placeholder(128,128,255)};

export type TextureBank={
 load(url:string|undefined,srgb:boolean):Promise<THREE.Texture|null>;
 dispose():void;
};
// One shared loader and cache, so a texture is fetched and uploaded once.
export function createTextureBank(renderer:THREE.WebGLRenderer):TextureBank{
 const loader=new THREE.TextureLoader(),cache=new Map<string,Promise<THREE.Texture|null>>(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 return {
  load(url,srgb){
   if(!url)return Promise.resolve(null);
   const key=url+(srgb?'|s':'');let hit=cache.get(key);
   if(!hit){
    hit=new Promise(resolve=>loader.load(url,texture=>{
     texture.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
     texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;texture.anisotropy=anisotropy;texture.needsUpdate=true;resolve(texture);
    },undefined,()=>resolve(null)));
    cache.set(key,hit);
   }
   return hit;
  },
  dispose(){cache.forEach(p=>p.then(t=>t?.dispose()));cache.clear()}
 };
}
