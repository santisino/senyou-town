import { activeVillage, isPublic, joined, mayManage, villageSummary, PUBLIC_VILLAGE, shareLink } from './villages.js?v=villages-v1';
import { FIELDS, SPACES } from './data.js?v=village-v4';
import { encodeVillage } from './config.js';
import qrcode from '../vendor/qrcode.mjs';

const TABS=['总览','村庄设置','居民与加入','活动与公共空间','邀请与分享','治理与归档'];
const ROLE={resident:'普通森友',activity:'活动村长',public:'公共村长',donglai:'东来 · 双村村长'};
export function createVillageUI({getState,commit,panel,button,esc,toast,close,travel,meetMayor,goInviter}) {
  const $=q=>document.querySelector(q);
  const b=(text,action,data='',cls='')=>button(text,'net-'+action,data,cls);
  const arrow='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
  const s=()=>getState(), me=()=>s().residents.find(r=>r.id===s().actor), v=()=>activeVillage(s());
  let tab=0;
  const stateLabel=x=>x.archived?'活动已归档':x.kind==='public'?'公共村 · 持续开放':x.stage==='open'?'活动村 · 已开放串门':'活动村 · 正在安家';
  function picker() {
    panel('森林里的村庄','一份个人介绍，可以在不同村庄遇见不同的人。',
      `<p class="notice">换村不会重新填写个人资料。每座村分别确认加入与公开范围；礼物、报名、金币与活动记录留在发生的村里。</p><div class="village-list">${Object.values(s().network.villages).map(x=>{
        const m=x.members[s().actor],current=x.id===s().network.active;
        return `<article><div><h3>${esc(x.settings.name)}</h3><p>${stateLabel(x)} · ${m?.membership==='joined'?'我已加入':m?.membership==='pending'?'等待村长回应':'尚未加入'}</p><small>${esc(x.settings.goal)}</small></div>${b(current?'正在这里':'去村口看看','travel',`data-id="${esc(x.id)}" ${current?'disabled':''}`,current?'':'primary')}</article>`;
      }).join('')}</div><p class="muted">公共村在本次演示中展示 50 个宅地；更多街区是后续扩展方向，不代表百人实时在线。</p>`,
      (joined(s())?b('管理我在本村的公开范围','privacy'):'')+b('给村长留一条反馈','feedback'),'wide');
  }
  function disclosure(join=false) {
    const r=me(),member=joined(s());
    if(join&&r.membership==='pending') {
      panel('村长已收到加入申请','本机模拟：可在村长工作台处理这条申请。','<p>等待通过期间，可以在村口走走，但不能查阅居民资料或进入别人的小屋。申请不等于加入。</p>',b('继续探索','close'));return;
    }
    if(join&&v().archived){panel('这场活动已经收好','个人资料还在，森林里的故事可以继续。','<p>活动村不再接受新加入。你可以去蚂蚁森友村，重新选择在那里公开哪些介绍。</p>',b('去蚂蚁森友村','travel',`data-id="${PUBLIC_VILLAGE}"`,'primary'));return;}
    panel(join?`${v().settings.mayor} · 欢迎来做邻居`:'我在这座村的公开范围',
      `${v().settings.name} · 只调整这里，不替其他村作决定`,
      `<p class="quote">${join?esc(v().settings.welcome):'同一份故事，可以有不同的分享边界。'}</p>${join?`<label class="field">大家怎么称呼你<input id="net-name" maxlength="24" value="${esc(r.name==='新森友'?'':r.name)}" placeholder="名字或昵称"></label>`:''}<p>${join&&s().network.people[r.id]?.complete?'你已经完成过个人说明书，不需要重填。确认加入后，小屋会带着你原来的形象和装扮出现在这里。':'内容仍由你自己填写。勾选只表示愿意在本村公开这一项，草稿在确认前不会展示。'}</p><div class="notice">姓名／昵称、形象、入驻状态会对本村居民可见。原始问答、私密成长笔记和 DISC 原文不公开。新村默认不勾选任何介绍。</div><div class="disclosure-list">${FIELDS.map(([key,title])=>`<label><input type="checkbox" data-net-public="${key}" ${member&&r.public[key]?'checked':''}><span><strong>${esc(title)}</strong><small>${esc(r.profile[key]?.trim()||'还没有填写')}</small></span></label>`).join('')}</div>`,
      b('先不决定','close')+b(join?(v().joinPolicy==='approval'?'提交加入申请':'确认加入这座村'):'保存本村公开范围',join?'join':'save-privacy','','primary'),'wide');
  }
  const scope=()=>Object.fromEntries([...document.querySelectorAll('[data-net-public]')].map(el=>[el.dataset.netPublic,el.checked]));
  function roles() {
    panel('选择演示村长身份','这是本地角色模拟，不是账号授权或真实后台登录。',
      '<p>村长管理村庄；演示者切换虚构人物、章节与测试数据。两者有独立入口。</p><div class="role-options">'+
      b('东来：活动村＋公共村','role','data-role="donglai"','primary')+
      b('只体验活动村长','role','data-role="activity"')+b('只体验公共村长','role','data-role="public"')+'</div><p class="notice">正式产品需由蚂蚁的身份系统授予权限。这里任何人都能选择演示身份，请勿输入真实员工敏感资料。</p>');
  }
  function memberRows(limit=Infinity) {
    const entries=Object.entries(v().members).filter(([,m])=>m.membership!=='visitor').slice(0,limit);
    return `<div class="admin-table-wrap"><table><thead><tr><th>居民</th><th>入驻进度</th><th>加入方式</th>${tab===2?'<th>操作</th>':''}</tr></thead><tbody>${entries.map(([id,m])=>`<tr><td>${esc(s().network.people[id]?.name||'森友')}<small>${s().network.people[id]?.simulated?'虚构居民':'本机角色'}</small></td><td>${m.membership==='removed'?'成员资格已暂停':m.membership==='pending'?'等待加入':m.confirmed?'已准备好':m.built?'布置小屋':m.arrived?'准备安家':'尚未到达'}</td><td>${esc(m.origin||'本机演示')}</td>${tab===2?`<td>${id===s().actor?'当前体验者':b(m.membership==='removed'?'恢复加入':'暂停加入','member',`data-id="${esc(id)}"`)}</td>`:''}</tr>`).join('')||`<tr><td colspan="4">还没有居民加入。可以先生成本活动的邀请。</td></tr>`}</tbody></table></div>`;
  }
  function overview() {
    const c=villageSummary(s(),v().id);
    return `<div class="admin-stats"><div><span>已加入</span><strong>${c.joined}</strong><small>本机</small></div><div><span>已准备好</span><strong>${c.ready}</strong><small>本机</small></div><div><span>待处理申请</span><strong>${c.pending}</strong><small>本机</small></div><div class="admin-stat-actions">${b(isPublic(s())?'公共村邀请':'生成活动邀请','invite','','primary')}${b('创建活动村','create')}</div></div><div class="admin-overview"><section><h3>居民近况</h3>${memberRows(3)}</section><section class="admin-rules"><h3>这座村的规则</h3><ol><li>${isPublic(s())?'持续开放，随时入驻':'先安家，再由村长开放串门'}</li><li>公开范围由居民自己确认</li><li>个人资料不因换村重新填写</li></ol>${!isPublic(s())?b(v().stage==='open'?'暂停串门':'开放串门','stage','','primary'):''}</section></div><section class="share-route"><h3>分享如何抵达这里</h3><div><span>朋友的分享</span><i>${arrow}</i><span>蚂蚁森友村</span><i>${arrow}</i><span>找到邀请你的人</span></div></section>`;
  }
  function settings() {
    const x=v().settings;
    return `<p>村长形象、欢迎语和目标会更新到村口；邀请码只携带这些公开配置，不带成员或权限。</p><div class="columns"><label class="field">村庄名称<input id="admin-name" maxlength="30" value="${esc(x.name)}" ${isPublic(s())?'readonly':''}></label><label class="field">村长名字<input id="admin-mayor" maxlength="30" value="${esc(x.mayor)}"></label><label class="field">说话语气<select id="admin-tone">${['温暖','轻快','简洁'].map(t=>`<option ${t===x.tone?'selected':''}>${t}</option>`).join('')}</select></label><label class="field">村长形象<select id="admin-appearance">${[['green','苔绿外套'],['earth','陶土外套'],['blue','湖蓝外套']].map(([k,t])=>`<option value="${k}" ${k===x.appearance?'selected':''}>${t}</option>`).join('')}</select></label></div><label class="field">欢迎的话<textarea id="admin-welcome" maxlength="300">${esc(x.welcome)}</textarea></label><label class="field">村庄目标<textarea id="admin-goal" maxlength="300">${esc(x.goal)}</textarea></label>${!isPublic(s())?`<label class="field">加入规则<select id="admin-policy"><option value="invite" ${v().joinPolicy==='invite'?'selected':''}>活动专属邀请后确认加入</option><option value="approval" ${v().joinPolicy==='approval'?'selected':''}>申请后，由村长确认</option></select></label>`:'<p class="notice">蚂蚁森友村持续开放，但居民仍须主动确认加入与公开范围。</p>'}${b('保存村庄设置','settings-save','','primary')}`;
  }
  function residents() {
    return `<p>看入驻进度，不读取居民的原始问答、私密笔记或隐藏介绍。</p>${memberRows()}<section><h3>加入申请</h3>${v().joinRequests.map(q=>`<div class="result-row"><strong>${esc(s().network.people[q.person]?.name)}${q.simulated?' · 虚构申请':''}</strong><p>${({pending:'等待处理',accepted:'已同意',declined:'已婉拒'})[q.status]}</p>${q.status==='pending'?b('同意加入','join-reply',`data-id="${q.id}" data-accept="yes"`,'primary')+b('暂不通过','join-reply',`data-id="${q.id}"`):''}</div>`).join('')||'<p class="muted">暂无申请。</p>'}${b('演示一条虚构加入申请','sample-request')}</section>`;
  }
  function content() {
    return `<p>先在工作台发布，再走到对应公共空间阅读、收藏或参与。所有发布仅保存在本机。</p><div class="columns"><label class="field">放在哪里<select id="admin-space">${SPACES.filter(([k])=>k!=='shop').map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select></label><label class="field">标题<input id="admin-content-title" maxlength="60" placeholder="比如：午休一起练手机摄影"></label></div><label class="field">具体做什么<textarea id="admin-content-body" maxlength="600" placeholder="写清楚目的、参与方式，以及希望大家留下什么。"></textarea></label>${b('发布到公共空间','publish','','primary')}<section><h3>已发布内容</h3>${v().content.map(c=>`<div class="result-row"><strong>${esc(c.title)}</strong><p>${esc(SPACES.find(([k])=>k===c.space)?.[1])} · ${c.status==='published'?'已上架':'已隐藏'} · ${Object.entries(s().publicResults).filter(([key,val])=>key.endsWith(':village-content-'+c.id)&&val.joined).length} 次本机参与</p><p>${esc(c.body)}</p>${b(c.status==='published'?'隐藏内容':'重新上架','content-status',`data-id="${c.id}"`)}</div>`).join('')||'<p class="muted">还未发布。游戏原有公共空间体验仍可使用。</p>'}</section>`;
  }
  function invites() {
    const c=villageSummary(s(),v().id);
    return `<div class="notice">这里只统计本浏览器发生的操作。没有服务器，不能看到同事在其他手机上的扫码、注册或留存。</div><section><h3>${isPublic(s())?'公共村邀请':'活动专属邀请'}</h3><p>${isPublic(s())?'欢迎新邻居来公共村；不附带村长权限。':'由村长发给本场同学。目的地是这座活动村，打开后仍需本人确认加入。'}</p>${b('生成入村二维码与链接','invite','','primary')}</section><section><h3>居民分享</h3><p>五种明信片的二维码都承接到蚂蚁森友村，保留分享类型。虚构居民可演示“找到邀请人”；自填资料不上传，跨设备使用小林示范后续流程。</p>${b('预演：小林分享摄影心愿','preview-share','data-kind="wish"')}${b('预演：小屋分享','preview-share','data-kind="house"')}</section><section><h3>本机记录</h3><p>已生成分享预览 ${c.shares} 次 · 本机接收分享入口 ${c.arrivals} 条（相同示例按角色去重）。不是跨设备转化率。</p><div class="admin-log">${v().events.slice(-10).reverse().map(e=>`<p>${new Date(e.at).toLocaleTimeString('zh-CN')} · ${esc(({'share-created':'生成分享预览','share-arrival':'打开分享入口',join:'确认加入','join-request':'提交加入申请','join-reply':'处理加入申请',stage:'调整阶段',archive:'调整归档状态'})[e.type]||e.type)}</p>`).join('')||'<p>暂无记录。</p>'}</div></section>`;
  }
  function governance() {
    const reports=v().reports.map(q=>{
      const reply=q.status==='pending'
        ? `<label class="field">处理说明<textarea id="reply-${q.id}" maxlength="300" placeholder="说明做了什么，不自动删除居民资料"></textarea></label>${b('保存处理结果','report-reply',`data-id="${q.id}"`,'primary')}`
        : `<p>${esc(q.reply)}</p>`;
      return `<section class="result-row"><strong>${esc(s().network.people[q.person]?.name)} · ${q.status==='pending'?'待处理':'已处理'}</strong><p>${esc(q.text)}</p>${reply}</section>`;
    }).join('');
    const lifecycle=isPublic(s())?'<p>蚂蚁森友村是长期入口，不提供归档开关。</p>'
      : `<p>归档会停止本活动的新加入与互动，保留本机历史和个人资料。不会自动让成员加入公共村，也不会带走原活动的名单和私密记录。</p>${b(v().archived?'恢复活动为准备中':'归档这场活动','archive-check','',v().archived?'':'danger')}`;
    return `<h3>居民反馈</h3>${reports||'<p class="muted">暂无反馈。居民可在「村庄」入口给村长留言。</p>'}<section><h3>活动生命周期</h3>${lifecycle}</section><p class="notice">这是管理流程演示，不是服务器安全边界。正式版仍需要登录、权限校验、审计、内容治理与数据保留策略。</p>`;
  }
  function admin(index=tab) {
    tab=Number(index)||0;
    if(s().network.manager==='resident'){roles();return;}
    const permitted=mayManage(s());
    panel('村长工作台','',`<div class="mayor-workspace"><aside class="mayor-sidebar"><h2>森友会</h2><label class="field"><span class="sr-only">管理哪座村</span><select id="admin-village">${Object.values(s().network.villages).map(x=>`<option value="${x.id}" ${x.id===v().id?'selected':''}>${esc(x.settings.name)}</option>`).join('')}</select></label><p>${stateLabel(v())}</p><nav aria-label="村长工作台栏目">${TABS.map((t,i)=>b(t,'tab',`data-index="${i}" aria-current="${i===tab?'page':'false'}"`,i===tab?'selected':'')).join('')}</nav><div class="mayor-identity"><strong>${ROLE[s().network.manager]}</strong><small>本地模拟权限</small>${b('切换演示身份','roles')}${b('退出村长身份','role','data-role="resident"')}</div></aside><main class="mayor-main"><div class="admin-heading"><div><h1>${esc(v().settings.name)}</h1><p>${tab===0?'每一次分享，都有一个可以落脚的地方。':TABS[tab]}</p></div><span class="admin-demo-note">本地框架演示 · 不与其他设备同步</span></div>${permitted?[overview,settings,residents,content,invites,governance][tab]():`<div class="notice"><h3>这个演示身份不管理当前村庄</h3><p>可以从左侧选择有权限的村庄，或明确切换演示身份。不会因为拿到分享链接就获得管理权。</p>${b('切换演示身份','roles')}</div>`}</main></div>`,'','mayor-panel');
    $('.panel-head .close').textContent='返回森林';$('.panel-head .close').setAttribute('aria-label','返回森林');
    if(permitted&&!isPublic(s()))$('.admin-heading').insertAdjacentHTML('afterend',`<section class="lesson-growth-entry"><h3>百蚂村 · 合拍局</h3><p>推进课堂阶段，查看参与进度，主持一次共同复盘。</p>${button('打开教学主持台','learn-teacher','','primary')}</section>`);
  }
  async function invite() {
    if(!mayManage(s())){toast('请先选择本村的演示村长身份。');return;}
    const url=new URL('./',location.href);url.search='';url.hash='';
    if(isPublic(s()))url.searchParams.set('entry','public');
    else {url.searchParams.set('entry','activity');url.searchParams.set('vid',v().id);url.searchParams.set('policy',v().joinPolicy);url.searchParams.set('config',await encodeVillage(v().settings));}
    const qr=qrcode(0,'L');qr.addData(url.href);qr.make();
    panel(isPublic(s())?'邀请同事来蚂蚁森友村':'本场活动的入村邀请','不授予村长权限，不包含居民资料。',
      `<div class="invite-qr">${qr.createSvgTag({cellSize:3,margin:4,scalable:true})}</div><h3>${esc(v().settings.name)}</h3><p class="notice">手机打开会建立一份独立的本地体验，不会自动同步这台电脑上的成员、开放阶段或消息。活动设置为生成链接时的快照。</p><label class="field">可复制的邀请链接<textarea id="net-invite-url" readonly>${esc(url.href)}</textarea></label><a href="${esc(url.href)}" target="_blank" rel="noopener">新窗口打开此入口</a>`,b('复制链接','copy-link')+b('回工作台','admin'));
  }
  function feedback() {
    const reports=v().reports.filter(r=>r.person===s().actor);
    panel('给村长留句话','本机演示：反馈会出现在本村的治理看板。',
      `<label class="field">希望村长关注什么<textarea id="net-feedback" maxlength="300" placeholder="比如某条招募信息已过期"></textarea></label>${reports.map(q=>`<section><p>${esc(q.text)}</p><small>${q.status==='pending'?'等待村长查看':esc(q.reply)}</small></section>`).join('')}`,b('提交反馈','feedback-send','','primary'));
  }
  function spaceHTML(key) {
    if(!joined(s())||!me().confirmed||s().stage!=='open')return '';
    const list=v().content.filter(c=>c.space===key&&c.status==='published');
    if(!list.length)return '';
    return `<section class="village-content"><h3>村长放在这里的新内容</h3>${list.map(c=>{const done=s().publicResults[`${s().actor}:village-content-${c.id}`];return `<article><h4>${esc(c.title)}</h4><p>${esc(c.body)}</p>${b(done?'已记在本村的参与记录里':key==='library'?'收藏这条分享':'我想参与','take-content',`data-id="${c.id}" ${done?'disabled':''}`,'primary')}</article>`;}).join('')}</section>`;
  }
  document.addEventListener('change',e=>{
    if(e.target.id==='admin-village'&&commit({type:'net:switch',id:e.target.value})){travel(false);admin();}
  });
  async function handle(action,d) {
    if(!action.startsWith('net-'))return false;
    try {
      switch(action.slice(4)) {
        case 'picker':picker();break;
        case 'travel':if(commit({type:'net:switch',id:d.id}))travel();break;
        case 'privacy':disclosure(false);break;
        case 'save-privacy':if(commit({type:'net:privacy',public:scope()})){close();toast('只更新了本村的公开范围，其他村不变。');}break;
        case 'join': {
          const visibility=scope(),name=$('#net-name')?.value.trim();
          if(!name){toast('先告诉村长怎么称呼你吧。');break;}
          if(commit({type:'profile',name})&&commit({type:'net:join',public:visibility})) {
            if(me().membership==='pending')disclosure(true);
            else if(me().confirmed){close();toast('已带着原来的介绍安家。公开范围只使用刚才在本村的选择。');}
            else meetMayor();
          }break;
        }
        case 'mayor':meetMayor();break;
        case 'continue-share':goInviter();break;
        case 'admin':admin();break;
        case 'roles':roles();break;
        case 'role':if(commit({type:'net:role',role:d.role})){if(d.role==='resident')close();else admin(0);}break;
        case 'tab':admin(d.index);break;
        case 'stage':if(commit({type:'net:admin:stage',open:s().stage!=='open'}))admin();break;
        case 'settings-save': {
          const value=Object.fromEntries(['name','mayor','tone','appearance','welcome','goal'].map(k=>[k,$('#admin-'+k).value]));
          if(commit({type:'net:admin:settings',value,policy:$('#admin-policy')?.value})){admin();toast('已保存，村口欢迎与邀请配置同时更新。');}break;
        }
        case 'create':panel('创建一个活动村','新活动独立管理，不复制其他村的名单或公开范围。','<label class="field">活动村名称<input id="net-new-name" maxlength="30" placeholder="比如：百蚂秋日摄影村"></label>',b('创建并去管理','create-save','','primary'));break;
        case 'create-save':if(commit({type:'net:admin:create',name:$('#net-new-name').value})){travel(false);admin(0);}break;
        case 'join-reply':if(commit({type:'net:admin:joinReply',id:d.id,accept:d.accept==='yes'}))admin();break;
        case 'sample-request':if(commit({type:'net:admin:sampleRequest'}))admin();break;
        case 'member':if(commit({type:'net:admin:member',id:d.id}))admin();break;
        case 'publish':if(commit({type:'net:admin:content',space:$('#admin-space').value,title:$('#admin-content-title').value,body:$('#admin-content-body').value})){admin();toast('已发布，居民走到对应空间就能看到。');}break;
        case 'content-status':if(commit({type:'net:admin:contentStatus',id:d.id}))admin();break;
        case 'take-content':if(commit({type:'net:takeContent',id:d.id})){close();toast('已留下一条本村参与记录。村长工作台可看到本机参与数量。');}break;
        case 'invite':await invite();break;
        case 'copy-link': {
          const input=$('#net-invite-url');try{await navigator.clipboard.writeText(input.value);toast('邀请链接已复制');}catch{input.focus();input.select();toast('请复制已选中的链接。');}break;
        }
        case 'preview-share': {
          const demo={...s(),actor:'lin',residents:[...s().residents.filter(r=>r.id!=='lin'),s().network.people.lin]};
          const url=shareLink(demo,d.kind,new URL('./',location.href).href);
          panel('预演一次朋友的分享','新窗口是另一条入口，但同一浏览器仍共用本地存储。',`<p>模拟小林发出${d.kind==='wish'?'摄影心愿':'小屋'}分享，落地到蚂蚁森友村。不会加入原活动村或授予村长权限。</p><a class="primary invite-link" href="${esc(url)}" target="_blank" rel="noopener">打开分享承接入口</a><p class="muted">要模拟新同事，请把链接放进无痕窗口或另一台设备。每台设备独立保存。</p>`,b('回工作台','admin'));break;
        }
        case 'feedback':feedback();break;
        case 'feedback-send':if(commit({type:'net:report',text:$('#net-feedback').value})){feedback();toast('已留给本村村长（本机演示）。');}break;
        case 'report-reply':if(!$('#reply-'+d.id).value.trim())toast('请写下处理说明。');else if(commit({type:'net:admin:reportReply',id:d.id,reply:$('#reply-'+d.id).value}))admin();break;
        case 'archive-check':panel(v().archived?'恢复这场活动？':'把这场活动归档？','不会删除个人资料，也不会自动加入公共村。',`<p>${v().archived?'恢复后回到准备阶段，村长可再次开放串门。':'归档后停止本活动的加入、串门与互动；本机历史仍在。居民可自行去蚂蚁森友村确认公开范围。'}</p>`,b('取消','admin')+b('确认'+(v().archived?'恢复':'归档'),'archive','','primary'));break;
        case 'archive':if(commit({type:'net:admin:archive'}))admin();break;
        case 'close':close();break;
      }
    }catch(e){toast(e.message);}
    return true;
  }
  return {picker,disclosure,roles,admin,invite,spaceHTML,handle};
}
