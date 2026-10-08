import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { SPACES } from "./data.js?v=village-v4";
import { findPath, journey } from "./journey.js?v=cognition-v2";
import { ForestCamera } from "./camera.js?v=cognition-v2";
import { PLOTS, DISTRICTS, ENTRY, MAYOR, SPACE_POS, address, outdoorWalkable } from "./layout.js";
import { houseStage } from "./settlement.js?v=cognition-v2";
import { cognition, DIMS, sample, BOOKS } from './cognition-data.js?v=cognition-v2';
export class ForestWorld {
  constructor(el, onSelect) {
    this.el = el;
    this.onSelect = onSelect;
    this.pins = [];
    this.keys = {};
    this.joy = { x: 0, y: 0 };
    this.mode = "overview";
    this.blocked = false;
    this.metrics = { frames: 0, seconds: 0 };
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.scene = new T.Scene();
    this.scene.background = new T.Color("#dce8d1");
    this.scene.fog = new T.Fog("#dce8d1", 360, 650);
    this.camera = new T.PerspectiveCamera(38, 1, 0.1, 650);
    this.camera.position.set(28, 36, 46);
    this.renderer = new T.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    el.append(this.renderer.domElement);
    this.scene.add(new T.HemisphereLight("#fff5df", "#a4b995", 2.2));
    const sun = new T.DirectionalLight("#fff2d6", 2.4);
    sun.position.set(-14, 28, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -62,
      right: 62,
      top: 62,
      bottom: -62,
      near: 1,
      far: 150,
    });
    sun.shadow.normalBias = 0.12;
    sun.shadow.bias = -0.00035;
    this.scene.add(sun);
    this.layer = document.createElement("div");
    this.layer.className = "pins";
    el.append(this.layer);
    this.playerLabel=document.createElement('div');this.playerLabel.className='player-label';el.append(this.playerLabel);
    this.ray = new T.Raycaster();
    this.plane = new T.Plane(new T.Vector3(0, 1, 0), -0.32);
    this.pos = new T.Vector3(0, 0.32, 4.5);
    this.cameraRig = new ForestCamera(this);
    window.addEventListener("keydown", (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || this.blocked)
        return;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
      this.keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "e") this.interact(this.nearest);
    });
    window.addEventListener(
      "keyup",
      (e) => (this.keys[e.key.toLowerCase()] = false),
    );
    window.addEventListener("blur", () => {
      this.keys = {};
      this.joy = { x: 0, y: 0 };
    });
    this.resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener("resize", this.resize);
    this.resize();
    this.last = performance.now();
    this.tick();
  }
  async load() {
    const draco = new DRACOLoader()
      .setDecoderPath("../vendor/draco/")
      .setWorkerLimit(2);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    try {
      const gltf = await loader.loadAsync("./assets/forest.glb?v=village-v4");
      this.root = gltf.scene;
      this.scene.add(this.root);
      this.village = this.root.getObjectByName("Village");
      this.home = this.root.getObjectByName("Home");
      const added=await loader.loadAsync('./assets/cognition.glb?v=cognition-v2');
      this.cognitionRoom=added.scene.getObjectByName('CognitionRoom');
      this.home.add(this.cognitionRoom);
      this.styleTemplates=added.scene.getObjectByName('StyleTemplates');
      this.privateGate=this.cognitionRoom.getObjectByName('PrivateGate').clone(true);
      this.cognitionRoom.getObjectByName('PrivateGate').visible=false;
      this.home.add(this.privateGate);
      this.lightPools=Array.from({length:4},(_,i)=>this.cognitionRoom.getObjectByName('LightPool_'+i));
      this.studyLights=this.lightPools.map((pool,i)=>{const light=new T.PointLight(['#ffe2a5','#f7d694','#fff5df','#efb277'][i],1.4,6,2);light.position.copy(pool.position).add(new T.Vector3(0,2.1,0));this.home.add(light);return light;});
      this.avatar = this.root.getObjectByName("Avatar");
      this.root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.material.side = T.DoubleSide;
          o.material.shadowSide = T.FrontSide;
          if(o.name.startsWith('Terrain_'))o.castShadow=false;
        }
      });
      this.avatar.traverse((o) => {
        if (o.isMesh) o.material = o.material.clone();
      });
      this.mayor = this.avatar.clone(true);
      this.mayor.traverse((o) => {
        if (o.isMesh) o.material = o.material.clone();
      });
      this.village.add(this.mayor);
      this.mayor.position.set(MAYOR[0], 0.33, MAYOR[1]);
      this.mayor.rotation.y = 0.4;
      this.home.visible = false;
      this.avatar.visible = false;
      // Reuse the Blender camera as a dedicated, reachable photo object.
      const photo = this.home.getObjectByName('Camera').clone(true);
      photo.name='PhotoStand'; photo.visible=true;
      const bounds=new T.Box3().setFromObject(photo), center=bounds.getCenter(new T.Vector3());
      photo.position.add(new T.Vector3(.25-center.x,.55-bounds.min.y,2.6-center.z));
      this.home.add(photo);
      this.templates=this.root.getObjectByName('Templates');
      this.templates.visible=false;
      this.plots=PLOTS.map(p=>{
        const group=new T.Group();group.name='Plot_'+p.id;group.position.set(p.x,0,p.z);this.village.add(group);
        const parts={};
        for(const key of ['PlotGround','Construction','HouseFrame','Cabin_00','WelcomeGarden']) {
          parts[key]=this.templates.getObjectByName(key).clone(true);
          parts[key].visible=false;group.add(parts[key]);
        }
        return {group,parts,stage:null};
      });
      this.overview();
      return this;
    } finally {
      draco.dispose();
    }
  }
  style(appearance = {}) {
    this.avatar?.traverse((o) => {
      if (!o.isMesh) return;
      const key = { outfit: "outfit", skin: "skin", hair: "hair" }[
        o.material.name
      ];
      if (key) o.material.color.set(appearance[key] || "#91a486");
    });
  }
  setState(s, { profileOnly = false } = {}) {
    const previous = this.state;
    this.state = s;
    // Autosave is not a scene change. Keep labels, routes and HUD nodes intact.
    if (profileOnly && previous?.actor === s.actor) {
      const before = previous.residents.find(r => r.id === s.actor)?.appearance;
      const after = s.residents.find(r => r.id === s.actor)?.appearance;
      if (JSON.stringify(before) !== JSON.stringify(after)) { this.style(after); this.updateSettlement(); }
      return;
    }
    this.style(s.residents.find((r) => r.id === s.actor)?.appearance);
    this.mayor?.traverse((o) => {
      if (o.isMesh && o.material.name === "outfit")
        o.material.color.set(
          s.village.appearance === "earth"
            ? "#bb8c67"
            : s.village.appearance === "blue"
              ? "#789ca5"
              : "#718962",
        );
    });
    if (this.village) {this.updateSettlement();this.refreshPins();}
    this.updateGarden();
  }
  updateSettlement() {
    this.plots?.forEach((plot,i)=>{
      const r=this.state.residents.find(r=>r.plot===i), stage=houseStage(r);
      const changing=plot.stage!==null && plot.stage!==stage;
      plot.stage=stage;plot.resident=r?.id||null;
      const shown={PlotGround:true,Construction:stage==='claimed'||stage==='building',HouseFrame:stage==='building',Cabin_00:stage==='decorating'||stage==='ready',WelcomeGarden:stage==='ready'};
      for(const [key,obj] of Object.entries(plot.parts))obj.visible=shown[key];
      if(r && plot.color!==r.appearance.outfit) {
        plot.parts.Cabin_00.traverse(o=>{if(o.isMesh&&o.material.name==='terracotta') {if(!o.userData.individualRoof){o.material=o.material.clone();o.userData.individualRoof=true;}o.material.color.set(r.appearance.outfit);}});
        plot.color=r.appearance.outfit;
      }
      if(changing && !this.reduced) {plot.start=performance.now();plot.group.scale.y=.2;}
    });
    this.updateExteriorStyles();
    this.neighbours ||= new Map();
    const residents=this.state.residents.filter(r=>r.arrived&&r.simulated&&r.id!==this.state.actor&&Number.isInteger(r.plot)).slice(0,8);
    for(const [id,n] of this.neighbours)if(!residents.some(r=>r.id===id)) {n.model.removeFromParent();this.neighbours.delete(id);}
    for(const r of residents) {
      if(this.neighbours.has(r.id))continue;
      const model=this.avatar.clone(true);model.visible=true;
      model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(r.appearance[o.material.name])o.material.color.set(r.appearance[o.material.name]);}});
      model.position.set(MAYOR[0]+1,.32,MAYOR[1]+2);this.village.add(model);
      const route=findPath([model.position.x,model.position.z],this.homePoint(r.id),outdoorWalkable);
      this.neighbours.set(r.id,{model,route,target:null});
    }
  }
  updateGarden() {
    if (!this.home || !this.state) return;
    const layout =
      this.state.publicResults[`${this.state.actor}:garden-layout`];
    const key = JSON.stringify(layout);
    if (this.gardenKey === key) return;
    this.gardenKey = key;
    this.garden?.removeFromParent();
    this.garden = new T.Group();
    this.village.add(this.garden);
    if (!layout) return;
    layout.forEach((v, i) => {
      if (!v) return;
      const source = this.home.getObjectByName("FlowerDecor");
      const item = source.clone(true);
      item.visible = true;
      const box = new T.Box3().setFromObject(item),
        c = box.getCenter(new T.Vector3());
      item.position.sub(new T.Vector3(c.x, box.min.y, c.z));
      const wrap = new T.Group();
      wrap.add(item);
      wrap.scale.setScalar(v === 1 ? 0.65 : 0.95);
      wrap.position.set(
        SPACE_POS.play[0]-.9 + (i % 3) * 0.8,
        0.42,
        SPACE_POS.play[1]+1 + Math.floor(i / 3) * 0.65,
      );
      this.garden.add(wrap);
    });
  }
  overview() {
    this.mode = "overview";
    this.village.visible = true;
    this.home.visible = false;
    this.avatar.visible = false;
    this.cancelRoute();
    this.refreshPins();
    this.cameraRig.frame();
  }
  town(position = ENTRY) {
    this.mode = "town";
    this.village.visible = true;
    this.home.visible = false;
    this.avatar.visible = true;
    this.pos.set(position[0], 0.32, position[1]);
    this.cancelRoute();
    this.refreshPins();
    this.cameraRig.frame();
  }
  returnToPlayer() {
    this.mode='town';this.avatar.visible=true;this.cameraRig.frame();
    window.dispatchEvent(new Event('forest-mode'));
  }
  showHome(r) {
    this.cancelRoute();
    this.mode = "home";
    this.studyOpen=false;
    this.resident = r;
    this.village.visible = false;
    this.home.visible = true;
    this.avatar.visible = true;
    this.pos.set(1.7, 0.33, 2.7);
    this.cameraRig.frame();
    this.target = null;
    this.updateProps(r);
    this.home.getObjectByName('PhotoStand').visible=r.id===this.state.actor && r.confirmed;
    this.home.getObjectByName("FlowerDecor").visible =
      r.decor.includes("flowers");
    this.home.getObjectByName("PlantDecor").visible =
      journey(r).stations.includes('interest') || r.decor.includes("fern");
    this.updateDoorText(r);
    this.home.getObjectByName("GiftDecor").visible = this.state.gifts.some(
      (g) => g.to === r.id && g.status === "pending",
    );
    const pendingGift = this.state.gifts.find(
      (g) => g.to === r.id && g.status === "pending",
    );
    const giftItem = this.state.items.find((i) => i.id === pendingGift?.item);
    this.home.getObjectByName("GiftDecor").traverse((o) => {
      if (o.isMesh && o.material.name === "terracotta") {
        if (!o.userData.cloned) {
          o.material = o.material.clone();
          o.userData.cloned = true;
        }
        o.material.color.set(giftItem?.color || "#c78160");
      }
    });
    this.home.getObjectByName("Rug").traverse((o) => {
      if (o.isMesh) {
        if (!o.userData.cloned) {
          o.material = o.material.clone();
          o.userData.cloned = true;
        }
        o.material.color.set(r.decor.includes("rug") ? "#d2a27e" : "#e5d8b7");
      }
    });
    this.refreshPins();
    this.updateCognitionScene();
  }
  updateDoorText(r) {
    const line=r.profile.collaboration||r.profile.headline;
    const labelKey=r.id+':'+r.name+':'+line;
    if(this.doorTextKey!==labelKey) {
      this.doorTextKey=labelKey;
      if(this.doorText) {this.doorText.removeFromParent();this.doorText.geometry.dispose();this.doorText.material.map.dispose();this.doorText.material.dispose();}
      const c=document.createElement('canvas');c.width=512;c.height=160;
      const ctx=c.getContext('2d');ctx.fillStyle='#fff0d2';ctx.fillRect(0,0,512,160);ctx.fillStyle='#36553e';ctx.textAlign='center';ctx.font='bold 44px sans-serif';ctx.fillText(line ? r.name+'的小屋' : '等待我的故事',256,65,480);ctx.font='24px sans-serif';ctx.fillText((line||'走近，挂上你的门牌').slice(0,19),256,118,480);
      const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
      this.doorText=new T.Mesh(new T.PlaneGeometry(1.4,.44),new T.MeshBasicMaterial({map:texture}));this.doorText.position.set(-1,1.53,3.24);this.home.add(this.doorText);
    }
  }
  enterStudy() {
    if(this.mode!=='home'||this.resident?.id!==this.state.actor)return false;
    this.studyOpen=true;this.refreshPins();
    this.walkTo([4.7,0]);this.cameraRig.frame();return true;
  }
  leaveStudy() {this.studyOpen=false;this.cancelRoute();this.pos.set(3.1,.33,0);this.refreshPins();this.cameraRig.frame();}
  updateCognitionScene() {
    if(!this.cognitionRoom||!this.state)return;
    this.updateExteriorStyles();
    const own=this.resident?.id===this.state.actor,c=cognition(this.state);
    this.cognitionRoom.visible=this.mode==='home'&&own;
    this.studyLights.forEach((light,i)=>{light.visible=this.mode==='home'&&own&&!!c&&c.lightOn[i];});
    if(!own||!c){this.lightPools.forEach(pool=>pool.visible=false);this.cognitionRoom.getObjectByName('ReactionBubbles').visible=false;for(let i=0;i<2;i++)this.cognitionRoom.getObjectByName('ReactionFlow_'+i).visible=false;return;}
    this.lightPools.forEach((pool,i)=>pool.visible=c.lightOn[i]);
    const bubbles=this.cognitionRoom.getObjectByName('ReactionBubbles'),focus=c.lab?.focus||'bubble';
    bubbles.visible=!!c.lab&&c.lab.step>=2&&['bubble','delay'].includes(focus);
    this.reactionFocus=focus;this.reactionStarted=performance.now();
    for(let i=0;i<2;i++)this.cognitionRoom.getObjectByName('ReactionFlow_'+i).visible=!!c.lab&&c.lab.step>=2;
    bubbles.scale.setScalar((focus==='stable'?.3:focus==='resonance'?.7:1)*(1-(c.lab?.checks.length||0)*.08));
    const reactionColor={stable:'#83B98C',resonance:'#91C9A1',bubble:'#E0C56F',delay:'#CF8D78',none:'#A3A6A0'}[focus];
    for(const group of [bubbles,this.cognitionRoom.getObjectByName('ReactionDish')])group.traverse(o=>{if(o.isMesh&&o.material.name!=='cream'){if(!o.userData.reactionMaterial){o.material=o.material.clone();o.userData.reactionMaterial=true;}o.material.color.set(reactionColor);o.material.emissive.set(focus==='resonance'?reactionColor:'#000000');o.material.emissiveIntensity=focus==='resonance'?.3:0;}});
    BOOKS.forEach((book,i)=>{const o=this.cognitionRoom.getObjectByName('BehaviorBook_'+i);o.rotation.z=c.bookMarks[book.id]?.turned?0:book.kind==='shadow'?.38:0;o.rotation.y=book.kind==='secondary'?Math.PI/2:0;o.scale.setScalar(c.bookMarks[book.id]?.match==='no'?.82:1);if(book.kind==='pressure')o.traverse(child=>{if(child.isMesh&&child.material.name==='water'){if(!child.userData.pressureGlass){child.material=child.material.clone();child.material.transparent=true;child.material.opacity=.55;child.userData.pressureGlass=true;}child.visible=!c.stormUnlocked;}});});
    for(let i=0;i<3;i++) {const window=this.cognitionRoom.getObjectByName('StateWindow_'+i);window.userData.open=c.window===['natural','work','pressure'][i];}
  }
  updateExteriorStyles() {
    if(!this.styleTemplates||!this.state)return;
    for(const plot of this.plots||[]){const c=cognition(this.state,plot.resident),r=this.state.residents.find(x=>x.id===plot.resident);
      const key=JSON.stringify([plot.resident,c?.mix,!!r?.built]);if(plot.cognitionKey===key)continue;plot.cognitionKey=key;
      if(!c){if(plot.styleProps)plot.styleProps.visible=false;plot.parts.Cabin_00.scale.y=1;continue;}
      if(!plot.styleProps){plot.styleProps=new T.Group();DIMS.forEach(dim=>plot.styleProps.add(this.styleTemplates.getObjectByName('Style_'+dim).clone(true)));plot.group.add(plot.styleProps);}
      plot.styleProps.visible=!!r?.built;plot.styleProps.children.forEach((o,i)=>o.scale.setScalar(.35+c.mix[i]/100*.8));
      const roof=plot.parts.Cabin_00;roof.scale.y=.85+c.mix[0]/100*.3;
      roof.traverse(o=>{if(o.isMesh&&o.material.name==='roof'){if(!o.userData.cognitionMaterial){o.material=o.material.clone();o.userData.cognitionMaterial=true;}o.material.color.set(new T.Color('#829475').lerp(new T.Color('#a4b991'),c.mix[2]/150));}});
    }
  }
  updateProps(r) {
    if (!this.home) return;
    const pinsChanged = this.resident?.id !== r.id || this.resident?.confirmed !== r.confirmed ||
      JSON.stringify(journey(this.resident || r).stations) !== JSON.stringify(journey(r).stations);
    this.resident = r;
    this.updateDoorText(r);
    this.home.getObjectByName('PhotoStand').visible=r.id===this.state.actor && r.confirmed;
    // Empty physical stations remain in the room: they are where expression begins.
    this.home.getObjectByName("GiftDecor").visible=this.state.gifts.some(g=>g.to===r.id && g.status==='pending');
    const pending=this.state.gifts.filter(g=>g.to===r.id&&g.status==='pending').length;
    if(!this.mailFlag) {
      this.mailFlag=new T.Group();
      const pole=new T.Mesh(new T.CylinderGeometry(.022,.022,.62,6),new T.MeshStandardMaterial({color:'#785c3d'}));
      const flag=new T.Mesh(new T.BoxGeometry(.32,.21,.035),new T.MeshStandardMaterial({color:'#df8d50'}));
      flag.position.set(.15,.2,0);this.mailFlag.add(pole,flag);this.mailFlag.position.set(3,1.7,2.9);this.home.add(this.mailFlag);
    }
    this.mailFlag.visible=!!pending;
    const mail=this.pins.find(p=>p.key==='mail');
    if(mail && this.mode==='home') {
      const label=r.id===this.state.actor ? pending?`我的信箱 · ${pending} 份新礼物`:'我的礼物信箱' : '给他留礼物';
      mail.label=label;if(mail.el.textContent!==label)mail.el.textContent=label;
    }
    const completed=journey(r).stations;
    this.home.getObjectByName("Camera").visible = completed.includes('interest');
    this.home.getObjectByName("Book").visible = true;
    this.home.getObjectByName("Wish").visible = true;
    this.home.getObjectByName("Wish").traverse(o=>{if(o.isMesh&&['water','paper'].includes(o.material.name))o.visible=completed.includes('wish');});
    this.home.getObjectByName("Doorplate").visible = true;
    this.home.getObjectByName("PlantDecor").visible =
      completed.includes('interest') || r.decor.includes("fern");
    this.home.getObjectByName("Rug").visible=completed.includes('table') || r.decor.includes('rug');
    if (pinsChanged && this.mode === 'home') this.refreshPins();
  }
  pin(label, pos, callback, key, approach) {
    const existing = this.pinPool?.get(key);
    if (existing) {
      this.pinPool.delete(key);
      existing.label = label;
      existing.callback = callback;
      existing.pos.set(...pos);
      existing.approach = approach || [pos[0], pos[2]];
      if (existing.el.textContent !== label) existing.el.textContent = label;
      existing.el.title = label + " · 点击走过去";
      this.pins.push(existing);
      return;
    }
    const el = document.createElement("button");
    el.className = "world-pin";
    el.textContent = label;
    el.title = label + " · 点击走过去";
    el.dataset.key = key;
    el.style.visibility='hidden';
    const pin = { el, label, pos: new T.Vector3(...pos), callback, key, approach: approach || [pos[0], pos[2]] };
    el.onclick = e => { if(e.detail===0 || performance.now()>this.cameraRig.suppressClickUntil) this.interact(pin); };
    this.layer.append(el);
    this.pins.push(pin);
  }
  cancelRoute() {
    this.target = null;
    this.route = [];
    this.pending = null;
    if (this.routeLine) { this.routeLine.removeFromParent(); this.routeLine.geometry.dispose(); this.routeLine.material.dispose(); this.routeLine = null; }
  }
  distance(pin) { return Math.hypot(this.pos.x-pin.approach[0], this.pos.z-pin.approach[1]); }
  interact(pin) {
    if (!pin || this.blocked) return;
    if (this.mode === "overview") this.returnToPlayer();
    if (this.distance(pin) < 0.75) { this.cancelRoute(); this.lastInteraction={key:pin.key,distance:this.distance(pin)}; pin.callback(); return; }
    this.walkTo(pin.approach, pin);
  }
  walkTo(point, pin = null) {
    this.cancelRoute();
    this.route = findPath([this.pos.x,this.pos.z],point,(x,z)=>this.walkable(x,z),this.mode==="home");
    this.pending = pin;
    if (!this.route.length) { this.pending=null; if(pin)this.onSelect({type:'blockedPath'}); return; }
    const points=[this.pos.clone(), ...this.route.map(([x,z])=>new T.Vector3(x,.39,z))];
    this.routeLine=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xffe4a8,transparent:true,opacity:.8}));
    this.scene.add(this.routeLine);
  }
  approach(key) { this.interact(this.pins.find(p=>p.key===key)); }
  homePoint(id) {
    const r=this.state.residents.find(r=>r.id===id), p=PLOTS[r?.plot];
    return p ? [p.x,p.z+3.5] : [...ENTRY];
  }
  goHome(id, callback) {
    if(this.mode==="home") this.town(this.homePoint(this.resident.id));
    const point=this.homePoint(id);
    this.interact({key:"visit:"+id,approach:point,callback});
  }
  refreshPins() {
    if (!this.state || !this.village) return;
    // Reconcile by semantic key, instead of removing and re-adding every button.
    this.pinPool = new Map(this.pins.map(p => [p.key, p]));
    this.pins = [];
    if (this.mode === "home") {
      if(this.studyOpen&&this.resident.id===this.state.actor) {
        const rows=[['cog-report','报告匣',[10.3,1.25,1.65],[9.05,1.4]],['cog-exterior','小屋风格配方',[4.2,1.3,-.6],[4.6,-.3]],
          ['cog-window-natural','晨光窗',[5.25,2.5,-3.05],[5.25,-1.05]],['cog-window-work','工作窗',[7.5,2.5,-3.05],[7.5,-1.6]],['cog-window-pressure','风暴窗',[9.75,2.5,-3.05],[9.35,-.6]],
          ['cog-shelf','行为书架 · 16本',[5.5,1.6,-2.55],[5.4,-.9]],['cog-mirror','壁炉镜子',[9.65,2.4,-2.05],[9.35,-.6]],
          ['cog-sun','阳光配方',[8.5,1.25,-.55],[8.45,.45]],['cog-lab','合拍实验台',[7.1,1.65,1.95],[7.1,.85]],['cog-door','门牌内面',[4.3,1.9,-.95],[4.65,-.7]],
          ['cog-share','带一句话去门牌',[4.9,1.45,2.8],[5.1,1.8]],['cog-return','回到待客区',[4,1.3,0],[4.6,0]]];
        for(const [key,label,pos,point] of rows)this.pin(label,pos,()=>this.onSelect({type:'object',key}),key,point);
        for(const [id,title,pos,point] of [['stability','稳定之光',[5,.55,-1.2],[5.1,-1.05]],['recognition','认可之光',[4.7,.55,1.5],[4.8,1.05]],['autonomy','自主之光',[7.5,.55,-.7],[7.5,-.55]],['support','支持之光',[9.5,.55,-1.1],[9.35,-.6]]])this.pin(title,pos,()=>this.onSelect({type:'object',key:'cog-sun-'+id}),'cog-sun-'+id,point);
        this.finishPins();return;
      }
      if(this.resident.id===this.state.actor)this.pin('私人认知区 · 仅自己',[3.85,1.7,0],()=>this.onSelect({type:'object',key:'cog-enter'}),'cog-enter',[3.15,0]);
      for (const [key, label, pos, approach] of [
        ["door", "门牌", [-1, 1.6, 3.15], [-1,2.75]],
        ["interest", "兴趣角", [-2.4, 2.2, -2.6], [-1.75,-1.75]],
        ["table", "会客桌", [1.5, 1.3, -0.75], [2,-.25]],
        ["wish", "心愿瓶", [3, 1.6, -1.35], [2.25,-1.5]],
        ["book", "小屋里的我", [-0.1, 1.3, 0.3], [-1,.75]],
        ["mail", this.resident.id===this.state.actor ? this.state.gifts.some(g=>g.to===this.state.actor&&g.status==='pending')?'我的信箱 · 有新礼物':'我的礼物信箱' : '给他留礼物', [3, 1.6, 2.9], [2.25,2.75]],
      ])
        this.pin(label + (this.resident.id===this.state.actor && journey(this.resident).stations.includes(key) ? " ✓" : ""), pos, () => this.onSelect({ type: "object", key }), key, approach);
      if(this.resident.id===this.state.actor && this.resident.confirmed)
        this.pin('留影相机',[.25,1.15,2.6],()=>this.onSelect({type:'object',key:'photo'}),'photo',[.2,2.15]);
      this.pin(
        "走回森林",
        [1, 0.3, 3.8],
        () => this.onSelect({ type: "exit" }),
        "exit",
        [1,3],
      );
      this.finishPins();
      return;
    }
    this.pin(
      this.state.village.mayor + " · 村长",
      [MAYOR[0], 2, MAYOR[1]],
      () => this.onSelect({ type: "mayor" }),
      "mayor",
      [MAYOR[0],MAYOR[1]+1.25],
    );
    PLOTS.forEach((p) => {
      const r=this.state.residents.find(r=>r.plot===p.id),stage=houseStage(r);
      // Empty land has no fabricated resident identity. Neighbour drafts are never shown.
      const label=!r ? `${p.district} ${p.number}号 · 待入住` : r.id===this.state.actor ? !r.built ? "我的宅地 · 打开工具箱" : "我的小屋" : r.name+(stage==='ready' ? this.state.stage==='open'?" · 欢迎来坐坐":" · 已准备好" : " · 正在安家");
      this.pin(
        label,
        [p.x, r?.built?4:1.1, p.z],
        () => this.onSelect({ type: "plot", plot:p.id, id:r?.id }),
        "Plot_" + p.id,
        [p.x,p.z+3.5],
      );
      this.pins.at(-1).plot=true;this.pins.at(-1).own=r?.id===this.state.actor;
      this.pins.at(-1).el.dataset.stage=stage;
    });
    DISTRICTS.forEach((label,i)=>this.pin(label+" · 居民区",[-25,1,32-i*14],()=>{},'district-'+i,[-3,32-i*14]));
    this.pin('公共活动区',[24,1,33],()=>{},'public-zone',[20,32]);
    this.pins.filter(p=>p.key.startsWith('district-')||p.key==='public-zone').forEach(p=>{p.zone=true;p.el.disabled=true;p.el.classList.add('zone-pin');});
      for (const [key, label, , pos] of SPACES)
        this.pin(
          key === "park" ? "森友公告栏 · 大公园" : label,
          [pos[0], 2.5, pos[2]],
          () => this.onSelect({ type: "space", key }),
          "Place_" + key,
          [pos[0],pos[2]+2.5],
        );
    this.finishPins();
  }
  finishPins() {
    for (const p of this.pinPool.values()) p.el.remove();
    this.pinPool = null;
  }
  pick(e) {
    if (this.blocked || !this.root) return;
    const r = this.el.getBoundingClientRect();
    this.ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      ),
      this.camera,
    );
    const hits = this.ray.intersectObject(
      this.mode === "home" ? this.home : this.village,
      true,
    ).filter(hit=>{let o=hit.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});
    if (hits.length) {
      let o = hits[0].object;
      while (o) {
        if(this.mode==='home'&&this.studyOpen&&this.resident?.id===this.state.actor) {
          let key=o.name==='BehaviorShelf'?'cog-shelf':o.name==='DoorInside'?'cog-door':o.name==='FireplaceMirror'?'cog-mirror':o.name==='LightRecipe'?'cog-sun':o.name.startsWith('LightPool_')?'cog-sun-'+['stability','recognition','autonomy','support'][Number(o.name.slice(-1))]:o.name==='ReportFolio'?'cog-report':o.name==='ShareExit'?'cog-share':/^(LabBench|Reagent_|Reaction)/.test(o.name)?'cog-lab':null;
          if(o.name.startsWith('StateWindow_'))key='cog-window-'+['natural','work','pressure'][Number(o.name.slice(-1))];
          if(o.name.startsWith('BehaviorBook_')) {const id=Number(o.name.slice(13));this.interact({key:'cog-shelf',approach:[5.4,-.9],callback:()=>this.onSelect({type:'object',key:'cog-book-'+id})});return;}
          if(key){this.approach(key);return;}
        }
        if(o===this.privateGate&&this.resident?.id===this.state.actor){this.approach('cog-enter');return;}
        if(o===this.mayor) {this.approach('mayor');return;}
        const pin = this.pins.find((p) => p.key === o.name);
        if (pin) {
          this.interact(pin);
          return;
        }
        const objects = {
          Camera: "interest",
          Shelf: "interest",
          Book: "book",
          Table: "table",
          Wish: "wish",
          Doorplate: "door",
          Mailbox: "mail",
          PhotoStand: "photo",
        };
        if (this.mode === "home" && objects[o.name]) {
          this.approach(objects[o.name]);
          return;
        }
        o = o.parent;
      }
    }
    if (this.mode === "overview") {
      // Keep the ray from the view the player clicked before restoring the walking view.
      this.returnToPlayer();
    }
    const hit = new T.Vector3();
    if (this.ray.ray.intersectPlane(this.plane, hit)) {
      if (this.walkable(hit.x, hit.z)) this.walkTo([hit.x,hit.z]);
    }
  }
  walkable(x, z) {
    if (this.mode === "home") {
      if(this.studyOpen&&this.resident?.id===this.state.actor&&x>=3.3&&x<=10.65&&z>=-2.7&&z<=3.1) {
        if(x<4.3&&Math.abs(z)>1.2)return false;
        return !(x>4.1&&x<6.75&&z< -1.35||x>8.4&&z< -1.3||x>5.5&&x<8.7&&z>1.2||x>9.4&&z>.9);
      }
      if (x < -3.3 || x > 3.5 || z < -2.7 || z > 3.15) return false;
      return !(
        (x < -2.1 && z < 1.65) ||
        (x < -1.4 && z < -2.15) ||
        (x > 2.55 && z > 2.5) ||
        Math.hypot(x - 0.5, z + 0.3) < 1.37 ||
        (x > 2.45 && z < -0.9 && z > -1.8)
      );
    }
    return outdoorWalkable(x,z);
  }
  setBlocked(b) {
    this.cameraRig.clearEdge();
    this.blocked = b;
    this.cameraRig.controls.enabled=!b;
    if (b) {
      this.cancelRoute();
      this.keys = {};
      this.joy = { x: 0, y: 0 };
    }
  }
  clearSightline() {
    for(const mesh of this.faded || []) {mesh.material.opacity=1;mesh.material.transparent=false;mesh.material.depthWrite=true;}
    this.faded=[];
    if(this.mode==="overview")return;
    const target=this.mode==='home'||!this.cameraRig.follow ? this.cameraRig.controls.target.clone() : this.pos.clone().add(new T.Vector3(0,1.1,0));
    const direction=target.clone().sub(this.camera.position);
    const ray=new T.Raycaster(this.camera.position,direction.clone().normalize(),0,direction.length()-.3);
    const root=this.mode==="home"?this.home:this.village;
    for(const hit of ray.intersectObject(root,true)) {
      const mesh=hit.object;
      if(!mesh.visible || !/^(Plants|Cabin_|HomeShell|TogetherTree)/.test(mesh.name) || this.faded.includes(mesh))continue;
      if(!mesh.userData.sightMaterial) {mesh.material=mesh.material.clone();mesh.userData.sightMaterial=true;}
      mesh.material.transparent=true;mesh.material.opacity=.17;mesh.material.depthWrite=false;this.faded.push(mesh);
    }
  }
  tick() {
    requestAnimationFrame(() => this.tick());
    const now = performance.now(),
      raw = (now - this.last) / 1000,
      dt = Math.min(raw, 0.05);
    this.last = now;
    if(this.mode==='home'&&this.cognitionRoom?.visible) {
      for(let i=0;i<3;i++){const o=this.cognitionRoom.getObjectByName('StateWindow_'+i);o.rotation.y+=((o.userData.open?-.07:0)-o.rotation.y)*(this.reduced?1:Math.min(1,dt*6));}
      const bubbles=this.cognitionRoom.getObjectByName('ReactionBubbles');if(this.reactionFocus==='delay'&&cognition(this.state)?.lab?.step>=2)bubbles.visible=performance.now()-this.reactionStarted>1600;if(bubbles.visible&&!this.reduced){bubbles.position.y=1.32+Math.sin(now*(this.reactionFocus==='resonance'?.004:.002))*(this.reactionFocus==='stable'?.015:.12);}
    }
    this.metrics.frames++;
    this.metrics.seconds += raw;
    if (this.benchmark) {
      this.benchmark.frames++;
      const elapsed = (now - this.benchmark.start) / 1000;
      if (elapsed >= 60) {
        this.benchmarkResult = `实际采样 ${elapsed.toFixed(1)} 秒，${this.benchmark.frames} 帧，平均 ${(this.benchmark.frames / elapsed).toFixed(1)} FPS。视口 ${this.el.clientWidth} × ${this.el.clientHeight}。`;
        this.benchmark = null;
      }
    }
    if (this.avatar) {
      for(const p of this.plots||[])if(p.start) {p.group.scale.y=Math.min(1,.2+(now-p.start)/850);if(p.group.scale.y===1)p.start=null;}
      if(this.mode!=='home'&&!this.blocked)for(const n of this.neighbours?.values()||[]) {
        if(!n.target&&n.route.length){const [x,z]=n.route.shift();n.target=new T.Vector3(x,.32,z);}
        const delta=n.target?.clone().sub(n.model.position);
        if(delta) {
          if(delta.length()<.1)n.target=null;
          else {n.model.position.add(delta.clone().normalize().multiplyScalar(Math.min(delta.length(),dt*2.4)));n.model.rotation.y=Math.atan2(delta.x,delta.z);}
        }
        for(const part of ['ArmL','ArmR','LegL','LegR']) {const limb=n.model.getObjectByName('Avatar_'+part);if(limb)limb.rotation.x=delta&&!this.reduced?Math.sin(now*.012+(part==='ArmL'||part==='LegR'?Math.PI:0))*.3:0;}
      }
      let moving = false;
      if (!this.blocked && this.mode !== "overview") {
        const dx =
            (this.keys.d || this.keys.arrowright ? 1 : 0) -
            (this.keys.a || this.keys.arrowleft ? 1 : 0) +
            this.joy.x,
          dy =
            (this.keys.w || this.keys.arrowup ? 1 : 0) -
            (this.keys.s || this.keys.arrowdown ? 1 : 0) -
            this.joy.y;
        let delta = new T.Vector3();
        if (dx || dy) {
          this.cancelRoute();
          const forward = new T.Vector3();
          this.camera.getWorldDirection(forward);
          forward.y = 0;
          forward.normalize();
          const right = new T.Vector3(-forward.z, 0, forward.x);
          delta
            .copy(right)
            .multiplyScalar(dx)
            .addScaledVector(forward, dy)
            .normalize()
            .multiplyScalar(dt * 3.3);
        } else {
          if (!this.target && this.route?.length) { const [x,z]=this.route.shift(); this.target=new T.Vector3(x,.32,z); }
          if (this.target) {
          delta.copy(this.target).sub(this.pos);
          delta.y = 0;
          if (delta.length() < 0.12) this.target = null;
          else delta.normalize().multiplyScalar(Math.min(delta.length(),dt * 3.3));
          } else if (this.pending) {
            const pin=this.pending;
            this.cancelRoute();
            if (this.distance(pin)<.8) { this.lastInteraction={key:pin.key,distance:this.distance(pin)}; pin.callback(); }
          }
        }
        if (delta.lengthSq()) {
          const nx = this.pos.x + delta.x,
            nz = this.pos.z + delta.z;
          if (this.walkable(nx, this.pos.z)) this.pos.x = nx;
          if (this.walkable(this.pos.x, nz)) this.pos.z = nz;
          moving = true;
          this.avatar.rotation.y = Math.atan2(delta.x, delta.z);
        }
      }
      this.avatar.position.copy(this.pos);
      if (moving && !this.reduced)
        this.avatar.position.y += Math.abs(Math.sin(now * 0.013)) * 0.035;
      for (const part of ["ArmL", "ArmR", "LegL", "LegR"]) {
        const obj = this.avatar.getObjectByName("Avatar_" + part);
        if (obj)
          obj.rotation.x =
            moving && !this.reduced
              ? Math.sin(
                  now * 0.014 +
                    (part === "ArmL" || part === "LegR" ? Math.PI : 0),
                ) * 0.35
              : 0;
      }
      this.cameraRig.update(dt);
      const pv=this.pos.clone().add(new T.Vector3(0,2.25,0)).project(this.camera);
      this.playerLabel.hidden=this.mode==='overview';
      const playerName='我 · '+(this.state?.residents.find(r=>r.id===this.state.actor)?.name || '新森友');
      if(this.playerLabel.textContent!==playerName)this.playerLabel.textContent=playerName;
      this.playerLabel.style.transform=`translate(-50%,-100%) translate(${(pv.x*.5+.5)*this.el.clientWidth}px,${(-pv.y*.5+.5)*this.el.clientHeight}px)`;
      if(this.metrics.frames%8===0) this.clearSightline();
      this.nearest = null;
      let nearest = .75;
      const placed = [];
      for (const p of this.pins) {
        const phoneMap=this.el.clientWidth<700&&this.mode!=='home'&&this.cameraRig.controls.getDistance()>180;
        const distant=this.mode!=='home' && this.cameraRig.controls.getDistance()>110 && p.key!=='mayor' && !p.own && !p.zone;
        p.el.classList.toggle('distant',distant);
        const label=phoneMap&&p.key==='district-2'?'居民区 · 五条街巷':p.label;
        if(p.el.textContent!==label)p.el.textContent=label;
        const anchor=phoneMap&&p.key==='district-2'?new T.Vector3(-25,1,0):phoneMap&&p.key==='public-zone'?new T.Vector3(24,1,0):p.pos.clone();
        const v = anchor.project(this.camera);
        let x = (v.x * 0.5 + 0.5) * this.el.clientWidth;
        let y = (-v.y * 0.5 + 0.5) * this.el.clientHeight;
        p.el.hidden = v.z > 1 || v.z < -1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || (this.mode==="town" && this.distance(p)>Math.max(17,this.cameraRig.controls.getDistance()));
        if(p.plot && !p.own && this.mode!=='home' && this.cameraRig.controls.getDistance()<110 && this.distance(p)>21)p.el.hidden=true;
        if(p.zone && this.cameraRig.controls.getDistance()<45)p.el.hidden=true;
        if(phoneMap&&p.zone&&p.key!=='district-2'&&p.key!=='public-zone')p.el.hidden=true;
        if(this.mode==='home'&&this.el.clientWidth<700&&!p.el.hidden){const half=p.el.offsetWidth/2+6;x=Math.max(half,Math.min(this.el.clientWidth-half,x));}
        if (!p.el.hidden && !distant) {
          for (
            let i = 0;
            i < 4 &&
            placed.some(
              (q) => Math.abs(q.x - x) < 105 && Math.abs(q.y - y) < 34,
            );
            i++
          )
            y -= 35;
          placed.push({ x, y });
        }
        p.el.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`;
        p.el.style.visibility='visible';
        const d = this.distance(p);
        if (d < nearest && !p.zone) {
          this.nearest = p;
          nearest = d;
        }
        p.el.classList.toggle("near", d < .75);
      }
      const action=document.querySelector('#near-action');
      if(action) { action.hidden=!this.nearest || this.blocked || this.mode==='overview'; action.textContent=this.nearest ? `${this.nearest.el.textContent} · 互动` : ''; }
      for (let i = 0; i < 3; i++) {
        const orb = this.village.getObjectByName("Orb_" + i);
        if (orb && !this.reduced)
          orb.position.y = 2.2 + i * 0.3 + Math.sin(now * 0.0015 + i) * 0.12;
      }
    }
    this.renderer.domElement.dataset.playerX = this.pos.x.toFixed(3);
    this.renderer.domElement.dataset.playerZ = this.pos.z.toFixed(3);
    this.renderer.render(this.scene, this.camera);
  }
}
