import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Camera gestures never invoke gameplay. Only a single stationary primary tap does.
export class ForestCamera {
  constructor(world) {
    this.world = world;
    this.pointers = new Map();
    this.follow = true;
    this.lastPlayer = world.pos.clone();
    this.suppressClickUntil = 0;
    this.edgePointer = null;
    this.edgeMotion = false;
    this.edgeStart = 0;
    this.edgePausedUntil = 0;
    this.controls = new OrbitControls(world.camera, world.el);
    Object.assign(this.controls, {
      enableDamping: true, dampingFactor: 0.12, rotateSpeed: 0.65,
      zoomSpeed: 1.05, panSpeed: 0.8, screenSpacePanning: false,
      minPolarAngle: 0.08, maxPolarAngle: Math.PI / 2 - 0.07,
      minDistance: 3.2, maxDistance: 500, maxTargetRadius: 140,
    });
    // Do not register OrbitControls keyboard listeners: WASD/arrows belong to walking.
    world.el.addEventListener("pointerdown", e => this.down(e), true);
    world.el.addEventListener("pointermove", e => this.move(e), true);
    world.el.addEventListener("pointerup", e => this.up(e), true);
    world.el.addEventListener("pointercancel", () => this.cancel(), true);
    window.addEventListener("blur", () => this.cancel());
    window.addEventListener('pointermove', e => {
      if(e.pointerType !== 'mouse' || e.buttons || this.pointers.size) {this.clearEdge();return;}
      this.edgePointer={x:e.clientX,y:e.clientY};
    },true);
    document.documentElement.addEventListener('pointerleave',()=>this.clearEdge());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.cancel();});
    window.addEventListener('resize',()=>this.clearEdge());
    window.addEventListener('pointerdown',()=>this.clearEdge(),true);
    world.el.addEventListener('pointerleave',()=>this.clearEdge());
    world.el.addEventListener("wheel", () => { this.suppressClickUntil = performance.now() + 120;this.clearEdge();this.edgePausedUntil=performance.now()+350; }, {passive:true});
  }
  down(e) {
    if (this.world.blocked) return;
    this.pointers.set(e.pointerId, {
      x:e.clientX, y:e.clientY, moved:false, multi:this.pointers.size>0,
      pan:e.button===2 || e.shiftKey || e.ctrlKey || e.metaKey,
      button:e.button, key:e.target.closest?.(".world-pin")?.dataset.key,
    });
    if(this.pointers.size>1) for(const p of this.pointers.values()) p.multi=true;
  }
  move(e) {
    const p=this.pointers.get(e.pointerId);
    if(!p)return;
    if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>6) {
      p.moved=true;
      this.suppressClickUntil=performance.now()+400;
      if(p.pan || p.multi) this.follow=false;
    }
  }
  up(e) {
    const p=this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if(!p)return;
    const tap=!p.moved && !p.multi && !p.pan && p.button===0 && Math.hypot(e.clientX-p.x,e.clientY-p.y)<=6;
    this.suppressClickUntil=performance.now()+400;
    if(!tap || this.world.blocked)return;
    const point={clientX:e.clientX,clientY:e.clientY};
    queueMicrotask(()=>{
      if(this.world.blocked)return;
      if(p.key) this.world.approach(p.key);
      else this.world.pick(point);
    });
  }
  clearEdge() {this.edgePointer=null;this.edgeStart=0;this.edgeMotion=false;}
  cancel() { this.pointers.clear();this.clearEdge();this.suppressClickUntil=performance.now()+400; }
  frame() {
    this.clearEdge();
    const w=this.world, c=this.controls, home=w.mode==='home', overview=w.mode==='overview';
    // Flush gesture inertia before explicitly resetting a view; do not fight it every frame.
    c.enableDamping=false;c.update();c.enableDamping=true;
    c.minDistance=home?2.5:3.2;c.maxDistance=home?65:500;c.maxTargetRadius=home?16:140;
    c.cursor.set(0,home?1:0.9,0);
    this.follow=!home&&!overview;
    const target=home?new T.Vector3(w.studyOpen?7.1:0,1,0):overview?new T.Vector3(0,.9,0):w.pos.clone().add(new T.Vector3(0,.9,0));
    let offset;
    if(overview) {
      const distance=61/Math.tan(T.MathUtils.degToRad(w.camera.fov/2))/Math.min(1,w.camera.aspect)*1.1;
      offset=new T.Vector3(.1,1.4,1).normalize().multiplyScalar(Math.min(490,distance));
    } else if(home) offset=w.el.clientWidth<700?new T.Vector3(12,13,19):new T.Vector3(9,7.5,12);
    else offset=w.el.clientWidth<700?new T.Vector3(10,25,28):new T.Vector3(7,12,11);
    c.target.copy(target);w.camera.position.copy(target).add(offset);c.update();
    this.lastPlayer.copy(w.pos);
  }
  zoom(factor) {
    this.clearEdge();
    if(this.world.blocked)return;
    const c=this.controls, offset=this.world.camera.position.clone().sub(c.target);
    offset.setLength(T.MathUtils.clamp(offset.length()*factor,c.minDistance,c.maxDistance));
    this.world.camera.position.copy(c.target).add(offset);c.update();
  }
  updateEdge(dt) {
    const w=this.world,p=this.edgePointer,now=performance.now();
    this.edgeMotion=false;
    if(!p || w.blocked || !this.controls.enabled || document.hidden || this.pointers.size || now<this.edgePausedUntil) {this.edgeStart=0;return;}
    // Only hovering the actual canvas scrolls. HUD, labels and form controls stay still.
    if(document.elementFromPoint(p.x,p.y)!==w.renderer.domElement) {this.edgeStart=0;return;}
    const r=w.el.getBoundingClientRect(),margin=Math.min(48,r.width*.08,r.height*.08);
    if(p.x<r.left||p.x>=r.right||p.y<r.top||p.y>=r.bottom){this.clearEdge();return;}
    const axis=(v,min,max)=>v<min+margin?-(1-(v-min)/margin):v>max-margin?1-(max-v)/margin:0;
    let x=axis(p.x,r.left,r.right),y=axis(p.y,r.top,r.bottom);
    if(!x&&!y){this.edgeStart=0;return;}
    if(!this.edgeStart){this.edgeStart=now;return;}
    if(now-this.edgeStart<180)return;
    const strength=Math.min(1,Math.hypot(x,y));
    const right=new T.Vector3().setFromMatrixColumn(w.camera.matrixWorld,0).setY(0).normalize();
    const forward=new T.Vector3().crossVectors(new T.Vector3(0,1,0),right);
    const speed=T.MathUtils.clamp(this.controls.getDistance()*.38,2,35)*strength*strength;
    const delta=right.multiplyScalar(x).addScaledVector(forward,-y).normalize().multiplyScalar(speed*Math.min(dt,.05));
    const target=this.controls.target.clone().add(delta).sub(this.controls.cursor).clampLength(0,this.controls.maxTargetRadius).add(this.controls.cursor);
    delta.copy(target).sub(this.controls.target);
    this.controls.target.copy(target);w.camera.position.add(delta);
    this.follow=false;this.edgeMotion=delta.lengthSq()>1e-10;
  }
  update(dt=1/60) {
    const w=this.world;
    this.updateEdge(dt);
    if(this.follow && w.mode==='town') {
      const delta=w.pos.clone().sub(this.lastPlayer);
      this.controls.target.add(delta);w.camera.position.add(delta);
    }
    this.lastPlayer.copy(w.pos);
    this.controls.update();
    const status=document.querySelector('#camera-status');
    if(status)status.textContent=this.edgeMotion?'边缘移动中 · 移开鼠标即停':this.controls.getDistance()>110?'远眺 · 拉近查看地点':this.follow&&w.mode==='town'?'镜头跟随人物':'自由观察';
  }
  snapshot() {
    const c=this.controls;
    return {position:this.world.camera.position.toArray(),target:c.target.toArray(),distance:c.getDistance(),azimuth:c.getAzimuthalAngle(),polar:c.getPolarAngle(),follow:this.follow,min:c.minDistance,max:c.maxDistance,edgeMoving:this.edgeMotion};
  }
}
