import {ForestWorld} from './opening-world.js';
import {Vector3} from 'three';
import {STORE_KEY,SELF,NEIGHBORS,initialState,emptySelf,escapeHTML as e,canReadDeep,greeting,filterPeople} from './meet-data.js';
import {icon,btn,startView,activationView,contextView,placesView,profileView,discoverView,resultsView,editView,aboutView} from './meet-views.js';

const $=s=>document.querySelector(s),content=$('#content'),modal=$('#modal');
let state=initialState(),world,worldReady=false,noticeTimer,returnFocus;
try{const stored=JSON.parse(localStorage.getItem(STORE_KEY));if(stored?.version===1&&typeof stored.activated==='boolean'&&stored.me?.id==='me'&&Array.isArray(stored.me.tags)&&Array.isArray(stored.me.interests)&&stored.me.appearance&&Array.isArray(stored.bookmarks)&&stored.grants&&stored.pairGrants&&stored.drafts)state=stored;}catch{/* Corrupt or disabled storage must not block the demo. */}
let ui={view:state.activated?'profile':'start',person:'me',place:'door',preview:false,query:'',filter:'all',greetingKind:'wish'};
const current=()=>ui.person==='me'?state.me:NEIGHBORS.find(p=>p.id===ui.person)||state.me;
function notify(message){clearTimeout(noticeTimer);$('#notice').textContent=message;noticeTimer=setTimeout(()=>$('#notice').textContent='',4500);}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));return true;}catch{notify('本机存储不可用；这次修改仅保留到页面关闭。');return false;}}
function openModal(html){if(!modal.open)returnFocus=document.activeElement;$('#modal-content').innerHTML=html;if(!modal.open)modal.showModal();modal.scrollTop=0;}
function closeModal(){modal.close();if(returnFocus?.isConnected)returnFocus.focus();}
modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});
function render({scene=true,focus=false}={}){
 $('#context-bar').innerHTML=contextView(ui,state);$('#places').innerHTML=placesView(ui);
 $('#places').hidden=ui.view!=='profile';
 content.innerHTML=ui.view==='start'?startView():ui.view==='discover'?discoverView(state,ui):profileView(current(),state,ui);
 document.querySelectorAll('.site-header nav button').forEach(b=>{const on=ui.view==='discover'||ui.view==='profile'&&ui.person!=='me'?b.dataset.act==='discover':b.dataset.act==='mine';if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 if(scene)renderScene();
 else if(worldReady&&ui.view==='discover')renderTownPins();
 if(focus){content.focus({preventScroll:true});if(innerWidth<721)content.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});}
}
function renderTownPins(){
 if(!worldReady||ui.view!=='discover')return;
 const matches=new Set(filterPeople(NEIGHBORS,ui.query,ui.filter,state.me.group).map(p=>p.id));
 world.clearPins();NEIGHBORS.forEach((p,i)=>{if(!matches.has(p.id))return;const point=world.cabins[i].position.clone();point.y=3.2;world.addPin(p.id,p.name+'的小屋',point,()=>openPerson(p.id));});
}
function renderScene(){
 if(!worldReady)return;
 if(ui.view==='discover'){
  world.setResidents(NEIGHBORS);world.setLocalResident({...state.me,ready:state.activated});world.showTown();
  renderTownPins();
  world.focus([31,33,40],[0,0,0]);
  // This prototype has no resource-collection or mandatory group task.
  world.orbs.forEach(o=>{if(o)o.visible=false;});
  $('#scene-caption').textContent='沿着小路，认识另一组的森友';
 }else{
  const p=ui.view==='start'?SELF:current();world.showHome(p);world.clearPins();
  const cameras={door:[[8.6,7.3,10.5],[0,1,0]],table:[[4.5,4.2,7],[0,1,-.3]],archive:[[-5,3.8,6],[-1.2,1,-1]]};
  const [pos,target]=cameras[ui.place]||cameras.door;world.focus(pos,target);
  if(ui.view==='profile'){
   const spots=[['table','会客桌',[.65,1.4,-.45]],['archive','档案袋',[-2.32,1.9,-1.5]]];
   spots.forEach(([id,label,point])=>{if(id!==ui.place)world.addPin(id,'看看'+label,new Vector3(...point),()=>{ui.place=id;render({focus:true});});});
  }
  $('#scene-caption').textContent=ui.view==='start'?'一间小屋，慢慢认识一个人':ui.person==='me'?'我的小屋 · 由我决定怎样被认识':`${p.name}的小屋 · ${ui.place==='door'?'先打个照面':ui.place==='table'?'坐下来聊聊':'深入了解，也尊重边界'}`;
 }
}
function openPerson(id){ui={...ui,view:'profile',person:id,place:'door',preview:false};render();window.scrollTo({top:0,behavior:'instant'});}
function mine(){ui={...ui,view:state.activated?'profile':'start',person:'me',place:'door',preview:false};render();window.scrollTo({top:0,behavior:'instant'});}
function discover(filter=ui.filter){ui={...ui,view:'discover',preview:false,filter};render();window.scrollTo({top:0,behavior:'instant'});}
function showGreeting(kind='wish',replace=false){
 const p=current();if(p.id==='me')return;
 ui.greetingKind=kind;
 const restoring=!replace&&typeof state.drafts[p.id]==='string';
 const text=replace?greeting(p,state.me,kind):state.drafts[p.id]??greeting(p,state.me,kind);
 openModal(`<h2 id="modal-title">和${e(p.name)}，从这句话开始。</h2><p class="muted">不是一键群发。按你们的共同点和TA公开的沟通偏好，准备一句自然的招呼。</p><div class="inline-options" aria-label="选择开场话题">${p.wish&&p.status==='找人中'?btn('我也想参加','greeting-kind','',`data-kind="wish" aria-pressed="${!restoring&&kind==='wish'}"`):''}${btn('从共同兴趣聊起','greeting-kind','',`data-kind="interest" aria-pressed="${!restoring&&kind==='interest'}"`)}${p.shareWork&&p.work?btn('按协作偏好问候','greeting-kind','',`data-kind="work" aria-pressed="${!restoring&&kind==='work'}"`):''}</div>${restoring?'<p class="note">已恢复你上次保存的草稿。选择上方话题会替换当前文字，保存后才覆盖原草稿。</p>':''}<label class="field"><span>你的开场白 · 可修改</span><textarea id="greeting" maxlength="600" rows="6">${e(text)}</textarea></label><div class="scope">现实使用时：可用对方花名在钉钉中联系。<br>本例「${e(p.name)}」是虚构人物，不对应真实账号。</div><div class="actions">${btn('复制这句话','copy-greeting','primary')}${btn('留在本机，稍后再聊','save-greeting')}</div><p id="greeting-result" class="note" role="status">尚未发送；这个 Demo 不接入钉钉或消息系统。</p>`);
}
function pairView(){
 const p=current();if(p.id==='me'||!canReadDeep(p,state))return;
 if(state.pairGrants[p.id]==='approved'){
  openModal(`<h2 id="modal-title">${e(state.me.name)} × ${e(p.name)} · 协作小约定</h2><p class="note">已完成双方模拟同意。这是人工编写的讨论样例，不是专业合拍报告，也不是匹配评分。</p><div class="pair-row"><div><h3>${e(state.me.name)}说</h3><p>${e(state.me.work||'我还没填写协作偏好，可以先当面聊聊。')}</p></div><div><h3>${e(p.name)}说</h3><p>${e(p.work||'可以先交流彼此的工作习惯。')}</p></div></div><div class="work-note"><h3>先试一个小约定</h3><p>开始前说清这次想完成什么；过程中保留讨论空间；结束时一起记下决定、负责人和下一步。</p></div><p class="note">样例用于展示“了解之后如何一起做事”，不据此判断两人适不适合合作。正式专业合拍需接入已有服务。</p><div class="actions">${btn('带着这份了解打招呼','greet','primary')}${btn('撤回我的合拍同意','pair-revoke')}</div>`);return;
 }
 const pending=state.pairGrants[p.id]==='pending';
 openModal(`<h2 id="modal-title">个人档案与双人合拍，分开授权。</h2><p>这一步只示意双方同意后查看协作样例。没有调用专业报告服务。</p><div class="scope">拟使用：双方同意提供的协作相关资料。<br>拟展示：仅双方可见的协作提示。<br>不包含：私人联系方式、未授权资料、能力排名或匹配百分比。</div>${pending?`<p class="connection">你的同意已在本机记录。对方尚未同意，暂不展示合拍内容。</p><details class="demo-controls" open><summary>演示控制 · 代入${e(p.name)}的选择</summary><div class="actions">${btn('模拟对方同意合拍','pair-approve','primary')}${btn('模拟对方拒绝合拍','pair-deny')}</div></details>`:`<label class="check-line"><input id="pair-consent" type="checkbox">我同意在本次演示中，与${e(p.name)}使用协作资料查看合拍样例。</label>${btn('记录我的同意，等待对方','pair-request','primary wide','id="pair-submit" disabled')}`}<p class="note">权限只在本机模拟；前端展示不能代替正式系统的安全授权。</p>`);
}
const actions={
 mine,discover:()=>discover(),cross:()=>{ui.query='';discover('cross');},person:b=>openPerson(b.dataset.id),
 place:b=>{if(ui.view==='start'){notify('先选择如何建立自己的呈现，也可以直接去认识森友。');return;}if(ui.view==='discover'){notify('先选一位森友，再到TA的小屋坐坐。');return;}ui.place=b.dataset.place;render({focus:true});},
 about:()=>openModal(aboutView()),close:closeModal,
 activate:()=>openModal(activationView()),
 'confirm-profile':()=>{state.confirmed=true;save();render({scene:false});notify('已确认这份呈现。以后仍可随时修改与调整展示范围。');},
 'confirm-activate':()=>{if(!$('#report-consent')?.checked)return;const old=state.me;state.me=structuredClone(SELF);if(state.activated){state.me={...old,work:old.work||SELF.work,deep:structuredClone(SELF.deep)};}state.activated=true;state.reportConsent=true;save();closeModal();mine();notify('模拟报告已转成介绍；请确认、修改，再决定展示哪些内容。');},
 manual:()=>{state.activated=true;state.me=emptySelf();save();mine();openModal(editView(state.me,state));},
 edit:()=>{if(ui.person==='me'&&state.activated)openModal(editView(state.me,state));},
 preview:()=>{ui.preview=!ui.preview;render({focus:false});},
 filter:b=>{ui.filter=b.dataset.filter;render({scene:false});},
 'clear-search':()=>{ui.query='';ui.filter='all';render({scene:false});$('#search').focus();},
 bookmark:b=>{const id=b.dataset.id;if(!NEIGHBORS.some(p=>p.id===id))return;const existing=state.bookmarks.includes(id);state.bookmarks=existing?state.bookmarks.filter(x=>x!==id):[...state.bookmarks,id];save();$('#results').innerHTML=resultsView(state,ui);notify(existing?'已取消本机标记。':'已在本机记住这位森友；对方不会收到通知。');},
 request:()=>{const p=current();if(p.id==='me'||p.deepMode!=='request')return;openModal(`<h2 id="modal-title">向${e(p.name)}敲敲门</h2><p>申请了解TA的工作节奏、支持方式和成长小记。不包含完整原始报告，也不自动生成双人合拍。</p><div class="scope">对方可以同意、拒绝，也可以之后撤销。<br>本次为单机演示，不会真正发送申请。</div><div class="actions">${btn('记录模拟申请','request-confirm','primary')}${btn('暂时不用','close')}</div>`);},
 'request-confirm':()=>{const p=current();if(p.id==='me'||p.deepMode!=='request')return;state.grants[p.id]='pending';save();closeModal();render({scene:false,focus:true});},
 approve:()=>{if(state.grants[ui.person]!=='pending')return;state.grants[ui.person]='approved';save();render({scene:false,focus:true});},
 deny:()=>{if(state.grants[ui.person]!=='pending')return;state.grants[ui.person]='denied';save();render({scene:false,focus:true});},
 withdraw:()=>{delete state.grants[ui.person];delete state.pairGrants[ui.person];save();render({scene:false});},
 revoke:()=>{delete state.grants[ui.person];delete state.pairGrants[ui.person];save();render({scene:false,focus:true});notify('模拟授权已撤销；深层内容和合拍样例都已收起。');},
 pair:pairView,
 'pair-request':()=>{if(!$('#pair-consent')?.checked||!canReadDeep(current(),state))return;state.pairGrants[ui.person]='pending';save();pairView();},
 'pair-approve':()=>{if(state.pairGrants[ui.person]!=='pending'||!canReadDeep(current(),state))return;state.pairGrants[ui.person]='approved';save();pairView();},
 'pair-deny':()=>{delete state.pairGrants[ui.person];save();openModal(`<h2 id="modal-title">这次，先不看合拍。</h2><p>对方在演示中暂未同意。已有的公开话题仍然值得聊，不需要一份合拍报告才能认识彼此。</p><div class="actions">${btn('去打个招呼','greet','primary')}${btn('回档案袋','close')}</div>`);},
 'pair-revoke':()=>{delete state.pairGrants[ui.person];save();pairView();notify('你的模拟合拍同意已撤回，合拍样例已收起。');},
 greet:()=>showGreeting('interest'),'greet-wish':()=>showGreeting('wish'),
 'greeting-kind':b=>showGreeting(b.dataset.kind,true),
 'save-greeting':()=>{const text=$('#greeting').value.trim();if(!text){$('#greeting-result').textContent='先写一句话，再保存。';return;}state.drafts[ui.person]=text;const ok=save();$('#greeting-result').textContent=ok?'已保存到本机，尚未发送。下次打开这位森友仍可继续修改。':'本机存储不可用；这句话仅在当前页面保留。';},
 'copy-greeting':async()=>{const text=$('#greeting').value.trim();if(!text){$('#greeting-result').textContent='先写一句话，再复制。';return;}try{await navigator.clipboard.writeText(text);$('#greeting-result').textContent='已复制，尚未发送。请自行选择联系渠道。';}catch{$('#greeting').focus();$('#greeting').select();$('#greeting-result').textContent='浏览器未允许自动复制；文字已选中，请手动复制。';}},
 'reset-confirm':()=>openModal(`<h2 id="modal-title">重新体验这份演示？</h2><p>只清除本机新版 Demo 的编辑、标记、草稿与模拟授权。旧版个人档案和活动记录不受影响。</p><div class="actions">${btn('确认重新体验','reset','primary')}${btn('保留我的修改','close')}</div>`),
 reset:()=>{state=initialState();save();closeModal();mine();notify('新版演示已重置；旧版资料未改动。');}
};
document.addEventListener('click',async event=>{const b=event.target.closest('[data-act]');if(!b||b.disabled)return;const action=actions[b.dataset.act];if(action)await action(b);});
document.addEventListener('input',event=>{if(event.target.id==='search'){ui.query=event.target.value;$('#results').innerHTML=resultsView(state,ui);renderTownPins();}});
document.addEventListener('change',event=>{if(event.target.id==='report-consent')$('#activate-submit').disabled=!event.target.checked;if(event.target.id==='pair-consent')$('#pair-submit').disabled=!event.target.checked;});
document.addEventListener('submit',event=>{
 if(event.target.id!=='edit-form')return;event.preventDefault();const f=new FormData(event.target),read=k=>String(f.get(k)||'').trim(),tags=k=>[...new Set(read(k).split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean))];
 const tagValues=tags('tags'),interests=tags('interests');
 const error=!read('name')?'请留一个昵称，方便大家称呼你。':tagValues.length>5||tagValues.some(t=>[...t].length>12)?'特点最多 5 个，每个不超过 12 字。':interests.length>6||interests.some(t=>[...t].length>16)?'兴趣最多 6 个，每个不超过 16 字。':'';
 if(error){$('#form-error').textContent=error;$('#form-error').scrollIntoView({block:'center'});return;}
 const next={...state.me};for(const k of ['name','headline','work','notes','experience','wish','wishDetail','category','status','deepMode','houseColor'])next[k]=read(k);
 next.tags=tagValues;next.interests=interests;next.shareLife=f.has('shareLife');next.shareWork=f.has('shareWork');next.needed=Math.max(1,Math.min(20,Number(f.get('needed'))||1));
 next.appearance={...next.appearance,hairstyle:Number(f.get('hairstyle')),outfit:f.get('outfit')||next.appearance.outfit};
 if(next.deep){next.deep={};for(const k of ['rhythm','help','misread','growth','evidence'])next.deep[k]=read(k);}
 state.me=next;state.confirmed=true;const saved=save();closeModal();ui.preview=false;render({focus:true});if(saved)notify('已保存到本机。可切换访客视角，看看别人眼中的你。');
});
render();
async function loadWorld(){
 try{world=new ForestWorld($('#scene'),event=>{if(event.type==='resident')openPerson(event.id);});await world.load();worldReady=true;$('#scene-status').hidden=true;renderScene();}
 catch(error){console.error('Forest scene could not load:',error);$('#scene-status').innerHTML='三维场景暂未加载成功。<br>右侧的完整体验仍可继续。<br><button class="secondary" onclick="location.reload()">重新加载页面</button>';}
}
loadWorld();
