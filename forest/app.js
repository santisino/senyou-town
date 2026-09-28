import { ForestWorld } from "./world.js?v=village-v4";
import { FIELDS, SPACES, SHOP, NOTE } from "./data.js?v=village-v4";
import {
  fresh,
  load,
  persist,
  resident,
  visible,
  canVisit,
  matches,
  transact,
  ready,
} from "./state.js?v=village-v4";
import qrcode from "../vendor/qrcode.mjs";
import { encodeVillage, decodeVillage } from "./config.js";
import { journey, nextStation, STATIONS } from "./journey.js?v=village-v4";
import { PLOTS, SPACE_POS, address } from "./layout.js";
import { houseStage, villageCounts } from "./settlement.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let state = load(),
  world,
  homeId = null,
  presenter = false,
  search = "",
  filter = "all",
  bookChapter = 0,
  toastTimer,
  returnFocus,
  directoryScroll = 0;
let stationKey = "door", mayorTurn = 0;
const params = new URLSearchParams(location.search);
if (params.get("village") && !state.welcomeSeen)
  state.village.name = params.get("village").slice(0, 30);
const me = () => resident(state),
  profile = (id = state.actor) => visible(state, id),
  name = (id) => resident(state, id)?.name || "森友";
const button = (text, action, data = "", cls = "") =>
  `<button class="${cls}" data-action="${action}" ${data}>${esc(text)}</button>`;
const person = (r) =>
  `<div class="person-heading"><span class="portrait" style="background:${/^#[\da-f]{6}$/i.test(r.appearance.outfit) ? r.appearance.outfit : "#829475"}">${esc(r.name.slice(0, 1))}</span><div><h3>${esc(r.name)}</h3><small>${esc(r.group)} · ${esc(address(r))}</small></div></div>`;
const tags = (text) =>
  `<div class="tags">${text
    .split(/[、，,]/)
    .filter(Boolean)
    .slice(0, 4)
    .map((t) => `<span class="tag" title="${esc(t)}">${esc(t.length>18?t.slice(0,18)+"…":t)}</span>`)
    .join("")}</div>`;
const section = (title, text) =>
  text
    ? `<section class="section"><h3>${esc(title)}</h3><p>${esc(text)}</p></section>`
    : "";
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3400);
}
function commit(a) {
  try {
    const next = transact(state, a);
    persist(next);
    state = next;
    world?.setState(state);
    if (world?.mode === "home" && homeId) world.updateProps(profile(homeId));
    hud();
    return true;
  } catch (e) {
    toast(
      e.name === "QuotaExceededError"
        ? "浏览器空间不足，暂未保存，请保留页面。"
        : e.message,
    );
    return false;
  }
}
function saveState(next) {
  try {
    persist(next);
    state = next;
    world?.setState(state);
    hud();
    return true;
  } catch {
    toast("无法保存本地资料，未执行操作");
    return false;
  }
}
function panel(title, subtitle, body, foot = "", classes = "") {
  returnFocus = document.activeElement;
  world?.setBlocked(true);
  document.body.classList.add("panel-open");
  $("#panel-root").innerHTML =
    `<div class="scrim"><section class="panel ${classes}" role="dialog" aria-modal="true" aria-labelledby="panel-title"><div class="panel-head"><div><h2 id="panel-title">${esc(title)}</h2>${subtitle ? `<small>${esc(subtitle)}</small>` : ""}</div><button class="close" data-action="close" aria-label="关闭">×</button></div><div class="panel-body">${body}</div>${foot ? `<div class="panel-foot">${foot}</div>` : ""}</section></div>`;
  $(".close")?.focus({ preventScroll: true });
}
function close() {
  document.body.classList.remove("panel-open");
  $("#panel-root").innerHTML = "";
  world?.setBlocked(false);
  returnFocus?.isConnected && returnFocus.focus({ preventScroll: true });
}
document.addEventListener("keydown", (e) => {
  if (!$(".panel")) return;
  if (e.key === "Escape") {
    e.preventDefault();
    close();
  }
  if (e.key === "Tab") {
    const els = [
      ...$(".panel").querySelectorAll(
        "button:not(:disabled),a,input,textarea,select",
      ),
    ].filter((x) => x.offsetParent !== null);
    const first = els[0],
      last = els.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      last?.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first?.focus();
      e.preventDefault();
    }
  }
});
function hud() {
  document.body.dataset.scene = world?.mode || "overview";
  $("#village-name").textContent = state.village.name;
  document.title = `蚂蚁森友会 · ${state.village.name}`;
  const r = me(),
    isHome = world?.mode === "home";
  $("#house-tools").innerHTML = "";
  let title, copy;
  const j=journey(r), next=nextStation(r);
  title=!j.key ? "先逛逛，找到村长" : !r.built ? "到我的宅地，打开工具箱" : !r.confirmed ? isHome ? next ? STATIONS[next].title : "翻开册子，确认小屋里的我" : "进小屋，留下自己的故事" : state.stage!=="open" ? "安家完成，等村长开放串门" : "带着好奇，去认识一位森友";
  copy=!j.key ? "公共空间已经就绪，溪对岸的居民区等我们一起建设。村长在村口等你。" : !r.built ? `钥匙对应 ${address(r)}。过桥后，走到你的宅地开始安家。` : !r.confirmed ? isHome ? "走到物件旁留下故事，再回到房间继续布置。" : "可以自己走，也可以点小屋沿路过去。" : isHome ? "走近物件，读读这个人的故事。" : state.stage!=="open" ? "可以去小铺挑装饰、在信箱制作礼物，或沿路看村庄长出来。" : "公园公告栏有居民名册。先发现，再沿小路去拜访。";
  $("#mission").innerHTML=`<div class="step">${esc(state.stage==="open"?"串门时间":"初到森林")}</div><h2>${esc(title)}</h2><p>${esc(copy)}</p>`;
  $("#navigation").innerHTML=(isHome?button("走到门口出门","exit-home"):button(world?.mode==="overview"?"回到脚下":"俯瞰森林","map"))+button("","interact",'id="near-action" hidden',"primary");
  $("#scene-caption").textContent = isHome
    ? `${name(homeId)}的小屋 · 每件物品，都藏着一点故事`
    : "风经过树梢，也经过彼此的生活。";
  $("#movement-help").textContent =
    innerWidth < 700
      ? "拖动左侧摇杆走动 · 点击路面或物件"
      : "WASD 走动 · 单击前往 · 左键拖动旋转 · 右键拖动平移 · 滚轮缩放";
  if(innerWidth<700) $("#movement-help").textContent="摇杆走路 · 单指拖动转视角 · 双指缩放/平移 · 轻点互动";
  $("#joystick").style.visibility =
    world?.mode === "overview" ? "hidden" : "visible";
  const counts=villageCounts(state);
  $("#village-progress").textContent=isHome ? address(resident(state,homeId)) : `50 个宅地 · ${counts.arrived} 位到达 · ${counts.ready} 间准备好`;
  $("#village-progress").style.top=($("#mission").offsetTop+$("#mission").offsetHeight+8)+'px';
  $(".demo-label").textContent=state.experience==='opening'?"共同建村 · 同学进度为本机模拟 · 不跨设备同步":"已建村庄演示 · 虚构居民 · 本地保存";
}
function welcome() {
  close(); homeId=null; world.town(); hud();
}
function mayor() {
  if(!journey(me()).key) {
    const lines=[`欢迎来到${esc(state.village.name)}。我是${esc(state.village.mayor)}。你看，溪对岸还是一片等待入住的宅地。你希望大家怎么称呼你？`, `${esc(me().name)}，很高兴认识你。${esc(state.village.goal)} 溪这边有公园、图书馆和教室，过桥就是大家未来的家。`, "这把钥匙交给你。去宅地打开工具箱，搭好基础小屋。再把喜欢的事、相处的方式和最近的心愿放进屋里。确认好自己的介绍，挂上欢迎牌，等我宣布串门时间。"];
    panel(state.village.mayor+" · 村长","村口的初次见面",`<p class="quote">${lines[mayorTurn]}</p>${mayorTurn===0?`<label class="field">大家可以叫我<input id="resident-name" maxlength="24" value="${esc(me().name==="新森友"?"":me().name)}" placeholder="你的名字或昵称"></label>`:""}`,button(["你好，我是……","我们怎样一起建村？","领取宅地钥匙"][mayorTurn],"mayor-next","","primary"),"npc-dialog");
    return;
  }
  panel(
    `和${state.village.mayor}聊聊`,
    `${state.village.name} · ${state.stage === "open" ? "串门时间" : "入驻时间"}`,
    `<p class="quote">${esc(state.village.welcome)}</p><p>${esc(state.village.goal)}</p><div class="notice">${state.stage === "open" ? "大家可以去串门啦。收到礼物、看见心愿，都只是认识的开始；是否进一步连接，由你们自己决定。" : "现在先准备自己的小屋，还不能去别人家。线下主持人宣布开放后，会由演示者控制台切换阶段。"}</div>`,
    button(
      !me().built ? "去我的宅地" : me().confirmed ? "回我的小屋" : "继续入驻",
      "own",
      "",
      "primary",
    ) + (me().confirmed && state.stage==="open" ? button("去公园公告栏看看","space",'data-key="park"') : button("再逛逛","close")),
    "npc-dialog",
  );
}
function plotVisit(plotId) {
  const r=state.residents.find(r=>r.plot===plotId),p=PLOTS[plotId];
  if(!r) {toast(`这里是${p.district}的待入住宅地。${journey(me()).key?'你的钥匙对应 '+address(me())+'。':'先找村长报到，再领取自己的位置。'}`);return;}
  if(r.id!==state.actor) {
    if(!canVisit(state,r.id)) {toast(!r.confirmed?`${r.name}还在安家，主人确认后才能来坐坐。`:"邻居已经准备好，等村长宣布开放后再来拜访。");return;}
    door(r.id);return;
  }
  if(!r.built) {
    panel("打开我的安家工具箱",address(r),"<p class=\"quote\">这里还没有你的房子。但从今天起，可以慢慢有你的样子。</p><p>木料和工具已经备好。先搭起基础小屋，再用你的故事布置门牌、兴趣角、会客桌和心愿瓶。基础建设免费，不消耗森友币。</p>",button("搭起我的基础小屋","build-home","","primary"));
    return;
  }
  visit(r.id);
}
function field(k) {
  const [, title, hint] = FIELDS.find((f) => f[0] === k),
    r = me();
  return `<label class="field"><span class="field-title">${esc(title)}<span class="privacy"><input type="checkbox" data-public="${k}" ${r.public[k] ? "checked" : ""}> 对访客公开</span></span><textarea data-profile="${k}" maxlength="600" placeholder="${esc(hint)}">${esc(r.profile[k])}</textarea><small>${esc(hint)}</small><span class="suggestions">${button("暂时不想公开", "private", `data-key="${k}"`)}${k === "wish" ? button("暂时没有心愿", "no-wish") : ""}</span></label>`;
}
function edit(key = stationKey) {
  if(typeof key !== "string" || !STATIONS[key]) key = stationKey;
  stationKey=key;
  if(homeId!==state.actor || !journey(me()).key) return;
  const spec=STATIONS[key];
  let body=`<p class="station-intro">${esc(spec.hint)}</p>`;
  if(key==="door") body+=`<div class="columns"><label class="field">名字<input id="resident-name" maxlength="24" value="${esc(me().name)}"></label><label class="field">我的衣服<input type="color" id="outfit" value="${me().appearance.outfit}"></label></div><div class="columns"><label class="field">肤色<input type="color" id="skin" value="${me().appearance.skin}"></label><label class="field">发色<input type="color" id="hair" value="${me().appearance.hair}"></label></div><div class="notice">有报告也可以作为表达的起点。${button("看看 DISC 示例参考","report")}</div>`;
  body+=spec.fields.map(field).join("");
  if(key==="wish") body+=`<label class="field">想怎样被回应<select id="wish-mode"><option value="intent" ${me().wishMode==="intent"?"selected":""}>先表达一个念头</option><option value="recruit" ${me().wishMode==="recruit"?"selected":""}>邀请两位伙伴，需要我确认</option></select></label>`;
  panel(spec.title,"正在布置这件物品 · 草稿自动保存",body,button("先放一放，继续逛","close")+button(spec.result,"finish-station",'data-key="'+key+'"',"primary"),"station-panel");
}
function inspectBook() {
  const unfinished=Object.keys(STATIONS).filter(k=>!journey(me()).stations.includes(k));
  if(unfinished.length) {
    panel("这本册子，正在收集我的故事","先在小屋里留下表达，再在这里连起来阅读",
      `<div class="station-checklist">${Object.entries(STATIONS).map(([k,s])=>`<p>${unfinished.includes(k)?"○":"✓"} ${esc(s.title)}</p>`).join("")}</div><p>合上册子，走到还没准备好的物件旁。内容可以自己写，也可以明确选择暂不公开。</p>`,
      button("合上册子，继续布置","close","","primary"));
    return;
  }
  panel("把这份介绍，留在我的小屋","桌上的册子 · 最后由我确认",summary(me(),true)+`<label class="checkline"><input id="reviewed" type="checkbox" ${me().reviewed?"checked":""}>我已阅读并确认，这些话代表我当前愿意表达的自己。</label>`,button("合上再看看","close")+button("确认，完成入驻","confirm","","primary"),"wide book");
}
function walkHome(id) {
  if(!(id===state.actor && journey(me()).key) && !canVisit(state,id)) { toast(journey(me()).key?"先完成自己的说明书，等待村长开放串门。":"先去村口找村长，领取宅地钥匙。");return; }
  close();
  if(world.mode==="home") { exitThen(()=>walkHome(id));return; }
  world.goHome(id,()=>id===state.actor ? plotVisit(resident(state,id).plot) : visit(id));
  homeId=null;hud();
}
function walkObject(key) { close(); world.approach(key); hud(); }
function walkSpace(key) {
  close();
  if(world.mode==="home") { exitThen(()=>walkSpace(key));return; }
  world.approach("Place_"+key);hud();
}
function exitThen(callback) {
  const door=world.pins.find(p=>p.key==="exit");
  world.interact({...door,callback:()=>{leaveHome();callback();}});
}
function leaveHome() {
  const point=world.homePoint(homeId || state.actor);
  homeId=null;close();world.town(point);hud();
}
function summary(r, owner = false) {
  const p = owner ? r.profile : profile(r.id).profile;
  return `${person(r)}<p class="quote">${esc(p.headline || "这里还有一些故事，等待主人慢慢分享。")}</p>${tags(p.traits || "")}<div class="columns"><div>${section("我喜欢的生活", p.interests)}${section("一个小故事", p.story)}${section("最近在探索", p.learning)}</div><div>${section("我愿意搭把手", p.help)}${section("和我一起做事", p.collaboration)}${section("最近的心愿", p.wish)}</div></div>`;
}
function visit(id) {
  if (!canVisit(state, id)) {
    toast("先完成自己的说明书，等村长开放后再去串门。");
    return;
  }
  homeId = id;
  world.showHome(profile(id));
  close();
  hud();
}
function door(id) {
  if (!canVisit(state, id)) {
    toast("这里还在准备中。先把自己的小屋布置好吧。");
    return;
  }
  if(id===state.actor) { visit(id); return; }
  const r = profile(id),
    p = r.profile;
  panel(
    `${r.name}的门前`,
    r.group,
    person(r) +
      `<p class="quote">${esc(p.headline)}</p>${tags(p.traits)}<p>${esc(p.interests)}</p>` +
      section("最近，想找人一起", p.wish.slice(0, 100)) +
      section("相处的小提示", p.collaboration.slice(0, 65)),
    button("去他家坐坐", "visit", `data-id="${id}"`, "primary"),
  );
}
function directory() {
  if (!me().confirmed || state.stage !== "open") {
    toast("请先完成入驻，等待村长开放串门。");
    return;
  }
  panel(
    "今天，想去谁家坐坐？",
    "先从一个共同兴趣、一件想做的事开始。",
    `<div class="toolbar"><input class="search" id="resident-search" placeholder="搜名字、兴趣、想做的事" value="${esc(search)}"><select id="resident-filter"><option value="all">所有森友</option><option value="wish">有心愿的森友</option><option value="photo">喜欢摄影</option></select></div><div id="resident-results"></div>`,
    "",
    "wide",
  );
  $("#resident-filter").value = filter;
  drawResidents();
  $(".panel-body").scrollTop = directoryScroll;
}
function drawResidents() {
  const rows = state.residents.filter(
    (r) =>
      r.id !== state.actor && r.confirmed && matches(state, r, search, filter),
  );
  $("#resident-results").innerHTML =
    `<small>${rows.length} 位森友 · 虚构示例资料</small><div class="resident-grid">${rows
      .map((r) => {
        const p = profile(r.id).profile;
        return `<article class="resident-card">${person(r)}${tags(p.traits)}<p>${esc(p.interests.slice(0,90))}${p.interests.length>90?"…":""}</p><div class="wish-line">${esc(p.wish.slice(0, 90) || "暂时没有公开心愿，先聊聊也很好。")}${p.wish.length>90?"…":""}</div><p style="margin-top:12px">${esc(p.collaboration.slice(0, 55))}${p.collaboration.length>55?"…":""}</p><div class="actions">${button("去他家坐坐", "visit", `data-id="${r.id}"`, "primary")}</div></article>`;
      })
      .join(
        "",
      )}</div>${rows.length ? "" : '<div class="empty">还没有找到。换个关键词，或看看所有森友。</div>'}`;
}
function book(chapter = 0) {
  if(homeId===state.actor && !me().confirmed) { inspectBook();return; }
  if (!homeId) homeId = state.actor;
  if (!canVisit(state, homeId)) {
    toast("这间小屋暂未开放");
    return;
  }
  bookChapter = Number(chapter);
  const r = profile(homeId),
    p = r.profile,
    chapters = ["先认识一下我", "我的生活", "和我一起做事", "最近的心愿"];
  let body = "";
  if (bookChapter === 0)
    body = `<div><div class="book-title">小屋里的我</div>${person(r)}<p class="quote">${esc(p.headline)}</p></div><div>${section("几枚小小的线索", p.traits)}<p>这不是给自己贴标签，而是留一些让你更容易靠近我的线索。</p>${section("从哪里开始聊", p.interests)}</div>`;
  if (bookChapter === 1)
    body = `<div>${section("我喜欢的生活", p.interests)}${section("这件事背后的小故事", p.story)}</div><div>${section("最近在探索", p.learning)}<p class="muted">不必擅长，喜欢本身就值得被看见。</p></div>`;
  if (bookChapter === 2)
    body = `<div>${section("我愿意搭把手", p.help)}</div><div>${section("和我一起做事，可以这样", p.collaboration)}<p class="muted">具体的相处建议，比一个人格标签更有帮助。</p></div>`;
  if (bookChapter === 3)
    body = `<div>${section("最近，想和谁一起", p.wish)}${!p.wish ? "<p>主人还没有公开这部分内容。</p>" : ""}</div><div><p>如果这个念头让你心动，可以去看看窗边的心愿瓶。</p><div class="actions">${button("看看心愿瓶", "object", 'data-key="wish"', "primary")}</div><p class="muted" style="margin-top:24px">内容由主人表达并确认。未公开资料不会出现在访客册子里。</p></div>`;
  panel(
    "《小屋里的我》",
    `${r.name}把想让你知道的事，慢慢写在这里。`,
    `<nav class="chapter">${chapters.map((t, i) => button(`${i + 1}. ${t}`, "chapter", `data-index="${i}"`, i === bookChapter ? "primary" : "")).join("")}</nav><div class="book-spread">${body}</div>`,
    button("合上册子，继续逛", "close") +
      (homeId === state.actor ? button("合上册子，去门牌修改", "object", 'data-key="door"') : "") +
      button(
        bookChapter === 3 ? "回到第一页" : "下一章",
        "chapter",
        `data-index="${(bookChapter + 1) % 4}"`,
        "primary",
      ),
    "wide book",
  );
}
function object(key) {
  if (!homeId || !canVisit(state, homeId)) return;
  if(homeId===state.actor && STATIONS[key]) { edit(key);return; }
  const r = profile(homeId),
    p = r.profile;
  if (key === "book") {
    book();
    return;
  }
  if (key === "mail") {
    if (homeId === state.actor) inbox();
    else gift();
    return;
  }
  const map = {
    door: [
      "门前认识",
      `${r.name}的小屋`,
      person(r) + `<p class="quote">${esc(p.headline)}</p>${tags(p.traits)}`,
    ],
    interest: [
      "兴趣角",
      "物件只是线索，故事才是这个人。",
      section("我喜欢", p.interests) +
        section("一个小故事", p.story) +
        section("最近的探索", p.learning),
    ],
    table: [
      "来会客桌坐坐",
      "放下判断，聊聊怎样相处更舒服。",
      section("我愿意搭把手", p.help) +
        section("和我一起做事", p.collaboration),
    ],
    wish: [
      "窗边的心愿瓶",
      "一个想法，也是一扇向别人打开的小窗。",
      section("我最近想做的事", p.wish),
    ],
  };
  const [title, sub, body] = map[key] || map.door;
  let extra = "";
  if (key === "wish" && p.wish && !p.wish.includes("暂时没有")) {
    const accepted = state.requests.filter(
      (q) => q.to === r.id && q.status === "accepted",
    ).length;
    extra = `<div class="notice">${r.wishMode === "recruit" ? `招募伙伴 · 已确认 ${accepted} / ${r.capacity} 位` : "这是一个意向，不是必须完成的报名。"}</div>`;
    if (r.id !== state.actor)
      extra += `<div class="actions">${button("先看看合拍建议", "pair")}${button(r.wishMode === "recruit" ? "我想一起，提交申请" : "我也感兴趣", "request", `data-id="${r.id}"`, "primary")}</div>`;
  }
  panel(
    title,
    sub,
    body || "<p>主人暂时没有公开这部分内容。</p>",
    button("翻翻完整册子", "book") +
      (r.id !== state.actor
        ? button("留一份小礼物", "gift")
        : button("修改我的介绍", "edit")),
  );
  if (extra) $(".panel-body").insertAdjacentHTML("beforeend", extra);
}
function gift() {
  if (homeId === state.actor) {
    inbox();
    return;
  }
  const items = state.items.filter(
    (i) => i.owner === state.actor && i.status === "available",
  );
  panel(
    `给${name(homeId)}留份小礼物`,
    "一份问候，不代表对方必须回应。",
    `<p>本场还可以送出 ${5 - state.wallets[state.actor].sent} 次。收下礼物不会自动交换联系方式。</p><label class="field" style="margin-top:20px"><span class="field-title">选一份礼物</span><select id="gift-item">${items.map((i) => `<option value="${i.id}">${esc(i.name)}</option>`).join("")}</select></label><label class="field"><span class="field-title">顺手留句话</span><textarea id="gift-message" maxlength="160">${esc(me().signature.message)}</textarea></label>`,
    button("设计我的招牌礼物", "signature") +
      button(
        "放在门口",
        "send-gift",
        "",
        items.length ? "primary" : "primary disabled",
      ),
  );
}
function inbox() {
  const incoming = state.gifts.filter((g) => g.to === state.actor),
    outgoing = state.gifts.filter((g) => g.from === state.actor),
    requests = state.requests.filter(
      (q) => q.to === state.actor || q.from === state.actor,
    ),
    connections = state.connections.filter(
      (c) => c.to === state.actor || c.from === state.actor,
    );
  const status = {
    pending: "等待回应",
    accept: "已收下",
    reject: "已婉拒",
    withdraw: "已撤回",
    accepted: "已同意",
    rejected: "已婉拒",
    interested: "表示感兴趣",
  };
  let body = `<p>余额 <span class="big-number">${state.wallets[state.actor].coins}</span> 森友币 · 本场已送 ${state.wallets[state.actor].sent} / 5 次</p><div class="actions">${button("设计招牌礼物", "signature")}${button("去森林小铺", "space", 'data-key="shop"')}</div><section class="section"><h3>门口的礼物</h3>`;
  body +=
    incoming
      .map(
        (g) =>
          `<div class="result-row"><strong>${esc(name(g.from))}留下了${esc(state.items.find((i) => i.id === g.item)?.name)}</strong><p>${esc(g.message)}</p><small>${status[g.status]}</small>${g.status === "pending" ? `<div class="actions">${button("收下礼物", "gift-reply", `data-id="${g.id}" data-reply="accept"`, "primary")}${button("谢谢，先不收下", "gift-reply", `data-id="${g.id}" data-reply="reject"`)}</div>` : ""}${g.status === "accept" ? `<div class="actions">${button("邀请成为森友", "connect", `data-id="${g.from}"`)}${state.items.find((i) => i.id === g.item)?.status === "available" && state.items.find((i) => i.id === g.item)?.owner === state.actor ? button("回收礼物 · +8 币", "recycle", `data-id="${g.item}"`) : ""}</div>` : ""}</div>`,
      )
      .join("") || '<p class="muted">还没有礼物。先去认识一个人吧。</p>';
  body += "</section>" + section("我送出的问候", "");
  body += outgoing
    .map(
      (g) =>
        `<div class="result-row"><strong>送给${esc(name(g.to))} · ${status[g.status]}</strong>${g.status === "pending" ? button("撤回礼物", "gift-reply", `data-id="${g.id}" data-reply="withdraw"`) : ""}</div>`,
    )
    .join("");
  body +=
    '<section class="section"><h3>心愿与申请</h3>' +
    requests
      .map(
        (q) =>
          `<div class="result-row"><strong>${esc(name(q.from))} → ${esc(name(q.to))} · ${status[q.status]}</strong><p>${esc(q.wish)}</p>${q.to === state.actor && ["pending", "interested"].includes(q.status) ? `<div class="actions">${button("同意一起", "request-reply", `data-id="${q.id}" data-reply="accepted"`, "primary")}${button("暂时不合适", "request-reply", `data-id="${q.id}" data-reply="rejected"`)}</div>` : ""}${q.from === state.actor && ["pending", "interested"].includes(q.status) ? button("撤回意向", "request-reply", `data-id="${q.id}" data-reply="withdraw"`) : ""}${q.status === "accepted" ? '<div class="notice">已形成同行约定。集合安排请以心愿内容为准；线下见面不会自动被系统验证。</div>' : ""}</div>`,
      )
      .join("") +
    "</section>";
  body +=
    '<section class="section"><h3>成为森友</h3>' +
    connections
      .map(
        (c) =>
          `<div class="result-row"><strong>${esc(name(c.from))} ↔ ${esc(name(c.to))} · ${status[c.status]}</strong>${c.to === state.actor && c.status === "pending" ? `<div class="actions">${button("同意成为森友", "connect-reply", `data-id="${c.id}" data-accept="yes"`, "primary")}${button("暂时不了", "connect-reply", `data-id="${c.id}" data-accept="no"`)}</div>` : ""}${c.status === "accepted" ? '<p class="muted">双方已同意连接。演示不展示真实联系方式，正式产品可再由双方授权交换。</p>' : ""}</div>`,
      )
      .join("") +
    "</section>";
  panel(
    "我的礼物信箱",
    `${me().name} · 本地演示消息，不会发送到真实账号`,
    body,
  );
}
function signature() {
  panel(
    "做一份属于你的问候",
    "礼物数量有限，心意可以很个人。",
    `<label class="field">礼物名字<input type="text" id="signature-name" maxlength="24" value="${esc(me().signature.name)}"></label><div class="columns"><label class="field">样式<select id="signature-template"><option value="leaf">叶片书签</option><option value="tea">一包森林茶</option><option value="photo">一张风景卡</option></select></label><label class="field">颜色<input type="color" id="signature-color" value="${me().signature.color}"></label></div><label class="field">默认附言<textarea id="signature-message" maxlength="120">${esc(me().signature.message)}</textarea></label><small>修改样式只影响尚未送出的招牌礼物，不增加数量。</small>`,
    button("保存我的礼物", "save-signature", "", "primary"),
  );
  $("#signature-template").value = me().signature.template;
}
function spaces() {
  if (!me().confirmed || state.stage !== "open") {
    toast("公共空间会在村长开放串门后开放。");
    return;
  }
  panel(
    "森林里，还有这些地方",
    "走过去，也可以从这里选一个目的地。",
    `<div class="map-links">${SPACES.map(([key, title, sub]) => `<button data-action="space" data-key="${key}">${esc(title)}<span>${esc(sub)}</span></button>`).join("")}</div>`,
  );
}
function space(key) {
  if(key==="shop" && !journey(me()).key) { toast("先认识村长，领到钥匙再来挑选。 ");return; }
  if (key !== "shop" && (!me().confirmed || state.stage !== "open")) {
    const place=SPACES.find(p=>p[0]===key);
    panel(place[1],"公共设施已经就绪，居民的故事还在路上。",`<p class="quote">${esc(place[2])}</p><p>大家正在溪对岸安家。串门开放后，这里会接住居民的分享与心愿；现在可以沿路熟悉森林。</p>`,button("继续逛逛","close","","primary"));
    return;
  }
  const spec = SPACES.find((p) => p[0] === key);
  if (!spec) return;
  hud();
  const [_, title, sub] = spec;
  if (key === "park") {
    const wishes = state.residents.filter(
      (r) =>
        r.confirmed &&
        profile(r.id).profile.wish &&
        !profile(r.id).profile.wish.includes("暂时没有"),
    );
    panel(
      title,
      sub,
      `<div class="actions">${button("翻开公告栏上的居民名册","directory","","primary")}</div>` + wishes
        .map(
          (r) =>
            `<div class="result-row"><strong>${esc(r.name)}的心愿</strong><p>${esc(profile(r.id).profile.wish)}</p><div class="actions">${button("去小屋看看", "visit", `data-id="${r.id}"`, "primary")}</div></div>`,
        )
        .join(""),
    );
    return;
  }
  if (key === "library") {
    panel(
      title,
      sub,
      `<p class="quote">先看光，再按快门。</p><small>小林的学习笔记 · 虚构示例</small><p style="margin-top:20px">${NOTE}</p><div class="notice">${me().bookmarked.includes("light-note") ? "已放进我的收藏。" : "收藏的是一条分享，不是一份对主人的测评。"}</div>`,
      button("收藏这条笔记", "bookmark") +
        button("去认识分享者", "visit", 'data-id="lin"', "primary"),
    );
    return;
  }
  if (key === "growth") {
    panel(
      title,
      sub,
      `<p class="quote">认识一个人之后，也重新认识一点自己。</p><p>小练习：回想刚才的一次互动。什么时候你觉得舒服？下次你希望怎样表达？</p><label class="field" style="margin-top:20px"><textarea id="reflection" maxlength="600" placeholder="这条反思默认只有你自己看见。">${esc(me().notes.reflection || "")}</textarea></label><div class="notice">记录不是打分。是否把它写进自己的说明书，由你决定。</div>`,
      button("只保存这片成长叶", "save-reflection") +
        button("用它更新我的协作介绍", "reflect-profile", "", "primary"),
    );
    return;
  }
  if (key === "play") {
    const result = state.publicResults[`${state.actor}:garden`];
    panel(
      title,
      sub,
      `<p>你和小禾（模拟搭档）要一起摆一座小花园。先选你的做法：</p><div class="actions">${button("先商量布局，再一起摆", "garden", 'data-choice="先商量"')}${button("先摆一小块，边做边改", "garden", 'data-choice="先试做"')}</div>${result ? `<div class="notice">你选择：${esc(result.choice)}。<br>小禾的模拟回应：${esc(result.reply)}</div><label class="field">这让我发现<textarea id="garden-note" maxlength="600">${esc(me().notes.garden || "")}</textarea></label>${button("保存协作小发现", "save-garden", "", "primary")}` : ""}<p class="muted" style="margin-top:20px">没有优劣与人格评分。这是一次本地回合式协作示例，不是实时多人游戏。</p>`,
    );
    if (result) {
      const layout = state.publicResults[`${state.actor}:garden-layout`] || [
        1, 0, 2, 1, 0, 2, 0, 0, 1,
      ];
      $(".panel-body").insertAdjacentHTML(
        "afterbegin",
        `<p class="muted">点格子切换「留白／小花／绿植」。留一条路，让搭档也能走进来。布局会同步摆到场景里。</p><div class="garden-grid">${layout.map((value, i) => button(["留白", "小花", "绿植"][value], "garden-cell", `data-index="${i}"`, value ? "planted" : "")).join("")}</div>`,
      );
    }
    return;
  }
  if (key === "class") {
    const joined = state.publicResults[`${state.actor}:class`];
    panel(
      title,
      sub,
      `<h3>用手机，把一束光留下来</h3><p>分享者：阿泽 · 示例活动<br>时间：今天午休后 · 15 分钟</p><div class="notice">分享提纲：先找一束侧光；靠近你真正想拍的东西；拍三张，再聊聊你选择的那张。</div><p>这间教室承接的是居民愿意分享的小经验，不是完整课程平台。</p>`,
      button(
        joined ? "已加入这场分享" : "加入这场分享",
        "join-class",
        "",
        "primary",
      ) + button("去阿泽家看看", "visit", 'data-id="ze"'),
    );
    return;
  }
  if (key === "workshop") {
    const result = state.publicResults[`${state.actor}:workshop`];
    panel(
      title,
      sub,
      `<h3>一起做一张「百蚂村午休地图」</h3><p>小林的点子：标出适合拍照的角落。<br>小禾的补充：加一条适合慢慢走的路线。<small>以上为虚构搭档的示例贡献。</small></p><label class="field" style="margin-top:20px">我能贡献的一小块<textarea id="workshop-note" maxlength="600" placeholder="一个地点、一点经验，或一件愿意帮忙的事。">${esc(result?.contribution || "")}</textarea></label>${result ? `<div class="notice">成果卡已保存：${esc(result.contribution)}</div>` : ""}`,
      button("把贡献放进成果卡", "save-workshop", "", "primary"),
    );
    return;
  }
  if (key === "shop") {
    panel(
      title,
      sub,
      `<p>我的森友币 <span class="big-number">${state.wallets[state.actor].coins}</span></p><div class="notice">基础个人表达物件始终免费。这里的币只用于本地 Demo 装饰，不是真实能量或支付。</div><div class="gifts">${SHOP.map(([key, name, price]) => `<article class="item"><h3>${name}</h3><p>${price} 森友币</p>${button(me().decor.includes(key) ? "已经摆进小屋" : "选这件", "buy", `data-product="${key}"`, me().decor.includes(key) ? "subtle" : "primary")}</article>`).join("")}</div>`,
      button("回小屋看看", "own"),
    );
  }
}
function presenterPanel() {
  presenter = true;
  panel(
    "村长的演示手册",
    "仅控制本机示例，不会改变其他设备的状态。",
    `<div class="notice">当前角色：${esc(me().name)} · ${state.stage === "open" ? "串门已开放" : "正在准备小屋"}。切换角色即模拟对方看到的画面。</div><div class="toolbar"><select id="actor-select">${state.residents
      .filter(r=>!r.id.startsWith('stress-'))
      .map(
        (r) =>
          `<option value="${r.id}" ${r.id === state.actor ? "selected" : ""}>${esc(r.name)}</option>`,
      )
      .join(
        "",
      )}</select>${button("切换到这个角色", "switch-role", "", "primary")}${button(state.stage === "open" ? "关闭串门" : "开放串门", "toggle-stage")}</div><section class="section"><h3>从共同建村开始</h3><p>首次入驻从空宅地开始。模拟同学随你的报到、建设和表达逐步安家，不是真实在线用户。提前完成的人可以继续布置；开放不会替未完成的人确认介绍。</p><div class="actions">${button("模拟下一批同学安家", "cohort-next")}${button("演示 50 人班级容量", "cohort-50")}${button("从空宅地重新体验", "reset")}</div><p>当前模拟进度 ${state.openingStep}/5 · 实际到达 ${villageCounts(state).arrived} 位 · 已准备好 ${villageCounts(state).ready} 间。</p></section><section class="section"><h3>直接看已建好的村庄</h3><p>为讲解准备完整的虚构居民，直接体验串门。不会填写或确认你的个人资料。</p>${button("进入已建村庄演示","mature-demo","","primary")}</section><div class="actions">${button("设置村长与村庄", "village")}${button("培训扫码入驻", "qr")}</div><section class="section"><h3>已建村庄的故事章节</h3><p class="muted">以下是演示者快捷方式，会准备虚构角色；不是普通玩家的开场。</p><div class="story-list">${["从村口观察已建村庄", "小林的小屋与完整说明书", "村庄开放，小禾发现摄影心愿", "走进小林家，逐层认识他", "小禾提交同行申请", "切换小林，回应申请", "留份礼物，建立一次连接", "活动之后，在成长林回顾"].map((t, i) => button(t, "story", `data-index="${i}"`)).join("")}</div></section><small>DISC、合拍建议和其他居民均为示例。联系人交换、真实报告、跨设备同步由正式产品实现。</small>`,
    "",
    "wide",
  );
  const nextBatch=$('[data-action="cohort-next"]');
  if(state.experience!=='opening' || state.openingStep>=5) {
    nextBatch.disabled=true;
    nextBatch.textContent=state.experience!=='opening'?'当前是已建村庄演示':'安家示例已展示完，未完成人可继续布置';
  }
}
function village() {
  panel(
    "今天，由你来当村长",
    "修改后，欢迎语和扫码链接会同步使用。",
    `<div class="columns"><label class="field">村庄名称<input type="text" id="v-name" maxlength="30" value="${esc(state.village.name)}"></label><label class="field">村长名字<input type="text" id="v-mayor" maxlength="30" value="${esc(state.village.mayor)}"></label><label class="field">说话语气<select id="v-tone"><option>温暖</option><option>轻快</option><option>简洁</option></select></label><label class="field">村长形象<select id="v-appearance"><option value="green">苔绿外套</option><option value="earth">陶土外套</option><option value="blue">湖蓝外套</option></select></label></div><label class="field">欢迎的话<textarea id="v-welcome" maxlength="300">${esc(state.village.welcome)}</textarea></label><label class="field">今天的目标<textarea id="v-goal" maxlength="300">${esc(state.village.goal)}</textarea></label>`,
    button("保存村庄设置", "save-village", "", "primary"),
  );
  $("#v-tone").value = state.village.tone;
  $("#v-appearance").value = state.village.appearance;
}
async function qr() {
  const url = new URL("./", location.href);
  url.searchParams.set("village", state.village.name);
  const defaults=fresh().village;
  if(['welcome','mayor','goal','tone','appearance'].some(k=>state.village[k]!==defaults[k]))
    url.searchParams.set("config", await encodeVillage(state.village));
  let qr = qrcode(0, "M");
  qr.addData(url.href);
  try { qr.make(); } catch {
    qr=qrcode(0,"L"); qr.addData(url.href); qr.make();
  }
  panel(
    "扫码，来到我们的村庄",
    "手机打开即进入自己的入驻体验。",
    `<div id="qr">${qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true })}</div><p style="text-align:center">${esc(state.village.name)}</p><p class="notice">每台设备保存自己的体验。这个 Demo 不同步班级成员、开放状态或互动消息。</p><a href="${esc(url.href)}" target="_blank" rel="noopener">打开扫码对应的链接</a>`,
    button(
      "复制入驻链接",
      "copy-link",
      `data-url="${esc(url.href)}"`,
      "primary",
    ),
  );
}
function story(i) {
  presenter = true;
  if(!commit({type:'prepareDemo'}))return;
  let next = structuredClone(state);
  next.actor = (i >= 2 && i <= 4) || i === 6 ? "he" : "lin";
  next.stage = i >= 2 ? "open" : "preparing";
  if (!saveState(next)) return;
  close();
  if (i === 0) {
    world.overview();
    welcome();
  }
  if (i === 1) {
    visit("lin");
    book();
  }
  if (i === 2) {
    homeId=null;world.town([SPACE_POS.park[0],SPACE_POS.park[1]+2.5]);
    space("park");
  }
  if (i === 3) {
    visit("lin");
    object("interest");
  }
  if (i === 4) {
    visit("lin");
    object("wish");
  }
  if (i === 5) {
    if (
      !state.requests.some(
        (r) =>
          r.from === "he" &&
          r.to === "lin" &&
          ["pending", "accepted"].includes(r.status),
      )
    ) {
      const old = state.actor;
      commit({ type: "switch", id: "he" });
      commit({ type: "request", to: "lin" });
      commit({ type: "switch", id: old });
    }
    visit("lin");inbox();
  }
  if (i === 6) {
    visit("lin");
    gift();
  }
  if (i === 7) {
    homeId=null;world.town([SPACE_POS.growth[0],SPACE_POS.growth[1]+2.5]);
    space("growth");
  }
  hud();
}
function qualityPanel() {
  panel(
    "运行检查",
    "只用于本地演示验收，不代表真实并发能力。",
    `<p>五条居民街巷共 50 个独立宅地，公共设施位于溪流另一侧。当前到达 ${villageCounts(state).arrived} 位，已领宅地 ${villageCounts(state).claimed} 块，已准备好 ${villageCounts(state).ready} 间。人数与状态仅在本机模拟，不代表实时并发。</p><div class="actions">${button("演示 50 人班级容量", "cohort-50")}</div><section class="section"><h3>渲染采样</h3><p id="performance-result">${world.benchmarkResult ? esc(world.benchmarkResult) : "点击后会关闭面板，连续采样 60 秒。保持页面在前台，可以正常走动。"}</p>${button("开始 60 秒采样", "benchmark", "", "primary")}</section>`,
    button("回演示手册", "presenter"),
  );
}
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.profile)
    commit({ type: "profile", profile: { [el.dataset.profile]: el.value } });
  if (el.id === "resident-name") commit({ type: "profile", name: el.value });
  if (["outfit", "skin", "hair"].includes(el.id))
    commit({ type: "profile", appearance: { [el.id]: el.value } });
  if (el.id === "resident-search") {
    search = el.value;
    drawResidents();
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.public)
    commit({ type: "profile", public: { [el.dataset.public]: el.checked } });
  if (el.id === "reviewed") commit({ type: "profile", reviewed: el.checked });
  if (el.id === "wish-mode") commit({ type: "profile", wishMode: el.value });
  if (el.id === "resident-filter") {
    filter = el.value;
    drawResidents();
  }
  if (el.id === "v-tone") {
    $("#v-welcome").value = {
      温暖: "欢迎来到我们的森林。今天，借一间小屋，慢慢认识自己，也认识身边的人。",
      轻快: "来啦！今天让你的小屋先替你打个招呼，再去认识几个有意思的邻居吧。",
      简洁: "欢迎入驻。先完成个人说明书，确认后等待开放，再去串门与交流。",
    }[el.value];
  }
});
let recentTransaction = { key: "", at: 0 };
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action,
    d = b.dataset;
  if (
    [
      "buy",
      "send-gift",
      "request",
      "gift-reply",
      "recycle",
      "request-reply",
    ].includes(a)
  ) {
    const key = [a, d.id, d.product, homeId].join(":");
    if (
      recentTransaction.key === key &&
      performance.now() - recentTransaction.at < 650
    )
      return;
    recentTransaction = { key, at: performance.now() };
  }
  try {
    switch (a) {
      case "cohort-next":
        if(presenter && commit({type:'cohortNext'})) {close();hud();toast("示例同学开始下一轮安家。未接手的虚构角色随演示推进。");}
        break;
      case "cohort-50":
        if(presenter && commit({type:'cohort50'})) {close();world.overview();hud();toast("已准备 50 人的本机模拟；还没到达的人不会拥有小屋。可在演示手册推进安家。");}
        break;
      case "mature-demo":
        if(presenter) {story(2);close();world.overview();hud();}
        break;
      case "build-home":
        if(world.mode==='town' && Math.hypot(world.pos.x-PLOTS[me().plot]?.x,world.pos.z-(PLOTS[me().plot]?.z+3.5))<.8 && commit({type:'buildHome'})) {close();hud();toast("基础小屋搭起来了。走到门前，再进去布置自己的故事。");}
        break;
      case "camera-in": world.cameraRig.zoom(.8);break;
      case "camera-out": world.cameraRig.zoom(1.25);break;
      case "camera-reset": world.cameraRig.frame();break;
      case "interact": world.interact(world.nearest); break;
      case "mayor-next":
        if(!me().name.trim() || me().name==="新森友") { toast("先告诉村长怎么称呼你吧。");break; }
        if(mayorTurn<2) { mayorTurn++;mayor(); }
        else if(commit({type:"meetMayor"})) { close();hud();toast(`领到了 ${address(me())} 的钥匙。过桥后，走到「我的宅地」打开工具箱。`); }
        break;
      case "finish-station":
        if(commit({type:"finishStation",key:d.key})) { close();world.updateProps(me());world.refreshPins();toast(STATIONS[d.key].result+"。回到房间，继续认识自己。");hud(); }
        break;
      case "close":
        close();
        break;
      case "edit": walkObject("door"); break;
      case "edit-step": edit(stationKey); break;
      case "private":
        commit({
          type: "profile",
          profile: { [d.key]: me().profile[d.key] || "暂时不想公开" },
          public: { [d.key]: false },
        });
        edit();
        break;
      case "no-wish":
        commit({ type: "profile", profile: { wish: "暂时没有心愿" } });
        edit();
        break;
      case "confirm":
        if (commit({ type: "confirm" })) {
          close();hud();
          toast("欢迎牌挂好了，小屋亮灯了。你的介绍已确认，开放串门后再迎接邻居。");
        }
        break;
      case "own":
        walkHome(state.actor);
        break;
      case "exit-home":
        walkObject("exit");
        break;
      case "map":
        close();
        if(world.mode==="home") { toast("先走到门口出门，再俯瞰森林。");break; }
        if(world.mode==="overview") world.returnToPlayer();
        else world.overview();
        hud();
        break;
      case "directory":
        directory();
        break;
      case "visit":
        directoryScroll = $(".panel-body")?.scrollTop || 0;
        walkHome(d.id);
        break;
      case "book":
        walkObject("book");
        break;
      case "chapter":
        book(d.index);
        break;
      case "object":
        walkObject(d.key);
        break;
      case "spaces":
        spaces();
        break;
      case "space":
        walkSpace(d.key);
        break;
      case "inbox":
        walkObject("mail");
        break;
      case "gift":
        walkObject("mail");
        break;
      case "send-gift":
        if (
          commit({
            type: "sendGift",
            to: homeId,
            item: $("#gift-item").value,
            message: $("#gift-message").value,
          })
        ) {
          close();
          world.updateProps(profile(homeId));
          toast("礼物已经留在门口，等待对方回应。");
        }
        break;
      case "gift-reply":
        if (commit({ type: "giftReply", id: d.id, reply: d.reply })) inbox();
        break;
      case "recycle":
        if (commit({ type: "recycle", item: d.id })) {
          toast("已回收，获得 8 森友币。");
          if(homeId===state.actor) inbox();else gift();
        }
        break;
      case "signature":
        signature();
        break;
      case "save-signature":
        if (
          commit({
            type: "signature",
            name: $("#signature-name").value,
            color: $("#signature-color").value,
            template: $("#signature-template").value,
            message: $("#signature-message").value,
          })
        ) {
          toast("招牌礼物已保存。");
          if(homeId===state.actor) inbox(); else gift();
        }
        break;
      case "buy":
        if (commit({ type: "buy", product: d.product })) {
          toast("已经放进你的物品里。");
          space("shop");
        }
        break;
      case "request":
        if (commit({ type: "request", to: d.id })) {
          toast("意向已送达。可以在演示者模式切换对方回应。");
          object("wish");
        }
        break;
      case "request-reply":
        if (commit({ type: "requestReply", id: d.id, reply: d.reply })) inbox();
        break;
      case "pair":
        panel(
          "如果我们一起做这件事",
          "示例合拍建议 · 不是测评结论，也没有匹配分数",
          `<p>以下仅是演示如何把相处建议放进一次具体的合作，不读取真实 DISC 数据。</p><div class="notice">先对齐：这次只是轻松练习，不比较谁拍得好。<br>各留一点空间：先各自拍三张，再交换喜欢的一张。<br>遇到不同意见：问问对方为什么这样选，再提出建议。</div><small>正式的双人报告需要双方授权。是否加入，仍由你自己判断。</small>`,
          button("回心愿瓶再决定", "object", 'data-key="wish"', "primary"),
        );
        break;
      case "connect":
        if (commit({ type: "connect", to: d.id })) {
          toast("已发出成为森友的邀请。");
          inbox();
        }
        break;
      case "connect-reply":
        if (
          commit({ type: "connectReply", id: d.id, accept: d.accept === "yes" })
        )
          inbox();
        break;
      case "bookmark":
        commit({ type: "bookmark", key: "light-note" });
        space("library");
        break;
      case "save-reflection":
        if (
          commit({
            type: "note",
            key: "reflection",
            value: $("#reflection").value,
          })
        ) {
          toast("这片成长叶已私密保存。");
          space("growth");
        }
        break;
      case "reflect-profile": {
        const value = $("#reflection").value.trim();
        if (!value) {
          toast("先写下一点发现吧。");
          break;
        }
        commit({ type: "note", key: "reflection", value });
        panel(
          "把这段发现写进我的介绍？",
          "需要你明确确认，不会自动公开反思。",
          `<p>${esc(value)}</p><div class="notice">将替换「和我一起做事」这一项。原来的公开范围保持不变，可在编辑页调整。</div>`,
          button("先保留为私人反思", "close") +
            button("确认更新协作介绍", "apply-reflection", "", "primary"),
        );
        break;
      }
      case "apply-reflection":
        if (
          commit({
            type: "profile",
            profile: { collaboration: me().notes.reflection },
          })
        ) {
          toast("协作介绍已更新，册子与小屋同步。");
          close();
        }
        break;
      case "garden":
        commit({
          type: "publicResult",
          key: "garden",
          value: {
            choice: d.choice,
            reply:
              d.choice === "先商量"
                ? "那我们先留一条小路，再决定花摆在哪里。"
                : "好呀，我先观察你摆的这一块，再补上小路。",
          },
        });
        space("play");
        break;
      case "garden-cell": {
        const layout = [
          ...(state.publicResults[`${state.actor}:garden-layout`] || [
            1, 0, 2, 1, 0, 2, 0, 0, 1,
          ]),
        ];
        layout[Number(d.index)] = (layout[Number(d.index)] + 1) % 3;
        if (
          commit({ type: "publicResult", key: "garden-layout", value: layout })
        )
          space("play");
        break;
      }
      case "save-garden":
        commit({ type: "note", key: "garden", value: $("#garden-note").value });
        toast("协作小发现已私密保存。");
        break;
      case "join-class":
        commit({ type: "publicResult", key: "class", value: { joined: true } });
        space("class");
        break;
      case "save-workshop": {
        const contribution = $("#workshop-note").value.trim();
        if (!contribution) {
          toast("写下一点具体贡献吧。");
          break;
        }
        commit({
          type: "publicResult",
          key: "workshop",
          value: { contribution },
        });
        space("workshop");
        break;
      }
      case "toggle-stage":
        if (!presenter) break;
        commit({ type: "stage", open: state.stage !== "open" });
        close();
        hud();
        toast(
          state.stage === "open"
            ? "村长宣布：现在可以去串门啦！"
            : "已回到入驻阶段。",
        );
        break;
      case "switch-role":
        if (
          presenter &&
          commit({ type: "switch", id: $("#actor-select").value })
        ) {
          homeId = null;
          world.town();
          hud();
          presenterPanel();
        }
        break;
      case "village":
        if (presenter) village();
        break;
      case "save-village":
        if (
          presenter &&
          commit({
            type: "village",
            value: {
              name: $("#v-name").value || "百蚂村",
              mayor: $("#v-mayor").value || "森森",
              tone: $("#v-tone").value,
              appearance: $("#v-appearance").value,
              welcome: $("#v-welcome").value,
              goal: $("#v-goal").value,
            },
          })
        ) {
          toast("村庄设置已保存。");
          presenterPanel();
        }
        break;
      case "qr":
        await qr();
        break;
      case "copy-link":
        try {
          await navigator.clipboard.writeText(d.url);
          toast("入驻链接已复制。");
        } catch {
          toast("浏览器未允许复制，可点击上方链接后复制地址。");
        }
        break;
      case "story":
        if (presenter) story(Number(d.index));
        break;
      case "presenter":
        presenterPanel();
        break;
      case "quality":
        if (presenter) qualityPanel();
        break;
      case "stress-load": {
        if (!presenter) break;
        const s = structuredClone(state);
        s.residents = s.residents.filter((r) => !r.id.startsWith("stress-"));
        const base = s.residents.find((r) => r.id === "lin");
        for (let i = 0; i < 94; i++)
          s.residents.push({
            ...structuredClone(base),
            id: `stress-${i}`,
            name: `虚构森友${String(i + 1).padStart(2, "0")}`,
            group: "列表负载测试",
          });
        if (saveState(s)) qualityPanel();
        break;
      }
      case "stress-clear": {
        if (!presenter) break;
        const s = structuredClone(state);
        s.residents = s.residents.filter((r) => !r.id.startsWith("stress-"));
        if (saveState(s)) qualityPanel();
        break;
      }
      case "benchmark": {
        if (!presenter) break;
        world.benchmark = { start: performance.now(), frames: 0 };
        close();
        world.town();
        hud();
        toast("开始 60 秒渲染采样，请保持页面在前台。");
        break;
      }
      case "reset":
        if (presenter)
          panel(
            "恢复初始演示？",
            "只清除新版在本机的体验数据，旧版不受影响。",
            "<p>当前填写、礼物和活动记录将被清除。此操作不能撤销。</p>",
            button("取消", "close") +
              button("确认重置新版", "reset-confirm", "", "danger"),
          );
        break;
      case "reset-confirm":
        if (presenter && saveState(fresh())) {
          mayorTurn=0;presenter=false;
          homeId = null;
          world.town();
          close();
          welcome();
        }
        break;
      case "report":
        panel(
          "把报告当作起点，不是答案",
          "仅演示授权与确认流程，不上传或解析真实报告。",
          '<p>示例参考：愿意发起交流、喜欢探索可能性。它只能帮助你组织表达，不能推断你实际擅长什么。</p><label class="checkline"><input id="report-consent" type="checkbox">我同意使用这份虚构报告的建议，作为可以修改的草稿。</label>',
          button("不使用，继续自己写", "edit-step", 'data-step="0"') +
            button("带入示例建议", "use-report", "", "primary"),
        );
        break;
      case "use-report":
        if (!$("#report-consent").checked) {
          toast("请先确认是否使用示例建议。");
          break;
        }
        commit({
          type: "profile",
          profile: {
            headline:
              me().profile.headline ||
              "我愿意先抛出一个想法，再听听大家的回应。",
            traits: me().profile.traits || "好奇、愿意交流",
          },
          reviewed: false,
        });
        edit(0);
        break;
    }
  } catch (err) {
    console.error(err);
    toast("这一步没有完成，请重试。");
  }
});
$("#presenter-entry").onclick = () => {
  presenterPanel();
  $(".panel-foot")?.remove();
  $(".panel-body").insertAdjacentHTML(
    "beforeend",
    `<div class="actions">${button("运行检查", "quality")}</div>`,
  );
};
const stick = $("#joystick");
function joy(e) {
  const r = stick.getBoundingClientRect(),
    x = (e.clientX - r.left - r.width / 2) / 32,
    y = (e.clientY - r.top - r.height / 2) / 32,
    len = Math.max(1, Math.hypot(x, y));
  if (world) world.joy = { x: x / len, y: y / len };
  stick.firstElementChild.style.transform = `translate(${(x / len) * 22}px,${(y / len) * 22}px)`;
}
stick.onpointerdown = (e) => {
  stick.setPointerCapture(e.pointerId);
  joy(e);
};
stick.onpointermove = (e) => {
  if (stick.hasPointerCapture(e.pointerId)) joy(e);
};
function release() {
  if (world) world.joy = { x: 0, y: 0 };
  stick.firstElementChild.style.transform = "";
}
stick.onpointerup = release;
stick.onpointercancel = release;
async function init() {
  try {
    if (params.get("config") && !state.welcomeSeen) {
      try { Object.assign(state.village, await decodeVillage(params.get("config"))); }
      catch { toast("邀请里的村庄配置无法读取，已使用默认村庄。你仍可正常体验。"); }
    }
    for (const k of ["welcome", "mayor", "goal", "tone", "appearance"])
      if (params.get(k) && !state.welcomeSeen)
        state.village[k] = params
          .get(k)
          .slice(0, k === "welcome" || k === "goal" ? 300 : 30);
    world = new ForestWorld($("#world"), (hit) => {
      if (hit.type === "mayor") mayor();
      if (hit.type === "resident") door(hit.id);
      if (hit.type === "plot") plotVisit(hit.plot);
      if (hit.type === "object") object(hit.key);
      if (hit.type === "space") space(hit.key);
      if (hit.type === "exit") {
        leaveHome();
      }
    });
    await world.load();
    world.setState(state);
    world.town();
    $("#loading").remove();
    hud();
    // Read-only diagnostics: no application writes or bypass of public actions.
    window.forestDiagnostics = {
      build: "village-v4-20260928",
      settlement: () => world.plots.map((p,i)=>({plot:i,resident:p.resident,stage:p.stage,visible:Object.entries(p.parts).filter(([,o])=>o.visible).map(([k])=>k)})),
      camera: () => world.cameraRig.snapshot(),
      snapshot: () => structuredClone(state),
      position: () => world.pos.toArray(),
      metrics: () => ({
        ...world.metrics,
        drawCalls: world.renderer.info.render.calls,
        triangles: world.renderer.info.render.triangles,
      }),
      mode: () => world.mode,
      interaction: () => structuredClone(world.lastInteraction || null),
      route: () => ({length:world.route?.length || 0, target:world.pending?.key || null}),
    };
  } catch (e) {
    console.error(e);
    $("#loading").innerHTML =
      '<h1>森林还没加载好</h1><p>请检查网络后再试一次。你的本地填写不会被清除。</p><button onclick="location.reload()">重新加载</button>';
  }
}
window.addEventListener("resize", () => { if (world) hud(); });
window.addEventListener("forest-mode", () => { if(world)hud(); });
init();
