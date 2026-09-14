import * as THREE from 'three';

// Remap the existing Blender wood grain into pale natural timber, preserving
// the source UVs and normal maps instead of washing detail out with exposure.
const woodRanges={
 cedar:['#c79a62','#efd2a8'],
 cedarLight:['#d8b483','#f6dfb9'],
 honey:['#c49052','#eac68e'],
 roof:['#a98d69','#d4b78b'],
};
const vector=hex=>new THREE.Color(hex).toArray().map(v=>v.toFixed(5)).join(',');
export function warmMaterials(root){
 const seen=new Set();
 root.traverse(o=>{
  if(!o.isMesh||!o.material||seen.has(o.material.uuid))return;
  const m=o.material;seen.add(m.uuid);
  const key=m.name.startsWith('shingle')?'roof':m.name;
  if(woodRanges[key]){
   const [lo,hi]=woodRanges[key];m.color.set('#ffffff');m.roughness=.82;m.metalness=0;
   m.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
     float woodGrain = smoothstep(0.025, 0.48, dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722)));
     diffuseColor.rgb = mix(vec3(${vector(lo)}), vec3(${vector(hi)}), woodGrain);
    `);
   };
   m.customProgramCacheKey=()=>`senyou-light-timber-${key}`;
   m.emissive.set(lo);m.emissiveIntensity=.035;
  }else if(m.name==='darkwood'){m.map=null;m.color.set('#ae8251');m.roughness=.85;}
  else if(m.name==='bark'){m.map=null;m.color.set('#a58b64');m.roughness=1;}
  else if(m.name==='plaster'){m.color.set('#fff1d6');}
  else if(m.name==='grass'){m.color.set('#a5b77e');}
  else if(m.name==='earth'){m.map=null;m.color.set('#978264');}
  else if(m.name==='stone'){m.map=null;m.color.set('#d8cbb1');}
  else if(m.name==='moss'){m.color.set('#91a771');}
  else if(m.name==='linen'){m.color.set('#f8e8cc');}
  else if(m.name==='sage'){m.color.set('#a0b08b');}
  else if(m.name==='terra'){m.color.set('#d69b78');}
  m.needsUpdate=true;
 });
}
