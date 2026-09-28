import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { SPACES } from "./data.js";
import { findPath, journey } from "./journey.js";
const HOME_POS = [
  [-9, -6],
  [0, -10],
  [9, -6],
  [-11, 5],
  [0, 10],
  [11, 5],
];
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
    this.scene.fog = new T.Fog("#dce8d1", 65, 120);
    this.camera = new T.PerspectiveCamera(38, 1, 0.1, 160);
    this.camera.position.set(28, 36, 46);
    this.aim = new T.Vector3(0, 0, 0);
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
      left: -27,
      right: 27,
      top: 27,
      bottom: -27,
      near: 1,
      far: 80,
    });
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun);
    this.layer = document.createElement("div");
    this.layer.className = "pins";
    el.append(this.layer);
    this.playerLabel=document.createElement('div');this.playerLabel.className='player-label';el.append(this.playerLabel);
    this.ray = new T.Raycaster();
    this.plane = new T.Plane(new T.Vector3(0, 1, 0), -0.32);
    this.pos = new T.Vector3(0, 0.32, 4.5);
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
    this.renderer.domElement.addEventListener("pointerup", (e) => this.pick(e));
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
      const gltf = await loader.loadAsync("./assets/forest.glb");
      this.root = gltf.scene;
      this.scene.add(this.root);
      this.village = this.root.getObjectByName("Village");
      this.home = this.root.getObjectByName("Home");
      this.avatar = this.root.getObjectByName("Avatar");
      this.root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.material.side = T.DoubleSide;
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
      this.mayor.position.set(-1.9, 0.33, 3.3);
      this.mayor.rotation.y = 0.4;
      this.home.visible = false;
      this.avatar.visible = false;
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
  setState(s) {
    this.state = s;
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
    if (this.village) this.refreshPins();
    this.updateGarden();
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
        7.1 + (i % 3) * 0.8,
        0.42,
        14 + Math.floor(i / 3) * 0.65,
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
  }
  town(position = [3.5, 5.5]) {
    this.mode = "town";
    this.village.visible = true;
    this.home.visible = false;
    this.avatar.visible = true;
    this.pos.set(position[0], 0.32, position[1]);
    this.cancelRoute();
    this.refreshPins();
  }
  showHome(r) {
    this.cancelRoute();
    this.mode = "home";
    this.resident = r;
    this.village.visible = false;
    this.home.visible = true;
    this.avatar.visible = true;
    this.pos.set(1.7, 0.33, 2.7);
    this.target = null;
    this.updateProps(r);
    this.home.getObjectByName("FlowerDecor").visible =
      r.decor.includes("flowers");
    this.home.getObjectByName("PlantDecor").visible =
      !!r.profile.interests || r.decor.includes("fern");
    const labelKey=r.id+':'+r.name+':'+r.profile.headline;
    if(this.doorTextKey!==labelKey) {
      this.doorTextKey=labelKey;
      if(this.doorText) {this.doorText.removeFromParent();this.doorText.geometry.dispose();this.doorText.material.map.dispose();this.doorText.material.dispose();}
      const c=document.createElement('canvas');c.width=512;c.height=160;
      const ctx=c.getContext('2d');ctx.fillStyle='#fff0d2';ctx.fillRect(0,0,512,160);ctx.fillStyle='#36553e';ctx.textAlign='center';ctx.font='bold 44px sans-serif';ctx.fillText(r.profile.headline ? r.name+'的小屋' : '等待我的故事',256,65,480);ctx.font='24px sans-serif';ctx.fillText((r.profile.headline||'走近，挂上你的门牌').slice(0,19),256,118,480);
      const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
      this.doorText=new T.Mesh(new T.PlaneGeometry(1.4,.44),new T.MeshBasicMaterial({map:texture}));this.doorText.position.set(-1,1.53,3.24);this.home.add(this.doorText);
    }
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
  }
  updateProps(r) {
    if (!this.home) return;
    this.resident = r;
    // Empty physical stations remain in the room: they are where expression begins.
    this.home.getObjectByName("GiftDecor").visible=this.state.gifts.some(g=>g.to===r.id && g.status==='pending');
    this.home.getObjectByName("Camera").visible = true;
    this.home.getObjectByName("Book").visible = true;
    this.home.getObjectByName("Wish").visible = true;
    this.home.getObjectByName("Doorplate").visible = true;
    this.home.getObjectByName("PlantDecor").visible =
      !!r.profile.interests || r.decor.includes("fern");
  }
  pin(label, pos, callback, key, approach) {
    const el = document.createElement("button");
    el.className = "world-pin";
    el.textContent = label;
    el.dataset.key = key;
    el.style.visibility='hidden';
    const pin = { el, pos: new T.Vector3(...pos), callback, key, approach: approach || [pos[0], pos[2]] };
    el.onclick = () => this.interact(pin);
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
    if (this.mode === "overview") { this.mode="town"; this.avatar.visible=true; window.dispatchEvent(new Event('forest-mode')); }
    if (this.distance(pin) < 0.75) { this.cancelRoute(); this.lastInteraction={key:pin.key,distance:this.distance(pin)}; pin.callback(); return; }
    this.walkTo(pin.approach, pin);
  }
  walkTo(point, pin = null) {
    this.cancelRoute();
    this.route = findPath([this.pos.x,this.pos.z],point,(x,z)=>this.walkable(x,z),this.mode==="home");
    this.pending = pin;
    if (!this.route.length) { this.pending=null; return; }
    const points=[this.pos.clone(), ...this.route.map(([x,z])=>new T.Vector3(x,.39,z))];
    this.routeLine=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xffe4a8,transparent:true,opacity:.8}));
    this.scene.add(this.routeLine);
  }
  approach(key) { this.interact(this.pins.find(p=>p.key===key)); }
  homePoint(id) {
    const index=this.state.residents.findIndex(r=>r.id===id);
    const [x,z]=HOME_POS[Math.max(0,index)%HOME_POS.length];
    return [x,z+3.5];
  }
  goHome(id, callback) {
    if(this.mode==="home") this.town(this.homePoint(this.resident.id));
    const point=this.homePoint(id);
    this.interact({key:"visit:"+id,approach:point,callback});
  }
  refreshPins() {
    this.pins.forEach((p) => p.el.remove());
    this.pins = [];
    if (!this.state || !this.village) return;
    if (this.mode === "home") {
      for (const [key, label, pos, approach] of [
        ["door", "门牌", [-1, 1.6, 3.15], [-1,2.75]],
        ["interest", "兴趣角", [-2.4, 2.2, -2.6], [-1.75,-1.75]],
        ["table", "会客桌", [1.5, 1.3, -0.75], [2,-.25]],
        ["wish", "心愿瓶", [3, 1.6, -1.35], [2.25,-1.5]],
        ["book", "小屋里的我", [-0.1, 1.3, 0.3], [-1,.75]],
        ["mail", "礼物信箱", [3, 1.6, 2.9], [2.25,2.75]],
      ])
        this.pin(label + (this.resident.id===this.state.actor && journey(this.resident).stations.includes(key) ? " ✓" : ""), pos, () => this.onSelect({ type: "object", key }), key, approach);
      this.pin(
        "走回森林",
        [1, 0.3, 3.8],
        () => this.onSelect({ type: "exit" }),
        "exit",
        [1,3],
      );
      return;
    }
    this.pin(
      this.state.village.mayor + " · 村长",
      [-1.9, 2, 3.3],
      () => this.onSelect({ type: "mayor" }),
      "mayor",
      [-1.75,4.5],
    );
    this.state.residents.slice(0, 6).forEach((r, i) => {
      const [x, z] = HOME_POS[i];
      this.pin(
        r.id === this.state.actor ? "我的小屋" : r.name + "的小屋",
        [x, 4, z],
        () => this.onSelect({ type: "resident", id: r.id }),
        "Cabin_" + String(i).padStart(2, "0"),
        [x,z+3.5],
      );
    });
      for (const [key, label, , pos] of SPACES)
        this.pin(
          key === "park" ? "森友公告栏 · 大公园" : label,
          [pos[0], 2.5, pos[2]],
          () => this.onSelect({ type: "space", key }),
          "Place_" + key,
          [pos[0],pos[2]+2.5],
        );
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
    );
    if (hits.length) {
      let o = hits[0].object;
      while (o) {
        if(o===this.mayor) {this.approach('mayor');return;}
        const pin = this.pins.find((p) => p.key === o.name);
        if (pin) {
          this.interact(pin);
          return;
        }
        const objects = {
          Camera: "interest",
          Book: "book",
          Table: "table",
          Wish: "wish",
          Doorplate: "door",
          Mailbox: "mail",
        };
        if (this.mode === "home" && objects[o.name]) {
          this.approach(objects[o.name]);
          return;
        }
        o = o.parent;
      }
    }
    if (this.mode === "overview") {
      this.mode="town";
      this.avatar.visible=true;
      window.dispatchEvent(new Event('forest-mode'));
    }
    const hit = new T.Vector3();
    if (this.ray.ray.intersectPlane(this.plane, hit)) {
      if (this.walkable(hit.x, hit.z)) this.walkTo([hit.x,hit.z]);
    }
  }
  walkable(x, z) {
    if (this.mode === "home") {
      if (x < -3.3 || x > 3.5 || z < -2.7 || z > 3.15) return false;
      return !(
        (x < -2.1 && z < 1.65) ||
        (x < -1.4 && z < -2.15) ||
        (x > 2.55 && z > 2.5) ||
        Math.hypot(x - 0.5, z + 0.3) < 1.37 ||
        (x > 2.45 && z < -0.9 && z > -1.8)
      );
    }
    if ((x * x) / 23 ** 2 + (z * z) / 20 ** 2 > 1) return false;
    if (Math.hypot(x, z + 1) < 1.3) return false;
    if(SPACES.some(([, , ,p])=>Math.abs(x-p[0])<1.9 && Math.abs(z-p[2])<1.3))return false;
    return !HOME_POS.some(
      ([hx, hz]) => Math.abs(x - hx) < 2.3 && Math.abs(z - hz) < 2.7,
    );
  }
  setBlocked(b) {
    this.blocked = b;
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
    const target=this.pos.clone().add(new T.Vector3(0,1.1,0));
    const direction=target.clone().sub(this.camera.position);
    const ray=new T.Raycaster(this.camera.position,direction.clone().normalize(),0,direction.length()-.3);
    const root=this.mode==="home"?this.home:this.village;
    for(const hit of ray.intersectObject(root,true)) {
      const mesh=hit.object;
      if(!/^(Plants|Cabin_|HomeShell|TogetherTree)/.test(mesh.name) || this.faded.includes(mesh))continue;
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
      const mobile = this.el.clientWidth < 700;
      let dest, aim;
      if (this.mode === "overview") {
        dest = new T.Vector3(
          mobile ? 33 : 28,
          mobile ? 49 : 36,
          mobile ? 58 : 43,
        );
        aim = new T.Vector3(0, 0, 0);
      } else if (this.mode === "home") {
        dest = new T.Vector3(
          mobile ? 12 : 9,
          mobile ? 14 : 8.5,
          mobile ? 19 : 12,
        );
        aim = new T.Vector3(0, 1, 0);
      } else {
        dest = this.pos
          .clone()
          .add(new T.Vector3(7, mobile ? 15 : 12, mobile ? 14 : 11));
        aim = this.pos.clone();
      }
      this.camera.position.lerp(dest, Math.min(1, dt * 4));
      this.aim.lerp(aim, Math.min(1, dt * 4));
      this.camera.lookAt(this.aim);
      const pv=this.pos.clone().add(new T.Vector3(0,2.25,0)).project(this.camera);
      this.playerLabel.hidden=this.mode==='overview';
      this.playerLabel.textContent='我 · '+(this.state?.residents.find(r=>r.id===this.state.actor)?.name || '新森友');
      this.playerLabel.style.transform=`translate(-50%,-100%) translate(${(pv.x*.5+.5)*this.el.clientWidth}px,${(-pv.y*.5+.5)*this.el.clientHeight}px)`;
      if(this.metrics.frames%8===0) this.clearSightline();
      this.nearest = null;
      let nearest = .75;
      const placed = [];
      for (const p of this.pins) {
        const v = p.pos.clone().project(this.camera);
        const x = (v.x * 0.5 + 0.5) * this.el.clientWidth;
        let y = (-v.y * 0.5 + 0.5) * this.el.clientHeight;
        p.el.hidden = v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || (this.mode==="town" && this.distance(p)>17);
        if (!p.el.hidden) {
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
        if (d < nearest) {
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
