import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';

export class ForestWorld {
 constructor(container,onSelect){
  this.container=container;this.onSelect=onSelect;this.mode='town';this.pins=[];this.reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#e2ead7');this.scene.fog=new THREE.Fog('#e2ead7',65,120);
  this.camera=new THREE.PerspectiveCamera(40,1,.1,200);this.camera.position.set(30,28,38);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;container.append(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.maxPolarAngle=1.4;this.controls.minDistance=4;this.controls.maxDistance=75;
  this.hemi=new THREE.HemisphereLight('#fff4df','#94ac82',1.8);this.scene.add(this.hemi);
  this.sun=new THREE.DirectionalLight('#fff1d1',3);this.sun.position.set(-12,30,20);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:.5,far:80});this.sun.shadow.normalBias=.05;this.scene.add(this.sun);
  const fill=new THREE.DirectionalLight('#e5f0ec',.8);fill.position.set(15,14,-8);this.scene.add(fill);
  this.pinLayer=document.createElement('div');this.pinLayer.className='world-pins';container.append(this.pinLayer);
  this.walkPosition=new THREE.Vector3(0,.3,5);this.raycaster=new THREE.Raycaster();this.ground=new THREE.Plane(new THREE.Vector3(0,1,0),-.3);
  this.renderer.domElement.addEventListener('pointerdown',e=>{this.pointerStart=[e.clientX,e.clientY];});
  this.renderer.domElement.addEventListener('pointerup',e=>{if(this.mode!=='town'||!this.localResident?.ready||!this.pointerStart||Math.hypot(e.clientX-this.pointerStart[0],e.clientY-this.pointerStart[1])>6)return;const r=this.renderer.domElement.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);const hit=new THREE.Vector3();if(this.raycaster.ray.intersectPlane(this.ground,hit)){const distance=Math.hypot(hit.x,hit.z);if(distance>10){hit.x*=10/distance;hit.z*=10/distance;}this.walkTarget=hit;}});
  this.resize=()=>{const w=container.clientWidth,h=container.clientHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);};this.resize();window.addEventListener('resize',this.resize);
  this.clock=new THREE.Clock();this.animate();
 }
 async load(){
  const decoder=new DRACOLoader().setDecoderPath('./vendor/draco/').setWorkerLimit(2);const loader=new GLTFLoader().setDRACOLoader(decoder);const [g,a]=await Promise.all([loader.loadAsync('./assets/opening-day.glb'),loader.loadAsync('./assets/resident-v2.glb')]);decoder.dispose();
  this.town=g.scene;this.scene.add(this.town);this.interior=this.town.getObjectByName('Interior');this.interior.removeFromParent();this.scene.add(this.interior);this.interior.visible=false;
  this.avatarSource=a.scene.getObjectByName('AvatarStudio')||a.scene;this.avatar=this.avatarSource.clone(true);this.avatar.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});this.scene.add(this.avatar);this.avatar.visible=false;
  this.town.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.side=THREE.DoubleSide;}});
  this.interior.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.side=THREE.DoubleSide;}});
  this.cabins=Array.from({length:12},(_,i)=>this.town.getObjectByName('Cabin_'+String(i).padStart(2,'0')));this.tree=this.town.getObjectByName('TogetherTree');
  this.setProjects({});this.showTown();return this;
 }
 focus(pos,target){this.move={p:this.camera.position.clone(),t:this.controls.target.clone(),end:new THREE.Vector3(...pos),aim:new THREE.Vector3(...target),start:performance.now()};}
 showTown(){if(!this.town)return;this.mode='town';this.town.visible=true;this.interior.visible=false;this.avatar.visible=!!this.localResident?.ready;if(this.avatar.visible){this.avatar.position.copy(this.walkPosition);this.avatar.scale.setScalar(1.35);this.styleAvatar(this.localResident.appearance);}this.focus(innerWidth>800?[26,30,33]:[30,28,38],[innerWidth>800?-4:0,innerWidth>800?-2:1,0]);this.refreshPins();}
 showAvatar(appearance){if(!this.town)return;this.mode='avatar';this.town.visible=false;this.interior.visible=true;this.avatar.visible=true;this.avatar.position.set(0,.27,1.9);this.avatar.rotation.set(0,.12,0);this.avatar.scale.setScalar(1.65);this.styleAvatar(appearance);this.focus([4.2,3.4,8.4],[-.3,1.7,1.8]);this.clearPins();}
 styleAvatar(s={}){this.avatar?.traverse(o=>{if(o.name.startsWith('Body_'))o.visible=o.name==='Body_'+(s.body||'neutral');if(/^Hair_[0-3]$/.test(o.name))o.visible=o.name==='Hair_'+(s.hairstyle??1);if(!o.isMesh)return;const n=o.material.name;if(n==='avatar_skin')o.material.color.set(s.skin||'#deb896');if(n==='avatar_hair')o.material.color.set(s.hair||'#594334');if(n==='avatar_outfit')o.material.color.set(s.outfit||'#a0ad87');});}
 showHome(resident,section='door'){
  if(!this.town)return;this.mode='home';this.home=resident;this.town.visible=false;this.interior.visible=true;this.avatar.visible=true;this.avatar.scale.setScalar(1);this.avatar.position.set(2.1,.26,1.5);this.avatar.rotation.set(0,-.5,0);this.styleAvatar(resident.appearance);this.interior.traverse(o=>{if(o.isMesh&&o.material.name==='roof'){if(!o.userData.personal){o.material=o.material.clone();o.userData.personal=true;}o.material.color.set(resident.houseColor||'#829475');}});
  this.focus([8.6,7.3,10.5],[innerWidth>800?-1.1:0,1,0]);this.clearPins();
  [['door','居民木牌',[-1.2,1.85,2.5]],['archive','森友档案袋',[-2.32,1.9,-1.5]],['table','窗边会客桌',[.65,1.4,-.45]],['mail','门口信箱',[2.6,1.1,2.35]]].forEach(([id,label,pos])=>this.addPin(id,label,new THREE.Vector3(...pos),()=>this.onSelect({type:'section',id})));
 }
 setResidents(residents){this.residents=residents;this.neighborhood=Math.min(this.neighborhood||0,Math.max(0,Math.ceil(residents.length/12)-1));if(this.mode==='town')this.refreshPins();}
 setLocalResident(resident){this.localResident=resident;if(this.mode==='town'&&this.avatar){this.avatar.visible=!!resident?.ready;this.avatar.scale.setScalar(1.35);this.avatar.position.copy(this.walkPosition);if(resident)this.styleAvatar(resident.appearance);}}
 setProjects(projects={}){this.projects=projects;this.town?.traverse(o=>{const match=/^Project_(welcome|garden|species)_([0-3])$/.exec(o.name);if(match)o.visible=!!projects[match[1]]?.submitted&&projects[match[1]].choices.includes(Number(match[2]));});}
 clearPins(){this.pins.forEach(p=>p.el.remove());this.pins=[];this.neighborhoodControl?.remove();}
 addPin(id,label,position,callback){const el=document.createElement('button');el.className='world-pin';el.textContent=label;el.onclick=callback;el.setAttribute('aria-label',label);this.pinLayer.append(el);this.pins.push({id,el,position});}
 refreshPins(){this.clearPins();if(this.mode!=='town'||!this.cabins)return;
  const start=(this.neighborhood||0)*12,neighbors=(this.residents||[]).slice(start,start+12);
  this.cabins.forEach((c,i)=>{c.traverse(o=>{if(!o.isMesh||!['roof','terracotta','rooflight'].includes(o.material.name))return;if(!o.userData.originalColor){o.userData.originalColor=o.material.color.clone();o.material=o.material.clone();}o.material.color.copy(o.userData.originalColor);if(neighbors[i]?.houseColor)o.material.color.set(neighbors[i].houseColor);});});
  neighbors.forEach((r,i)=>{const p=this.cabins[i].position.clone();p.y=3.2;this.addPin(r.id,r.name+'的小屋',p,()=>this.onSelect({type:'resident',id:r.id}));});
  this.neighborhoodControl?.remove();const count=Math.ceil((this.residents?.length||0)/12);if(count>1){const nav=document.createElement('nav');nav.className='neighborhood-control';nav.setAttribute('aria-label','选择小镇街区');for(let i=0;i<count;i++){const b=document.createElement('button');b.textContent=`街区 ${i+1}`;b.setAttribute('aria-pressed',i===(this.neighborhood||0));b.onclick=()=>{this.neighborhood=i;this.refreshPins();};nav.append(b);}this.container.append(nav);this.neighborhoodControl=nav;}
  this.addPin('commons','合种广场',new THREE.Vector3(0,2.8,0),()=>this.onSelect({type:'commons'}));this.addPin('species','森林物种角',new THREE.Vector3(8,1.5,13),()=>this.onSelect({type:'species'}));
 }
 setEnergy(value,ceremony=false){if(!this.tree)return;const s=.7+Math.min(value/100,1)*.3;this.tree.scale.setScalar(ceremony?1.13:s);this.sun.intensity=ceremony?2.3:3;this.scene.background.set(ceremony?'#e5d9bb':'#e2ead7');this.scene.fog.color.copy(this.scene.background);}
 snapshot(){this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
 animate(){requestAnimationFrame(()=>this.animate());const now=performance.now(),dt=Math.min(this.clock.getDelta(),.05);if(this.mode==='town'&&this.avatar?.visible&&this.walkTarget){const delta=this.walkTarget.clone().sub(this.walkPosition);delta.y=0;const distance=delta.length();if(distance<.08){this.walkTarget=null;this.avatar.position.copy(this.walkPosition);}else{delta.normalize();this.walkPosition.addScaledVector(delta,Math.min(distance,dt*3.5));this.avatar.position.copy(this.walkPosition);if(!this.reduced)this.avatar.position.y+=Math.abs(Math.sin(now*.012))*.06;this.avatar.rotation.y=Math.atan2(delta.x,delta.z);}}if(this.move){const f=Math.min(1,(now-this.move.start)/(this.reduced?1:1000)),t=1-(1-f)**3;this.camera.position.lerpVectors(this.move.p,this.move.end,t);this.controls.target.lerpVectors(this.move.t,this.move.aim,t);if(f===1)this.move=null;}this.controls.update();for(const p of this.pins){const v=p.position.clone().project(this.camera);p.el.style.left=(v.x*.5+.5)*this.container.clientWidth+'px';p.el.style.top=(-v.y*.5+.5)*this.container.clientHeight+'px';p.el.hidden=v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;}this.renderer.render(this.scene,this.camera);}
}
