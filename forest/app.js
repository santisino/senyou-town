import { ForestWorld } from "./world.js?v=real-report-v1";
import { createCognitionUI } from './cognition-ui.js?v=real-report-v1';
import { cognition,sample,progress as cognitionProgress } from './cognition-data.js?v=real-report-v1';
import { caseStorage,loadReportCase,freshReportCase } from './real-report-case.js?v=real-report-v1';
import { QUESTIONS, draftProfile } from "./interview.js?v=neighbors-v1";
import { GUIDES, PHOTO_SPOTS, photoMap, gardenCheck } from "./space-guides.js?v=neighbors-v1";
import { createSharing } from "./share-ui.js?v=connections-v2";
import { createVillageUI } from './village-ui.js?v=cognition-v2';
import { createLessonUI } from './lesson-ui.js?v=cognition-v2';
import { entry, soloEmployee, nextDemoResponse } from './entry-data.js?v=cognition-v2';
import { createEntryUI } from './entry-ui.js?v=real-report-v1';
import { lesson,livePair,PHASES } from './lesson-data.js?v=cognition-v2';
import { EXTRA_FIELDS } from './connect-data.js?v=cognition-v2';
import { activeVillage, isPublic, joined, applyArrival, checkpoint } from './villages.js?v=cognition-v2';
import { FIELDS, SPACES, SHOP, NOTE } from "./data.js?v=village-v4";
import {
  fresh,
  load as loadState,
  persist as persistState,
  resident,
  visible,
  canVisit,
  matches,
  transact,
  ready,
} from "./state.js?v=real-report-v1";
import qrcode from "../vendor/qrcode.mjs";
import { encodeVillage, decodeVillage } from "./config.js";
import { journey, nextStation, STATIONS } from "./journey.js?v=cognition-v2";
import { PLOTS, SPACE_POS, address } from "./layout.js";
import { houseStage, villageCounts } from "./settlement.js?v=cognition-v2";
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
const params = new URLSearchParams(location.search);
const isReportCase = params.get('case') === 'bestdisc';
const reportCaseStorage = isReportCase ? caseStorage(globalThis.localStorage) : undefined;
const persist = s => persistState(s, reportCaseStorage);
let state = isReportCase ? loadReportCase(reportCaseStorage) : loadState(),
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
let sharing, villageUI, lessonUI, entryUI, cognitionUI;
let interviewGroup='interest', interviewIndex=0;
let demoVisitTimer;
let demoResponseTimer;
if (params.get("village") && !params.get('entry') && !state.welcomeSeen)
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
    const profileOnly = ['interview','note','entry:response'].includes(a.type) || a.type.startsWith('cog:') || a.type.startsWith('social:') || (a.type.startsWith('class:')&&!a.type.startsWith('class:admin:')) || (a.type === "profile" && resident(next).confirmed === me().confirmed);
    persist(next);
    state = next;
    world?.setState(state, { profileOnly });
    if (world?.mode === "home" && homeId) world.updateProps(profile(homeId));
    if(a.type.startsWith('cog:'))world?.updateCognitionScene();
    if (!profileOnly||a.type.startsWith('class:')||a.type==='entry:response') hud();
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
  $('#panel-root').dataset.space='';
  $('#panel-root').dataset.pair='';
  returnFocus = document.activeElement;
  world?.setBlocked(true);
  document.body.classList.add("panel-open");
  $("#panel-root").innerHTML =
    `<div class="scrim"><section class="panel ${classes}" role="dialog" aria-modal="true" aria-labelledby="panel-title"><div class="panel-head"><div><h2 id="panel-title">${esc(title)}</h2>${subtitle ? `<small>${esc(subtitle)}</small>` : ""}</div><button class="close" data-action="close" aria-label="关闭">×</button></div><div class="panel-body">${body}</div>${foot ? `<div class="panel-foot">${foot}</div>` : ""}</section></div>`;
  $(".close")?.focus({ preventScroll: true });
}
function close() {
  sharing?.dispose();
  cognitionUI?.dispose();
  lessonUI?.dispose();
  document.body.classList.remove("panel-open");
  $("#panel-root").innerHTML = "";
  world?.setBlocked(false);
  returnFocus?.isConnected && returnFocus.focus({ preventScroll: true });
}
function dismissPanel() {
  if(entry(state).role==='organizer') {
    if($('.mayor-panel'))entryUI?.handle('entry-gate',{});
    else {close();villageUI.admin(0);}
  } else close();
}
function villageTravel(dismiss=true) {
  clearTimeout(demoVisitTimer);demoVisitTimer=null;
  homeId=null;mayorTurn=0;search='';filter='all';directoryScroll=0;
  world?.town();if(dismiss)close();hud();
  const url=new URL(location.href);for(const k of ['entry','who','kind','vid','policy','config','village','welcome','mayor','goal','tone','appearance'])url.searchParams.delete(k);
  history.replaceState(null,'',url);
}
function walkMayor() {
  close();if(world.mode==='home'){exitThen(walkMayor);return;}
  world.approach('mayor');hud();
}
function followShare() {
  const arrival=state.network.arrival;
  if(!arrival||arrival.kind!=='share')return;
  if(!joined(state)||!me().confirmed){walkMayor();return;}
  if(arrival.content==='work')walkSpace('workshop');else walkHome(arrival.who);
}
document.addEventListener("keydown", (e) => {
  if (!$(".panel")) return;
  if (e.key === "Escape") {
    e.preventDefault();
    dismissPanel();
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
  entryUI?.sync();
  document.body.dataset.reportCase=String(isReportCase);
  if(isReportCase){
    $('#role-badge').textContent=innerWidth<700?'知微 · 真实案例':'代入知微 · 真实报告案例';
    $('#report-case-entry').textContent=innerWidth<700?'退出案例':'返回普通体验';
    $('#report-case-entry').href='?v=real-report-v1';
    $('#report-case-reset').hidden=false;
    $('#report-case-reset').textContent=innerWidth<700?'重置案例':'重新体验案例';
  }
  document.body.dataset.scene = world?.mode || "overview";
  $("#village-name").textContent = `${isPublic(state)?'公共村':'场景村'}｜${state.village.name}`;
  document.title = `蚂蚁森友会 · ${state.village.name}`;
  const r = me(),
    isHome = world?.mode === "home";
  $("#house-tools").innerHTML = "";
  let title, copy;
  const j=journey(r), next=nextStation(r);
  title=!j.key ? "先逛逛，找到村长" : !r.built ? "到我的宅地，打开工具箱" : !r.confirmed ? isHome ? next ? STATIONS[next].title : "翻开册子，确认小屋里的我" : "进小屋，留下自己的故事" : state.stage!=="open" ? "安家完成，等村长开放串门" : "带着好奇，去认识一位森友";
  copy=!j.key ? "公共空间已经就绪，溪对岸的居民区等我们一起建设。村长在村口等你。" : !r.built ? `钥匙对应 ${address(r)}。过桥后，走到你的宅地开始安家。` : !r.confirmed ? isHome ? "走到物件旁留下故事，再回到房间继续布置。" : "可以自己走，也可以点小屋沿路过去。" : isHome ? "走近物件，读读这个人的故事。" : state.stage!=="open" ? "可以去小铺挑装饰、在信箱制作礼物，或沿路看村庄长出来。" : "公园公告栏有居民名册。先发现，再沿小路去拜访。";
  $("#mission").innerHTML=`<div class="step">${esc(state.stage==="open"?"串门时间":"初到森林")}</div><h2>${esc(title)}</h2><p>${esc(copy)}</p>`;
  if(soloEmployee(state)&&r.confirmed&&state.stage==='preparing')$('#mission').innerHTML=`<div class="step">我的小屋准备好了</div><h2>回村口，向村长报到</h2><p>让村长看看你的欢迎牌，再一起开启串门时间。</p>${button('沿路去找村长','walk-mayor','','primary')}`;
  if(!joined(state))$('#mission').innerHTML=`<div class="step">${esc(state.village.name)}</div><h2>${me().membership==='pending'?'等待村长回应':'先逛逛，认识这里的村长'}</h2><p>${isPublic(state)?'这座村一直开放。找村长聊聊，再决定加入和公开哪些介绍。':'活动村分别管理加入。拿到活动邀请后，到村口确认自己的公开范围。'}</p>`;
  if(state.stage==='archived')$('#mission').innerHTML=`<div class="step">活动已归档</div><h2>这段相遇，先收在这里</h2><p>个人资料仍保留。你可以从「村庄」去蚂蚁森友村，选择新的公开范围。</p>`;
  if(!isPublic(state)&&joined(state)&&r.confirmed&&state.stage==='open'&&lesson(state).phase>0){
    const task=livePair(state),phase=lesson(state).phase;
    const hint=task?.status==='pending'&&task.members[1]===state.actor?'收到一份协作邀请，去教室看看。':phase===1?'公告栏有懂我卡，找一个具体的连接理由。':phase===2?'协作任务已发布，去教室和伙伴一起做个决定。':'课后可以到成长林记录一次真实尝试。';
    $('#mission').insertAdjacentHTML('beforeend',`<p class="lesson-world-hint"><strong>百蚂合拍局 · ${PHASES[phase]}</strong><br>${hint}${button(phase===1&&!task?'沿路去公告栏':'沿路去教室','space',`data-key="${phase===1&&!task?'park':'class'}"`)}</p>`);
    if(soloEmployee(state)&&phase===1&&task?.status==='accepted')$('#mission').innerHTML=`<div class="step">伙伴已接受邀请 · 示例回应</div><h2>找村长听下一段安排</h2><p>你们已经结伴。回村口听听接下来一起做什么。</p>${button('沿路去找村长','walk-mayor','','primary')}`;
  }
  const arrival=state.network.arrival;
  if(isHome&&homeId===state.actor&&r.confirmed&&!r.social?.identityConfirmed)$('#mission').insertAdjacentHTML('beforeend',`<p class="lesson-world-hint">册子里还留着一张属于你的村民卡。选一个喜欢的森林称号，把自己的介绍带走。${button('走到册子旁领取','book')}</p>`);
  if(arrival?.kind==='share')$('#mission').insertAdjacentHTML('beforeend',`<div class="arrival-note">${arrival.sample?'你收到了一份分享。本轮用小林的虚构小屋示范后续体验。':`${esc(name(arrival.who))}的${({house:'小屋',profile:'个人名片',wish:'心愿',pair:'同行',work:'共创'})[arrival.content]}分享带你来到这里。`}<br>${button(joined(state)&&r.confirmed?(arrival.content==='work'?'走到共创工坊':'沿路去邀请人家里'):'去村口找村长','follow-share')}</div>`);
  $("#navigation").innerHTML=(isHome?button("走到门口出门","exit-home"):button(world?.mode==="overview"?"回到脚下":"俯瞰森林","map"))+button("","interact",'id="near-action" hidden',"primary");
  const gifts=state.gifts.filter(g=>g.to===state.actor&&g.status==='pending').length;
  if(r.built && (homeId!==state.actor || !isHome)) $("#navigation").insertAdjacentHTML('beforeend',button(gifts?`回家收礼物 · ${gifts}`:'回我的小屋','own','','home-waypoint'));
  if(gifts) $("#mission").insertAdjacentHTML('beforeend',`<p class="mail-notice">✉ 信箱有 ${gifts} 份待回应的礼物${state.gifts.some(g=>g.to===state.actor&&g.status==='pending'&&g.demoVisit)?' · 含示例森友来访':''}。${isHome&&homeId===state.actor?'走到信箱旁看看。':'有空回家看看。'}</p>`);
  $("#scene-caption").textContent = isHome
    ? `${name(homeId)}的小屋 · 每件物品，都藏着一点故事`
    : "风经过树梢，也经过彼此的生活。";
  $("#movement-help").textContent =
    innerWidth < 700
      ? "拖动左侧摇杆走动 · 点击路面或物件"
      : "WASD 走动 · 鼠标停在边缘移动视角 · 拖动旋转 · 右键平移 · 滚轮缩放";
  if(innerWidth<700) $("#movement-help").textContent="摇杆走路 · 单指拖动转视角 · 双指缩放/平移 · 轻点互动";
  $("#joystick").style.visibility =
    world?.mode === "overview" ? "hidden" : "visible";
  const counts=villageCounts(state);
  $("#village-progress").textContent=isHome ? address(resident(state,homeId)) : `50 个宅地 · ${counts.arrived} 位到达 · ${counts.ready} 间准备好`;
  $("#village-progress").style.top=($("#mission").offsetTop+$("#mission").offsetHeight+8)+'px';
  $(".demo-label").textContent=state.experience==='opening'?"共同建村 · 同学进度为本机模拟 · 不跨设备同步":"已建村庄演示 · 虚构居民 · 本地保存";
  if(isPublic(state))$('.demo-label').textContent='蚂蚁森友村 · 持续开放的公共村演示 · 不跨设备同步';
  if(isHome&&homeId===state.actor){
    const privateMode=world.studyOpen,count=cognitionProgress(state).filter(x=>x.done).length;
    if(privateMode){$('#mission').innerHTML=innerWidth<700?`<div class="step">私人认知区 · ${count}/7</div><h2>${cognition(state)?'走近物件，慢慢认识自己':'先走到右下方的报告匣'}</h2><p>报告和反思只留给自己；分享前，再确认一句话。</p>`:`<div class="step">私人认知区 · 仅自己</div><h2>${cognition(state)?'慢慢读懂不同情境下的我':'先走到报告匣，选择一个示例'}</h2><p>${cognition(state)?'风格配方 → 三扇窗 → 行为书架 → 门牌内面 → 壁炉镜子 → 阳光配方 → 合拍实验台。每一步走近物件再点。':'报告匣在右下角。这里只展示虚构样例，不上传真实报告。'}</p><div class="cog-world-hint">${count}/7 项已留下探索结果。私人内容不会进入串门资料；只有分享出口亲自确认的那一句话会带出去。</div>`;}
    else if(innerWidth<700)$('#mission').innerHTML=`<div class="step">我的小屋 · 左右都能逛</div><h2>${esc(r.confirmed?'左侧待客，右侧认识自己':title)}</h2><p>${r.confirmed?'点右侧报告匣或书架，人物会走进去。':'先在左侧留下介绍；右侧物件也可以点。'}报告与反思仅自己可见。</p>`;
    else $('#mission').insertAdjacentHTML('beforeend','<p class="cog-world-hint cog-entry-hint"><strong>右边也可以探索</strong>点右侧的报告匣、书架或镜子，人物会走进去。报告与反思只留给自己；也可以先完成左侧的个人介绍。</p>');
    $('#scene-caption').textContent=privateMode?'我的私人认知区 · 原始报告与反思只留在这里':'待客区 · 只展示本人愿意公开的故事';
  }
  document.body.dataset.privateCognition=String(isHome&&homeId===state.actor&&!!world.studyOpen);
  document.body.dataset.ownHome=String(isHome&&homeId===state.actor);
  if(isReportCase){
    const real=sample(state)?.real;
    const title=!isHome?'走进知微的小屋':homeId!==state.actor?'以案例居民的身份，认识伙伴':world.studyOpen?'走近一件物品，读懂报告':'左边是介绍，右边是报告';
    const copy=!isHome?'点「回我的小屋」或知微的门牌，人物会沿路走过去。房子已为案例准备好，不用先填写。':homeId!==state.actor?'这里只展示邻居的公开介绍。知微的报告与反思不会因为串门而自动交给对方。':world.studyOpen?'三扇窗看真实变化，书架读16个关键词；门牌、镜子与阳光让报告变成可校准的表达。':'先点右侧报告匣看来源，再逛三扇窗、行为书架、壁炉镜子。左侧生活故事为演示补写。';
    $('#mission').innerHTML=`<div class="step">真实报告 → 小屋 · ${real?'已载入客户报告':'已切换报告来源'}</div><h2>${esc(title)}</h2><p>${esc(copy)}</p>`;
    if(homeId===state.actor&&isHome)$('#scene-caption').textContent=world.studyOpen?'代入案例本人 · 报告摘编 + 游戏改写 · 原始身份不发布':'知微的待客区 · 协作草稿与生活补写，不代表当事人确认';
    $('.demo-label').textContent='真实报告摘编 · 化名案例 · 补写内容已标注 · 独立本地记录';
    document.title='蚂蚁森友会 · 真实 DISC 报告案例';
  }
  scheduleDemoVisit();
  scheduleDemoResponse();
}
function scheduleDemoResponse() {
  if(demoResponseTimer||!entryUI||!$('#role-root').hidden)return;
  const response=nextDemoResponse(state);if(!response)return;
  const actor=state.actor,village=state.network.active;
  demoResponseTimer=setTimeout(()=>{
    demoResponseTimer=null;
    if(actor!==state.actor||village!==state.network.active||!soloEmployee(state)||!$('#role-root').hidden)return;
    const current=nextDemoResponse(state);
    if(!current||current.id!==response.id||current.step!==response.step){scheduleDemoResponse();return;}
    const showingPair=$('#panel-root').dataset.pair===response.id;
    const field=showingPair?$('#lesson-agreement'):null;
    const draft=field?{value:field.value,focused:document.activeElement===field,start:field.selectionStart,end:field.selectionEnd}:null;
    if(!commit({type:'entry:response',id:response.id,step:response.step}))return;
    if(showingPair) {
      lessonUI.pair(response.id);
      const nextField=$('#lesson-agreement');
      if(draft&&nextField){nextField.value=draft.value;if(draft.focused){nextField.focus({preventScroll:true});nextField.setSelectionRange(draft.start,draft.end);}}
    }
    const words={accept:'接受了邀请',choice:'提交了独立选择',sign:'确认了这条约定',share:'同意分享当前版本',accepted:'同意加入心愿',rejected:'这次心愿名额已满'};
    toast(`${name(response.other)}${response.kind==='gift'?'收下了你的礼物':words[response.step]} · 示例回应`);
    scheduleDemoResponse();
  },1400);
}
function scheduleDemoVisit() {
  if(!soloEmployee(state)||demoVisitTimer || !me().confirmed || state.stage!=='open' || state.gifts.some(g=>g.to===state.actor&&g.demoVisit))return;
  const actor=state.actor;
  demoVisitTimer=setTimeout(()=>{
    demoVisitTimer=null;
    if(actor!==state.actor || !soloEmployee(state) || document.querySelector('.panel') || !me().confirmed || state.stage!=='open') {scheduleDemoVisit();return;}
    if(state.gifts.some(g=>g.to===actor&&g.demoVisit))return;
    if(!state.residents.some(r=>r.id!==actor&&r.simulated&&canVisit(state,r.id)&&state.wallets[r.id]?.sent<5&&state.items.some(i=>i.owner===r.id&&i.status==='available')))return;
    if(commit({type:'demoVisit'}))toast('示例森友来访：家门口留下了一份礼物。有空回去看看，不用马上回应。');
  },8000);
}
function welcome() {
  close(); homeId=null; world.town(); hud();
}
function mayor() {
  if(!joined(state)){villageUI.disclosure(true);return;}
  if(!journey(me()).key) {
    const lines=[`欢迎来到${esc(state.village.name)}。我是${esc(state.village.mayor)}。${isPublic(state)?'这里已有一些示例邻居，也有等待新朋友的宅地。':'溪对岸是等待我们一起安家的宅地。'}你希望大家怎么称呼你？`, `${esc(me().name)}，很高兴认识你。${esc(state.village.goal)} 溪这边有公园、图书馆和教室，过桥就是大家的家。`, `这把钥匙交给你。去宅地打开工具箱，搭好基础小屋。再把喜欢的事、相处的方式和最近的心愿放进屋里。${isPublic(state)?'确认好自己的介绍，就能自由串门；这里不需要等待主持人开场。':'确认好自己的介绍，挂上欢迎牌，等我宣布串门时间。'}`];
    panel(state.village.mayor+" · 村长","村口的初次见面",`<p class="quote">${lines[mayorTurn]}</p>${mayorTurn===0?`<label class="field">大家可以叫我<input id="resident-name" maxlength="24" value="${esc(me().name==="新森友"?"":me().name)}" placeholder="你的名字或昵称"></label>`:""}`,button(["你好，我是……","我们怎样一起建村？","领取宅地钥匙"][mayorTurn],"mayor-next","","primary"),"npc-dialog");
    return;
  }
  if(soloEmployee(state)&&me().confirmed&&!isPublic(state)&&state.stage==='preparing') {
    panel(`${state.village.mayor} · 欢迎牌挂好了`,'示例村长 · 独自体验 Demo',`<p class="quote">${esc(me().name)}，小屋已经有你的样子了。邻居们也在陆续安家。现在，一起打开村庄，带着好奇去认识彼此吧。</p><p>这是示例村长推进本机故事；正式活动由真实组织者控制开放时间。</p>`,button('我准备好了，开启串门','mayor-open','','primary'),'npc-dialog');return;
  }
  if(soloEmployee(state)&&me().confirmed&&!isPublic(state)&&lesson(state).phase===1&&livePair(state)?.status==='accepted') {
    panel(`${state.village.mayor} · 下一段一起做点什么`,'示例村长 · 协作任务安排','<p class="quote">你们找到伙伴啦。接下来去林间教室，一起面对一个有不同选择的小情境。先各自表达，再看看彼此在意什么，最后留下一个下一次能用的约定。</p><p>示例搭档会回应自己的部分，你只需要表达和确认自己的想法。</p>',button('听完安排，去林间教室','mayor-task','','primary'),'npc-dialog');return;
  }
  panel(
    `和${state.village.mayor}聊聊`,
    `${state.village.name} · ${state.stage === "open" ? "串门时间" : "入驻时间"}`,
    `<p class="quote">${esc(state.village.welcome)}</p><p>${esc(state.village.goal)}</p><div class="notice">${state.stage === "open" ? "大家可以去串门啦。收到礼物、看见心愿，都只是认识的开始；是否进一步连接，由你们自己决定。" : "先准备自己的小屋，确认介绍后再来找我。通过活动邀请进入时，串门由本场组织者统一开放；本机 Demo 不会与主持人的另一台设备同步。"}</div>`,
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
  let body=`<p class="station-intro">${esc(spec.hint)}</p><small>介绍内容跟着你走；「对访客公开」只决定在${esc(state.village.name)}里的展示。</small>`;
  if(key==="door") body+=`<div class="columns"><label class="field">名字<input id="resident-name" maxlength="24" value="${esc(me().name)}"></label><label class="field">我的衣服<input type="color" id="outfit" value="${me().appearance.outfit}"></label></div><div class="columns"><label class="field">肤色<input type="color" id="skin" value="${me().appearance.skin}"></label><label class="field">发色<input type="color" id="hair" value="${me().appearance.hair}"></label></div><div class="notice">有报告也可以作为表达的起点。${button("看看 DISC 示例参考","report")}</div>`;
  if(QUESTIONS[key]) {
    body+=`<div class="conversation-invite"><span class="eyebrow">${key==='interest'?'从一件喜欢的小事开始':'把工作里的具体时刻，变成相处提示'}</span><h3>${key==='interest'?'不只问你喜欢什么，也聊聊你怎样喜欢它。':'没有标准答案，只有更适合你的合作方式。'}</h3><p>${key==='interest'?'3 道主问，3 道可选追问':'4 道主问，3 道可选追问'}。一次聊一个场景，随时停下。原始回答只有自己看见，整理后由你确认。</p>${button('从具体的小问题开始','interview-start',`data-group="${key}"`,'primary')}</div><details class="profile-direct"><summary>直接编辑我的对外介绍 / 查看已保存内容</summary>${spec.fields.map(field).join('')}</details>`;
  } else body+=spec.fields.map(field).join("");
  if(key==="wish") body+=`<label class="field">想怎样被回应<select id="wish-mode"><option value="intent" ${me().wishMode==="intent"?"selected":""}>先表达一个念头</option><option value="recruit" ${me().wishMode==="recruit"?"selected":""}>邀请两位伙伴，需要我确认</option></select></label>`;
  const shareTools = me().confirmed ? key==='wish' ? button("做一张心愿邀请卡","share-open",'data-kind="wish"') : key==='table' ? button("制作同行明信片","share-pairs") : '' : '';
  panel(spec.title,"正在布置这件物品 · 草稿自动保存",body,button("先放一放，继续逛","close")+button(spec.result,"finish-station",'data-key="'+key+'"',"primary")+shareTools+(me().confirmed?button("我的村民卡","social-identity")+button("补充连接线索与偏好","social-edit"):""),"station-panel");
}
function interview(group=interviewGroup,index=interviewIndex) {
  if(homeId!==state.actor || !QUESTIONS[group])return;
  interviewGroup=group;interviewIndex=Math.max(0,Math.min(index,QUESTIONS[group].length-1));
  const [key,title,hint,choices,core]=QUESTIONS[group][interviewIndex];
  const value=me().interview?.[group]?.[key] || '';
  panel(group==='interest'?'兴趣角 · 聊一件喜欢的事':'会客桌 · 一张情境卡',`${interviewIndex+1} / ${QUESTIONS[group].length} · ${core?'主问':'可选深入'} · 私密草稿自动保存`,
    `<div class="question-card"><span class="eyebrow">${core?'一个具体的场景':'愿意的话，再多说一点'}</span><h3>${esc(title)}</h3><p>${esc(hint)}</p><div class="actions">${choices.map((t,i)=>button(t,'interview-choice',`data-choice="${i}"`)).join('')}</div><label class="field">用你自己的话说<textarea id="interview-answer" maxlength="90" data-group="${group}" data-question="${key}" placeholder="建议选项只是起点，你可以自由改写。">${esc(value)}</textarea><small>最多 90 字；不想回答，可以明确写“暂时不想公开”。</small></label></div>`,
    (interviewIndex?button('上一张','interview-prev'):'')+button('先保存，回到小屋','close')+(core?'':button('跳过这道追问','interview-skip'))+button(interviewIndex===QUESTIONS[group].length-1?'整理成我的介绍':'下一张情境卡','interview-next','','primary'),'station-panel');
}
function interviewPreview() {
  const missing=QUESTIONS[interviewGroup].findIndex(q=>q[4]&&!me().interview?.[interviewGroup]?.[q[0]]?.trim());
  if(missing>=0){toast('这张主问还没留下表达，也可以明确写暂不公开。');interview(interviewGroup,missing);return;}
  const draft=draftProfile(interviewGroup,me().interview?.[interviewGroup],me().profile);
  panel('这些话，能代表现在的我吗？','只整理你写过的话，不推断人格；确认前不会替换现有介绍。',
    `<p>可以继续修改，也可以取消。原始情境回答仍然只有自己看见。</p>${Object.entries(draft).map(([k,v])=>`<label class="field"><span class="field-title">${esc(FIELDS.find(f=>f[0]===k)[1])}<span class="privacy"><input type="checkbox" data-preview-public="${k}" ${me().public[k]?'checked':''}> 对访客公开</span></span><textarea data-preview-profile="${k}" maxlength="600">${esc(v)}</textarea></label>`).join('')}`,
    button('再想想，不替换','edit-step')+button('确认，放进小屋介绍','interview-apply','','primary'),'station-panel');
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
function walkHome(id,after) {
  if(!(id===state.actor && journey(me()).key) && !canVisit(state,id)) { toast(journey(me()).key?"先完成自己的说明书，等待村长开放串门。":"先去村口找村长，领取宅地钥匙。");return; }
  close();
  if(world.mode==="home") { exitThen(()=>walkHome(id,after));return; }
  homeId=null;
  world.goHome(id,()=>{id===state.actor ? plotVisit(resident(state,id).plot) : visit(id);after?.();});
  hud();
}
function walkObject(key) { close(); world.approach(key); hud(); }
function walkSpace(key) {
  close();
  if(world.mode==="home") { exitThen(()=>walkSpace(key));return; }
  world.approach("Place_"+key);hud();
}
function exitThen(callback) {
  if(world.studyOpen){const gate=world.pins.find(p=>p.key==='cog-return');world.interact({...gate,callback:()=>{world.leaveStudy();hud();exitThen(callback);}});return;}
  const door=world.pins.find(p=>p.key==="exit");
  world.interact({...door,callback:()=>{leaveHome();callback();}});
}
function leaveHome() {
  const point=world.homePoint(homeId || state.actor);
  homeId=null;close();world.town(point);hud();
}
function summary(r, owner = false) {
  const p = owner ? r.profile : profile(r.id).profile;
  return `${person(r)}${isReportCase&&r.id==='me'?'<p class="case-origin">案例说明：特质与协作草稿参考客户提供的真实报告；生活故事、兴趣和心愿为演示补写，并非测评推断。完成状态仅用于体验，不代表当事人已确认这些表达。</p>':''}<p class="quote">${esc(p.headline || "这里还有一些故事，等待主人慢慢分享。")}</p>${tags(p.traits || "")}<div class="columns"><div>${section("我喜欢的生活", p.interests)}${section("一个小故事", p.story)}${section("最近在探索", p.learning)}</div><div>${section("我愿意搭把手", p.help)}${section("和我一起做事", p.collaboration)}${EXTRA_FIELDS.map(([k,t])=>section(t,p[k])).join("")}${section("最近的心愿", p.wish)}</div></div>`;
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
    button("看看懂我卡", "learn-card", `data-id="${id}"`) + button("去他家坐坐", "visit", `data-id="${id}"`, "primary"),
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
    `${lessonUI?.recommendHTML()||''}<div class="toolbar"><input class="search" id="resident-search" placeholder="搜名字、兴趣、想做的事" value="${esc(search)}"><select id="resident-filter"><option value="all">所有森友</option><option value="wish">有心愿的森友</option><option value="photo">喜欢摄影</option></select></div><div id="resident-results"></div>`,
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
  document.querySelectorAll('#resident-results [data-action="visit"]').forEach(el=>el.insertAdjacentHTML('beforebegin',button('看看懂我卡','learn-card',`data-id="${el.dataset.id}"`)));
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
    body = `<div>${section("我愿意搭把手", p.help)}</div><div>${section("和我一起做事，可以这样", p.collaboration)}${EXTRA_FIELDS.map(([k,t])=>section(t,p[k])).join("")}<p class="muted">具体的相处建议，比一个人格标签更有帮助。</p></div>`;
  if (bookChapter === 3)
    body = `<div>${section("最近，想和谁一起", p.wish)}${!p.wish ? "<p>主人还没有公开这部分内容。</p>" : ""}</div><div><p>如果这个念头让你心动，可以去看看窗边的心愿瓶。</p><div class="actions">${button("看看心愿瓶", "object", 'data-key="wish"', "primary")}</div><p class="muted" style="margin-top:24px">内容由主人表达并确认。未公开资料不会出现在访客册子里。</p></div>`;
  panel(
    "《小屋里的我》",
    `${r.name}把想让你知道的事，慢慢写在这里。`,
    `<nav class="chapter">${chapters.map((t, i) => button(`${i + 1}. ${t}`, "chapter", `data-index="${i}"`, i === bookChapter ? "primary" : "")).join("")}</nav><div class="book-spread">${body}</div>`,
    button("合上册子，继续逛", "close") +
      (homeId === state.actor ? button("领取我的村民卡", "social-identity") + button("补充连接线索与偏好", "social-edit") + button("看我的懂我卡", "social-card", `data-id="${state.actor}"`) : button("看看懂我卡", "learn-card", `data-id="${homeId}"`)) +
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
  if (!homeId || !canVisit(state, homeId)) { toast("这间小屋暂不可互动，请出门后重新进入。");return; }
  if(key.startsWith('cog-')){cognitionUI?.handle(key,{});return;}
  if(key==='photo') { if(homeId===state.actor && me().confirmed)sharing.studio();return; }
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
      person(r) + `<p class="quote">${esc(p.headline)}</p>${tags(p.traits)}` + section("一起做事的小提示",p.collaboration),
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
        section("和我一起做事", p.collaboration)+EXTRA_FIELDS.map(([k,t])=>section(t,p[k])).join(""),
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
      (key === 'table' ? button(r.id===state.actor?'我的协作任务':'看看懂我卡',r.id===state.actor?'learn-pair':'learn-card',`data-id="${r.id===state.actor?'':r.id}"`) : '') +
      (key === 'table' ? button("制作同行明信片", "share-pairs") : '') +
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
          `<div class="result-row gift-letter">${g.demoVisit?'<span class="eyebrow">示例森友来访 · 本机模拟，不是真人在线消息</span>':''}<strong>${esc(name(g.from))}留下了${esc(state.items.find((i) => i.id === g.item)?.name)}</strong><p>${esc(g.message)}</p><small>${status[g.status]}</small>${g.status === "pending" ? `<div class="actions">${button("收下礼物", "gift-reply", `data-id="${g.id}" data-reply="accept"`, "primary")}${button("谢谢，先不收下", "gift-reply", `data-id="${g.id}" data-reply="reject"`)}</div>` : ""}${g.status === "accept" ? `<div class="actions">${button("邀请成为森友", "connect", `data-id="${g.from}"`)}${state.items.find((i) => i.id === g.item)?.status === "available" && state.items.find((i) => i.id === g.item)?.owner === state.actor ? button("回收礼物 · +8 币", "recycle", `data-id="${g.item}"`) : ""}</div>` : ""}<div class="actions">${button('去他家回访','visit',`data-id="${g.from}"`)}</div><small>收下只是接受心意，不会自动成为好友或交换联系方式。</small></div>`,
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
    body + sharing.inboxHTML() + (lessonUI?.connect.inboxHTML()||''),
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
  if(key==='class'){lessonUI.classroom();return;}
  const scroll=$('#panel-root').dataset.space===key ? $('.panel-body')?.scrollTop || 0 : 0;
  renderSpace(key);
  if(key==='growth'&&$('.panel-body'))$('.panel-body').insertAdjacentHTML('afterbegin',`<section class="lesson-growth-entry"><h3>把共同约定带回日常</h3><p>完成课堂协作后，在这里记下一次真实尝试。成长叶只对自己可见。</p>${button('翻开我的课后成长叶','learn-journal','','primary')}</section>`);
  if($('.panel-body'))$('.panel-body').insertAdjacentHTML('beforeend',villageUI?.spaceHTML(key)||'');
  const guide=GUIDES[key];
  if(guide && me().confirmed && state.stage==='open' && $('.panel-body')) {
    $('.panel-body').insertAdjacentHTML('afterbegin',`<div class="space-guide"><span class="eyebrow">这里可以做什么</span><h3>${esc(guide[0])}</h3><ol>${guide[1].map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div>`);
    $('.panel-body').insertAdjacentHTML('beforeend',`<details class="demo-scope"><summary>给演示者：本次体验范围与未来可能</summary><p>${esc(guide[2])}</p></details>`);
  }
  if($('.panel-body')) {$('#panel-root').dataset.space=key;$('.panel-body').scrollTo({top:scroll,behavior:'instant'});}
}
function renderSpace(key) {
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
      `<p class="quote">不是凭空写感悟，先给自己一次观察。</p><div class="notice"><strong>观察练习：留意一个舒服的配合瞬间</strong><p>下一次串门或合作时，记下：对方做了什么，让你愿意继续聊？如果有点卡住，你希望换一种什么说法？</p>${button(me().notes['growth-task']?'已领取 · 继续带着问题观察':'领取这片观察叶','growth-task')}${button('去游乐场经历一次合作','space','data-key="play"')}</div><label class="field">回想哪一次经历？<input id="reflection-context" maxlength="100" placeholder="比如刚才和伙伴一起安排花园" value="${esc(me().notes['reflection-context']||'')}"></label><label class="field">具体发生了什么？我下次希望怎样配合？<textarea id="reflection" maxlength="600" placeholder="可以先记一个瞬间，不需要上升成性格结论。">${esc(me().notes.reflection || "")}</textarea></label><div class="notice">${me().notes.reflection?'已有一片私密成长叶，随时回来修订。':'你的反思默认只有自己可见。'} 不自动改写说明书，也不进行人格打分。</div>`,
      button("只保存这片成长叶", "save-reflection") +
        button("用它更新我的协作介绍", "reflect-profile", "", "primary"),
    );
    return;
  }
  if (key === "play") {
    const result = state.publicResults[`${state.actor}:garden`];
    const mode=state.publicResults[`${state.actor}:garden-mode`];
    const layout=state.publicResults[`${state.actor}:garden-layout`] || [0,0,0,0,0,0,0,0,0];
    const checked=gardenCheck(layout),done=state.publicResults[`${state.actor}:garden-done`];
    panel(
      title,
      '协作体验场 · 线上引导，线下共同决定，也可独自演示',
      `<h3>两个人，一座共享花园</h3><p>目标不是比谁摆得漂亮，而是看看你们怎样协商有限的资源。</p><div class="actions">${button('和现场伙伴一起做','garden-mode','data-mode="offline"',mode==='offline'?'primary':'')}${button('独自体验模拟搭档','garden-mode','data-mode="demo"',mode==='demo'?'primary':'')}</div>${mode?`<div class="role-cards"><article><h3>园丁 · 负责植物</h3><p>有 3 簇花、2 株绿植。希望至少摆 2 簇花和 1 株绿植。</p></article><article><h3>邻居 · 负责通行</h3><p>中间一列从入口到出口要保持畅通。和园丁商量，怎样兼顾好看与好走。</p></article></div><p>${mode==='offline'?'请和身边一位伙伴分别读角色要求，面对面商量，再共用这台设备记录决定。没有线上匹配，也不会自动确认对方真的参与。':'小禾是预设回应的模拟搭档，不是真人在线。你可以选择一种开场方式，看看如何接住彼此的需要。'}</p>${mode==='demo'?`<div class="actions">${button("先商量布局，再一起摆", "garden", 'data-choice="先商量"')}${button("先摆一小块，边做边改", "garden", 'data-choice="先试做"')}</div>${result?`<div class="notice">小禾 · 模拟回应：${esc(result.reply)} 我需要中间一列留作通道，你想把植物放在哪边？</div>`:''}`:''}<p>点格子切换「留白 → 小花 → 绿植」。中间竖列是入口到出口的通道；布局同步显示在 3D 场景。</p><div class="garden-grid">${layout.map((v,i)=>button(['留白','小花','绿植'][v],'garden-cell',`data-index="${i}"`,`${v?'planted':''} ${[1,4,7].includes(i)?'path-cell':''}`)).join('')}</div><p class="garden-check">小花 ${checked.flowers}/3 · 绿植 ${checked.plants}/2 · 通道${checked.path?'畅通':'被占用'}。${checked.ok?'资源与通道符合约定，接下来请一起确认。':'需要 2–3 簇花、1–2 株绿植，并留出中间通道。'}</p>${mode==='offline'?'<label class="checkline"><input id="partner-confirm" type="checkbox">我们已在线下面对面讨论，并同意这个安排（本人确认）</label>':''}<div class="actions">${button('留下这次共同决定','garden-complete','','primary')}</div>${done?`<div class="notice">已留下${done.mode==='offline'?'现场共同决定（本人记录）':'模拟协作记录'}。${button('去成长林回顾这次配合','space','data-key="growth"')}</div>`:''}<label class="field">这让我发现<textarea id="garden-note" maxlength="600" placeholder="什么配合方式让我舒服？下次想怎么说？">${esc(me().notes.garden || "")}</textarea></label>${button("保存协作小发现", "save-garden")}`:'<div class="notice">先选体验方式。现场培训推荐真人面对面协商；一个人向客户演示时可选模拟搭档。</div>'}<p class="muted">任务约束只用于制造一次真实的商量，不给人打分，也不据此推断 DISC 类型。</p>`,
    );
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
      `<h3>一起做一张「森林拍照地图」</h3><p>承接小林“找伙伴练习手机摄影”的心愿。不是另填一次个人资料，而是把一次观察变成大家可用的路线。</p>${photoMap(state,state.actor,esc,button)}<label class="field">选择一个地点<select id="workshop-location">${PHOTO_SPOTS.map(([id,title])=>`<option value="${id}" ${(me().notes['workshop-location']||result?.location)===id?'selected':''}>${esc(title)}</option>`).join('')}</select></label><label class="field">我愿意贡献的一个观察<textarea id="workshop-note" maxlength="600" placeholder="比如：下午窗边有侧光，试试把手边的杯子放在那里。">${esc(me().notes['workshop-draft'] ?? result?.contribution ?? "")}</textarea></label>${result ? `<div class="notice">你的署名和贡献已放上地图。可以修订，再制作成果卡带走。</div>` : ""}`,
      button("把贡献放进成果卡", "save-workshop", "", "primary") + (result ? button("制作共创成果卡", "share-open", 'data-kind="work"') : ''),
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
  if(entry(state).role!=='organizer')return;
  presenter=true;
  panel('演示工具','活动组织者 · 只改变当前浏览器的示例状态',
    '<p>普通员工不需要这些工具。活动阶段、邀请和成果都在村长工作台中操作。</p>'+
    section('模拟班级容量','可装入 50 个虚构居民的安家进度，验证地图和列表呈现；不代表百人实时在线。')+
    '<div class="actions">'+button('演示 50 人班级容量','cohort-50')+button('运行检查','quality')+'</div>'+
    section('需要从头重新体验？','这会清除新版 Demo 的本地测试状态，包括已填写的介绍、礼物与活动记录。先保存需要保留的内容；切换角色本身不需要重置。')+
    button('从空宅地重新体验','reset','','danger'),
    button('返回村长工作台','net-admin','','primary')+button('我设置好了，用参与者视角体验','entry-preview'),'wide');
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
  if(villageUI){await villageUI.invite();return;}
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
  if(el.id==='interview-answer') commit({type:'interview',group:el.dataset.group,key:el.dataset.question,value:el.value});
  const draftKeys={'reflection':'reflection','reflection-context':'reflection-context','garden-note':'garden','workshop-note':'workshop-draft'};
  if(draftKeys[el.id])commit({type:'note',key:draftKeys[el.id],value:el.value});
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
  if(el.id==='workshop-location')commit({type:'note',key:'workshop-location',value:el.value});
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
  if(entryUI?.handle(a,d))return;
  if(await cognitionUI?.handle(a,d))return;
  const organizerOnly=a==='learn-teacher'||['learn-authorize','learn-activity','learn-tab','learn-phase','learn-seed','learn-demo-ready','learn-sample','learn-actor','learn-reset-check','learn-reset','social-graph','presenter','quality','story','switch-role','toggle-stage','reset','reset-confirm','mature-demo','cohort-next','cohort-50'].includes(a)||a.startsWith('net-')&&['admin','roles','role','tab','stage','settings-save','create','create-save','join-reply','sample-request','member','publish','content-status','invite','preview-share','report-reply','archive-check','archive'].includes(a.slice(4));
  if(organizerOnly&&entry(state).role!=='organizer'){toast('这是组织者工具。需要时请明确切换体验角色。');return;}
  if(await lessonUI?.handle(a,d))return;
  if(await villageUI?.handle(a,d))return;
  if(await sharing?.handle(a,d)) return;
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
      case 'case-reset':
        if(isReportCase)panel('重新体验这个案例？','只恢复知微的案例记录','<p>将恢复本案例的报告、介绍和互动记录。普通体验里你自己填写的资料不受影响。</p>',button('取消','close')+button('确认，恢复案例','case-reset-confirm','','primary'));
        break;
      case 'case-reset-confirm':
        if(isReportCase&&saveState(freshReportCase())){homeId=null;close();world.town(world.homePoint(state.actor));hud();toast('案例已恢复，你的普通体验记录没有改动。');}
        break;
      case 'walk-mayor':walkMayor();break;
      case 'mayor-open':
        if(commit({type:'entry:mayor-open'})){close();toast('示例村长：串门时间到了，去公告栏发现一位伙伴吧。');}break;
      case 'mayor-task':
        if(commit({type:'entry:mayor-task'}))walkSpace('class');break;
      case 'follow-share':followShare();break;
      case 'growth-task':
        if(commit({type:'note',key:'growth-task',value:'留意一个舒服的配合瞬间'})) {space('growth');toast('观察叶已领取。先去经历一次互动，再回来写。');}
        break;
      case 'map-spot':
        $('#workshop-location').value=d.location;
        commit({type:'note',key:'workshop-location',value:d.location});
        $('#workshop-note').focus();
        break;
      case 'garden-mode':
        if(commit({type:'publicResult',key:'garden-mode',value:d.mode})) {
          commit({type:'publicResult',key:'garden-done',value:null});
          if(!state.publicResults[`${state.actor}:garden-layout`])commit({type:'publicResult',key:'garden-layout',value:[0,0,0,0,0,0,0,0,0]});
          space('play');
        }
        break;
      case 'garden-complete': {
        const layout=state.publicResults[`${state.actor}:garden-layout`]||[],mode=state.publicResults[`${state.actor}:garden-mode`];
        if(layout.length!==9||!gardenCheck(layout).ok){toast('再商量一下：留出中间通道，摆 2–3 簇花和 1–2 株绿植。');break;}
        if(mode==='offline'&&!$('#partner-confirm')?.checked){toast('请和现场伙伴确认安排，再勾选共同决定。');break;}
        if(mode==='demo'&&!state.publicResults[`${state.actor}:garden`]){toast('先选择一种开场方式，听听模拟搭档的需要。');break;}
        if(commit({type:'publicResult',key:'garden-done',value:{mode,layout,at:Date.now()}}))space('play');
        break;
      }
      case 'interview-start': {
        const next=QUESTIONS[d.group]?.findIndex(q=>q[4]&&!me().interview?.[d.group]?.[q[0]]?.trim());
        interview(d.group,next>=0?next:0);break;
      }
      case 'interview-prev': interview(interviewGroup,interviewIndex-1);break;
      case 'interview-choice': {
        const q=QUESTIONS[interviewGroup][interviewIndex], value=q[3][Number(d.choice)];
        if(commit({type:'interview',group:interviewGroup,key:q[0],value})) {$('#interview-answer').value=value;$('#interview-answer').focus();}
        break;
      }
      case 'interview-skip':
      case 'interview-next': {
        const q=QUESTIONS[interviewGroup][interviewIndex];
        if(a==='interview-next'&&q[4]&&!$('#interview-answer').value.trim()){toast('说一点自己的想法，也可以写暂时不想公开。');break;}
        if(a==='interview-skip')commit({type:'interview',group:interviewGroup,key:q[0],value:''});
        if(interviewIndex===QUESTIONS[interviewGroup].length-1)interviewPreview();else interview(interviewGroup,interviewIndex+1);
        break;
      }
      case 'interview-apply': {
        const values=Object.fromEntries([...document.querySelectorAll('[data-preview-profile]')].map(el=>[el.dataset.previewProfile,el.value.trim()]));
        if(Object.values(values).some(v=>!v||v.length>600)){toast('每段请留下表达，最多 600 字，也可以写暂不公开。');break;}
        const visibility=Object.fromEntries([...document.querySelectorAll('[data-preview-public]')].map(el=>[el.dataset.previewPublic,el.checked]));
        if(commit({type:'profile',profile:values,public:visibility}) && commit({type:'finishStation',key:interviewGroup})) {close();toast('你确认的介绍已放进小屋。册子、物件与居民摘要读取同一份内容。');}
        break;
      }
      case 'demo-visit':
        if(presenter && commit({type:'demoVisit'})) {walkHome(state.actor);toast('示例森友的礼物已在信箱等你。走近信箱，亲手打开。');}
        break;
      case "cohort-next":
        if(presenter && commit({type:'cohortNext'})) {close();hud();toast("示例同学开始下一轮安家。未接手的虚构角色随演示推进。");}
        break;
      case "cohort-50":
        if(presenter && commit({type:'cohort50'})) {close();world.overview();hud();toast("已装入 50 人班级样例，居民按各自进度安家。这是本机模拟，不会联动其他设备。");}
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
        dismissPanel();
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
          world.refreshPins();close();hud();
          toast(soloEmployee(state)&&state.stage!=='open'?"欢迎牌挂好了！可以领取村民卡，再回村口向村长报到。":"欢迎牌挂好了！再点桌上的册子领取村民卡，或到留影相机拍一张明信片。");
        }
        break;
      case "own":
        walkHome(state.actor);
        break;
      case "exit-home":
        if(world.studyOpen)exitThen(()=>{});else walkObject("exit");
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
          toast(soloEmployee(state)?"意向已送达，示例邻居会在这里回应。":"意向已送达。由对方决定是否接受；本机 Demo 不跨设备同步。");
          object("wish");
        }
        break;
      case "request-reply":
        if (commit({ type: "requestReply", id: d.id, reply: d.reply })) inbox();
        break;
      case "pair":
        lessonUI.connect.preview(homeId);
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
        if(!$('#reflection').value.trim()){toast('先记下一点具体发现；还没经历互动，可以先领取观察叶。');break;}
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
            0, 0, 0, 0, 0, 0, 0, 0, 0,
          ]),
        ];
        layout[Number(d.index)] = (layout[Number(d.index)] + 1) % 3;
        if (
          commit({ type: "publicResult", key: "garden-layout", value: layout })
        ) {
          commit({type:'publicResult',key:'garden-done',value:null});
          space("play");
        }
        break;
      }
      case "save-garden":
        if(!$('#garden-note').value.trim()){toast('先写一点这次配合中的发现吧。');break;}
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
          value: { contribution, location: $('#workshop-location').value },
        });
        space("workshop");
        $('.panel-body').scrollTop=0;
        toast('贡献已放上地图，带着你的署名。可以制作成果卡分享。');
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
          entryUI?.resume();
        }
        break;
      case "report":
        if(isReportCase){close();walkHome(state.actor,()=>world.approach('cog-report'));break;}
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
$('#village-entry').onclick=()=>villageUI?.picker();
$('#mayor-entry').onclick=()=>villageUI?.admin();
$('#teacher-entry').onclick=()=>lessonUI?.teacher(0);
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
    if(params.has('entry')) {
      try {
        const settings=params.get('entry')==='activity'&&params.get('config')?await decodeVillage(params.get('config')):null;
        state=applyArrival(state,params,settings);persist(state);
      }catch(e){toast(e.message);}
    }
    if (params.get("config") && !params.has('entry') && !state.welcomeSeen) {
      try { Object.assign(state.village, await decodeVillage(params.get("config"))); }
      catch { toast("邀请里的村庄配置无法读取，已使用默认村庄。你仍可正常体验。"); }
    }
    for (const k of ["welcome", "mayor", "goal", "tone", "appearance"])
      if (params.get(k) && !params.has('entry') && !state.welcomeSeen)
        state.village[k] = params
          .get(k)
          .slice(0, k === "welcome" || k === "goal" ? 300 : 30);
    world = new ForestWorld($("#world"), (hit) => {
      if(entry(state).role!=='employee'){if(entry(state).role==='organizer')villageUI?.admin();return;}
      if(hit.type==='blockedPath')toast('这条路暂时走不过去。试着走近一点，或从家具旁绕过去再点。');
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
    checkpoint(state);
    villageUI=createVillageUI({getState:()=>state,commit,panel,button,esc,toast,close,travel:villageTravel,meetMayor:mayor,goInviter:followShare,hostActivity:index=>lessonUI?.teacher(index)});
    cognitionUI=createCognitionUI({getState:()=>state,getWorld:()=>world,getHomeId:()=>homeId,commit,panel,button,esc,toast,close,hud,walkHome});
    sharing = createSharing({getState:()=>state,getWorld:()=>world,panel,button,esc,saveState,toast,commit});
    lessonUI=createLessonUI({getState:()=>state,getWorld:()=>world,commit,panel,button,esc,toast,close,walkSpace,walkHome,travel:villageTravel,hostWorkspace:(body,index)=>villageUI.activity(body,index)});
    entryUI=createEntryUI({getState:()=>state,commit,getWorld:()=>world,close,openWorkspace:()=>villageUI.admin(0),hud,invited:params.has('entry')});
    world.setState(state);
    world.town(isReportCase?world.homePoint(state.actor):undefined);
    $("#loading").remove();
    hud();
    if(params.has('entry'))commit({type:'entry:choose',role:'employee',invited:true});
    entryUI.resume();scheduleDemoResponse();
    // Read-only diagnostics: no application writes or bypass of public actions.
    window.forestDiagnostics = {
      build: "real-report-v1-20261009",
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
