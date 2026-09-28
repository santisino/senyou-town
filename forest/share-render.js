import * as T from 'three';
import qrcode from '../vendor/qrcode.mjs';
import { CARD_TYPES, LABELS } from './share-data.js?v=postcards-v1';

export const PUBLIC_DEMO_URL = 'https://santisino.github.io/senyou-town/forest/';
const INK = '#304b3c', MUTED = '#6d796b', PAPER = '#fcf6e9', ACCENT = '#b96543';
const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';
function cloneAsset(source) {
  const obj = source.clone(true); obj.visible = true;
  obj.traverse(o => { if (o.isMesh) o.material = o.material.clone(); });
  return obj;
}
function paintAvatar(source, p) {
  const a = cloneAsset(source); a.position.set(0, .32, 0); a.rotation.set(0, 0, 0);
  a.traverse(o => { if (o.isMesh && p.appearance[o.material.name]) o.material.color.set(p.appearance[o.material.name]); });
  for (const key of ['ArmL', 'ArmR', 'LegL', 'LegR']) { const limb = a.getObjectByName('Avatar_' + key); if (limb) limb.rotation.set(0, 0, 0); }
  return a;
}
// An isolated scene reuses the actual Blender assets and chosen decorations. It never mutates live walking/camera state.
export function photograph(world, data) {
  const scene = new T.Scene(); scene.background = new T.Color('#dce7d1');
  scene.add(new T.HemisphereLight('#fff5df', '#a4b995', 2.2));
  const sun = new T.DirectionalLight('#fff2d6', 2.4); sun.position.set(-8, 14, 12);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;
  Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:60});scene.add(sun);
  const composition = new T.Group(); scene.add(composition);
  const owner = data.people[0];
  let target = new T.Vector3(0, 1.3, 0), distance = 12;
  if (data.kind === 'house') {
    for (const key of ['PlotGround', 'Cabin_00', 'WelcomeGarden']) {
      const item = cloneAsset(world.templates.getObjectByName(key));
      item.traverse(o => { if (o.isMesh && o.material.name === 'terracotta') o.material.color.set(owner.appearance.outfit); });
      composition.add(item);
    }
    const a = paintAvatar(world.avatar, owner); a.position.set(-.9, .32, 3.1); composition.add(a);
    for(const [x,z,scale] of [[-3.6,-1.9,.65],[3.2,-2.8,.8]]) {
      const tree=cloneAsset(world.village.getObjectByName('TogetherTree'));tree.position.set(x,.1,z);tree.scale.setScalar(scale);composition.add(tree);
    }
    distance = 13.8; target.set(0, 1.65, .1);
  } else if (data.kind === 'work') {
    const place = cloneAsset(world.village.getObjectByName('Place_workshop'));
    place.position.set(0, .25, 0); composition.add(place);
    const sheet=document.createElement('canvas');sheet.width=960;sheet.height=560;
    const pen=sheet.getContext('2d');pen.fillStyle=PAPER;pen.fillRect(0,0,960,560);
    line(pen,'森林拍照地图 · 共创提案',50,85,860,48,1,INK);
    line(pen,owner.name+'的贡献',50,155,860,32,1,ACCENT);
    line(pen,data.work,50,230,860,40,4,INK);
    const texture=new T.CanvasTexture(sheet);texture.colorSpace=T.SRGBColorSpace;
    const poster=new T.Mesh(new T.PlaneGeometry(2.4,1.37),new T.MeshBasicMaterial({map:texture}));poster.position.set(0,1.35,-.263);poster.userData.shareOwned=true;place.add(poster);
    const a = paintAvatar(world.avatar, owner); a.position.set(-1.4, .32, 1.65); composition.add(a);
    distance = 10; target.set(0, 1.35, 0);
  } else {
    const home = cloneAsset(world.home); home.position.set(0, 0, 0);
    // Never bake a door text texture or a private gift into a public image.
    for (const child of [...home.children]) if (child.type === 'Mesh') child.removeFromParent();
    const gift = home.getObjectByName('GiftDecor'); if (gift) gift.visible = false;
    const photoStand=home.getObjectByName('PhotoStand');if(photoStand)photoStand.visible=false;
    const camera = home.getObjectByName('Camera'); if (camera) camera.visible = true;
    const flowers = home.getObjectByName('FlowerDecor'); if (flowers) flowers.visible = owner.decor.includes('flowers');
    const plant = home.getObjectByName('PlantDecor'); if (plant) plant.visible = true;
    const rug = home.getObjectByName('Rug'); if (rug) { rug.visible = true; rug.traverse(o => { if(o.isMesh)o.material.color.set(owner.decor.includes('rug') ? '#d2a27e' : '#e5d8b7'); }); }
    composition.add(home);
    data.people.forEach((p, i) => { const a = paintAvatar(world.avatar, p); a.position.set(i ? 2.15 : .1, .33, 1.9); composition.add(a); });
    distance = 15; target.set(0, 1.1, 0);
    if(data.kind==='wish') { const a=composition.children.at(-1);a.position.set(1.8,.33,.35);target.set(2,1.05,-1);distance=8; }
  }
  const view = new T.PerspectiveCamera(38, 1.5, .1, 150);
  const offset = data.angle === 'side' ? new T.Vector3(1, .9, 1) : new T.Vector3(.35, .85, 1.35);
  view.position.copy(target).add(offset.normalize().multiplyScalar(distance)); view.lookAt(target);
  const renderer = world.renderer, oldSize = renderer.getSize(new T.Vector2()), ratio = renderer.getPixelRatio();
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 720;
  try {
    renderer.setPixelRatio(1); renderer.setSize(1080, 720, false);
    renderer.render(scene, view);
    canvas.getContext('2d').drawImage(renderer.domElement, 0, 0);
  } finally {
    renderer.setPixelRatio(ratio); renderer.setSize(oldSize.x, oldSize.y, false);
    renderer.render(world.scene, world.camera);
    composition.traverse(o => { if (o.isMesh) {if(o.userData.shareOwned){o.material.map.dispose();o.geometry.dispose();}o.material.dispose();} });
    sun.shadow.map?.dispose();
  }
  return canvas;
}
function font(ctx, size, bold = false) { ctx.font = `${bold ? 600 : 400} ${size}px ${FONT}`; }
function line(ctx, text, x, y, width, size = 30, max = 2, color = INK) {
  font(ctx, size); ctx.fillStyle = color;
  const rows = []; let current = '';
  for (const ch of Array.from(String(text || ''))) {
    if (ch === '\n' || ctx.measureText(current + ch).width > width) {
      if(ch!=='\n' && /[，。！？；：、）】》”’]/.test(ch) && current) {const last=Array.from(current).pop();rows.push(current.slice(0,-last.length));current=last+ch;}
      else {rows.push(current);current=ch==='\n'?'':ch;}
    }
    else current += ch;
  }
  if (current) rows.push(current);
  rows.slice(0, max).forEach((row, i) => {
    if (i === max - 1 && rows.length > max) { while (ctx.measureText(row + '…').width > width) row = row.slice(0, -1); row += '…'; }
    ctx.fillText(row, x, y + i * size * 1.5);
  });
  return Math.min(rows.length, max) * size * 1.5;
}
function rounded(ctx, x, y, w, h, radius, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill(); }
function drawQR(ctx) {
  const qr = qrcode(0, 'M'); qr.addData(PUBLIC_DEMO_URL); qr.make();
  const count = qr.getModuleCount(), cell = 4, pad = 4, size = (count + pad * 2) * cell;
  const x = 1008 - size, y = 1234;
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, size, size); ctx.fillStyle = INK;
  for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) ctx.fillRect(x + (c + pad) * cell, y + (r + pad) * cell, cell, cell);
}
export async function renderCard(world, data) {
  await document.fonts.ready;
  const photo = photograph(world, data), canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, 1080, 1440);
  font(ctx, 26, true); ctx.fillStyle = INK; ctx.fillText('森友会 / 森林明信片', 64, 64);
  ctx.textAlign = 'right'; font(ctx, 23); ctx.fillStyle = MUTED; ctx.fillText(CARD_TYPES[data.kind].name, 1016, 64); ctx.textAlign = 'left';
  ctx.save(); ctx.beginPath(); ctx.roundRect(40, 94, 1000, 606, 22); ctx.clip(); ctx.drawImage(photo, 40, 64, 1000, 667); ctx.restore();
  rounded(ctx, 66, 634, 948, 46, 9, PAPER);
  line(ctx, data.village + ' · ' + new Date(data.created).toLocaleDateString('zh-CN'), 84, 665, 900, 22, 1, MUTED);
  font(ctx, 43, true); ctx.fillStyle = INK;
  line(ctx, data.people.map(p => p.name).join(' & '), 64, 766, 952, 42, 1);
  line(ctx, data.caption || CARD_TYPES[data.kind].title, 64, 824, 950, 30, 2, ACCENT);
  let y = 925;
  if (data.kind === 'pair') {
    if(data.common) {line(ctx,'我们约好：'+data.common,64,y,940,27,2,ACCENT);y+=94;}
    data.people.forEach(p => { line(ctx, p.name + ' · 相处小提示', 64, y, 930, 24, 1, MUTED); y += 39;
      y += line(ctx, p.fields.collaboration || '把具体的相处方式，留给下一次见面慢慢聊。', 64, y, 940, 27, data.common?1:2) + 15; });
  } else if (data.kind === 'work') {
    line(ctx, '森林拍照地图 · 共创提案', 64, y, 930, 27, 1, MUTED); y += 48;
    y += line(ctx, '我的贡献：' + data.work, 64, y, 940, 29, 3) + 24;
    line(ctx, '示例搭档：小林提议拍照点，小禾补充散步路线。', 64, y, 940, 22, 2, MUTED);
  } else {
    const entries = Object.entries(data.people[0].fields);
    if (!entries.length) line(ctx, '一间小屋，慢慢认识一个人。', 64, y, 940, 29, 2);
    entries.forEach(([key, value]) => {
      if (data.kind !== 'house') { line(ctx, LABELS[key], 64, y, 930, 22, 1, MUTED); y += 34; }
      const max = data.kind === 'wish' ? 4 : data.kind === 'profile' ? 1 : 2;
      y += line(ctx, value, 64, y, 940, data.kind === 'wish' ? 32 : 28, max) + 18;
    });
    if (data.kind === 'wish') line(ctx, data.wish.mode === 'recruit' ? `招募 ${data.wish.capacity} 位伙伴 · 已确认 ${data.wish.accepted} 位（生成时）` : '这是一个心愿，感兴趣的话，我们聊聊。', 64, 1167, 930, 24, 1, ACCENT);
  }
  ctx.strokeStyle = '#d5dcca'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(64, 1212); ctx.lineTo(1016, 1212); ctx.stroke();
  line(ctx, data.kind === 'work' ? '把各自的一点点，拼成共同的可能。' : data.kind === 'wish' ? '带着一个念头，等一次回应。' : '一间小屋，慢慢认识一个人。', 64, 1263, 690, 27, 2);
  line(ctx, '扫码体验森友会 Demo', 64, 1332, 690, 23, 1, MUTED);
  line(ctx, '通用体验入口 · 非本人小屋链接', 64, 1367, 690, 21, 1, MUTED);
  drawQR(ctx);
  font(ctx, 18); ctx.fillStyle = MUTED; ctx.fillText(data.kind === 'pair' ? '本地演示 · 双方确认本版内容 · 非真实测评报告' : data.kind === 'work' ? '本地演示 · 搭档为示例 · 不代表线下活动已完成' : '本地演示 · 本人选择公开的内容 · 不含原始 DISC 报告', 64, 1412);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('图片生成失败，请重试。')), 'image/png'));
  return { blob, canvas };
}
