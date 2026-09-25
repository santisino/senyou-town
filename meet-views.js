import {escapeHTML as e,NEIGHBORS,canReadDeep,publicPerson,connection,filterPeople,sourceNote} from './meet-data.js';
import {icon as baseIcon} from './opening-icons.js';
const paths={arrow:'M5 12h14m-5-5 5 5-5 5',back:'M19 12H5m5-5-5 5 5 5',folder:'M3 7V4h6l3 3h9v13H3V7Z',table:'M3 11h18M5 11v9m14-9v9M9 7h6M12 3v4',lock:'M6 10h12v11H6V10Zm3 0V6a3 3 0 0 1 6 0v4',edit:'m4 16 12-12 4 4-12 12-5 1 1-5Zm10-10 4 4',eye:'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',heart:'M12 21 3 12C-1 6 7 1 12 7c5-6 13-1 9 5l-9 9Z'};
export const icon=name=>paths[name]?`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`:baseIcon(name);
export const btn=(label,act,cls='secondary',attrs='')=>`<button type="button" class="${cls}" data-act="${act}" ${attrs}>${label}</button>`;
const chips=(values,kind='')=>`<div class="chips">${values.map(v=>`<span class="chip ${kind}">${e(v)}</span>`).join('')}</div>`;
const field=(name,label,value,max=100,textarea=false,help='')=>`<label class="field"><span>${label}</span>${textarea?`<textarea name="${name}" maxlength="${max}">${e(value)}</textarea>`:`<input name="${name}" value="${e(value)}" maxlength="${max}" autocomplete="off">`}${help?`<small>${help}</small>`:''}</label>`;
const select=(name,label,values,selected)=>`<label class="field"><span>${label}</span><select name="${name}">${values.map(v=>`<option${v===selected?' selected':''}>${e(v)}</option>`).join('')}</select></label>`;
export function startView(){return `<article class="sheet enter"><p class="entry-note">白马示例班 · 以虚构居民「小禾」体验</p><h1>先认识自己，<br>再让彼此靠近一点。</h1><p class="muted" style="margin-top:20px">不用再做一份问卷。把已有的报告变成好读的介绍，再补上只有你自己知道的小事。</p><ol class="start-steps"><li>选择是否使用已有报告</li><li>确认自己的呈现与可见范围</li><li>到另一位森友的小屋坐坐</li></ol>${btn('用模拟报告开始 '+icon('arrow'),'activate','primary wide')}${btn('先不使用报告，自己写几句','manual','text-button wide')}<p class="note">本次不读取真实报告，也没有接入企业账号。你可以随时直接去「认识森友」。</p></article>`;}
export function activationView(){return `<h2 id="modal-title">让报告，变成一份好读的介绍</h2><p class="muted">先体验「读取 → 转译 → 本人确认」。这次使用虚构样例，不上传文件。</p><div class="scope"><strong>模拟读取什么</strong><br>行为偏好、沟通习惯与协作提示。<br><strong>不会自动公开什么</strong><br>完整报告、深层内容、合拍资料。</div><label class="check-line"><input id="report-consent" type="checkbox">我同意在本次演示中使用模拟报告生成个人呈现，生成后由我确认和修改。</label>${btn('生成我的呈现','confirm-activate','primary wide','id="activate-submit" disabled')}<p class="note">兴趣、经历、近期探索和找人事项都是人物自述示例，不从 DISC 推断。可以全部删掉，换成你愿意展示的内容。</p>`;}
export function contextView(ui,state){
 const left=ui.view==='discover'?'<small>白马示例班 · 认识不同组的彼此</small>':btn(icon('back')+'森友名单','discover','');
 let right='';if(ui.view==='profile'&&ui.person==='me')right=`${btn(icon('eye')+(ui.preview?'退出访客视角':'访客视角'),'preview','')}${!ui.preview?btn(icon('edit')+'编辑我的卡','edit',''):''}`;
 if(ui.view==='profile'&&ui.person!=='me')right=btn('回我的小屋','mine','');
 return left+`<div class="context-actions">${right}</div>`;
}
export function placesView(ui){return [['door','home','门前认识'],['table','table','会客桌'],['archive','folder','档案袋']].map(([id,i,label])=>btn(icon(i)+label,'place','',`data-place="${id}" ${ui.view==='profile'&&ui.place===id?'aria-current="step"':''}`)).join('');}
export function profileView(original,state,ui){
 const owner=original.id==='me',self=owner&&!ui.preview,p=self?original:{...publicPerson(original),deep:canReadDeep(original,state,{owner,preview:ui.preview})?original.deep:null};
 const preview=ui.preview?'<div class="preview-strip">这是班级同学第一次来访时看到的你。未开放的内容不会展示。</div>':self&&!state.confirmed?`<div class="preview-strip">这是待你确认的呈现，不是给你贴的标签。可以先修改，也可以保留这份示例。${btn('确认这份呈现','confirm-profile','text-button')}</div>`:'';
 const heading=`<h1>${e(p.name)}${self?'的小屋':''}</h1><div class="subline"><span>白马示例班 · ${e(p.group)}</span><span>${self?'我自己':owner?'访客视角':'虚构森友'}</span></div>`;
 let content=ui.place==='table'?tableView(p,original,state,self,ui):ui.place==='archive'?archiveView(p,original,state,self,ui):doorView(p,state,self,owner);
 return `${preview}<article class="sheet">${heading}${content}</article>`;
}
function doorView(p,state,self,owner){
 return `<p class="headline">${e(p.headline||'不急着定义自己，先从一句介绍开始。')}</p>${p.tags.length?chips(p.tags):'<p class="note">特质还没有填写，也不妨碍先认识。</p>'}
 ${p.wish?`<div class="invite"><div class="meta">${e(p.status)} · ${e(p.category)}${p.status==='找人中'?` · 想找 ${p.needed} 位伙伴`:''}</div><h2>${e(p.wish)}</h2>${p.wishDetail?`<p>${e(p.wishDetail)}</p>`:''}</div>`:`<div class="invite"><div class="meta">先打个招呼</div><h2>暂时没有找人事项，也欢迎来坐坐。</h2></div>`}
 ${p.work?`<div class="work-note"><h3>${icon('tree')}和${self?'我':'TA'}一起做事</h3><p>${e(p.work)}</p></div>`:`<p class="note">协作偏好暂未公开，可以在交流中慢慢了解。</p>`}
 <div class="actions">${btn('去会客桌坐坐 '+icon('arrow'),'place','primary','data-place="table"')}${!owner&&p.wish&&p.status==='找人中'?btn('我也想参加','greet-wish'):''}</div>
 ${self?`<span class="source">${state.reportConsent?'报告相关内容为转译样例，需本人确认；生活信息为虚构自述。':'当前为手动建立的介绍，未使用报告生成。'}</span>`:''}`;
}
function tableView(p,original,state,self,ui){
 return `<p class="headline">坐下来，聊点具体的。</p><p class="section-label">会客桌 · ${self?'你愿意分享的日常':'公开的日常与近况'}</p>
 ${p.shareLife||self?`<div class="reading"><h3>${self?'我的':'TA的'}兴趣角</h3>${p.interests.length?chips(p.interests,'interest'):'<p class="muted">暂时没有留下兴趣标签。</p>'}</div><div class="reading"><h3>最近在探索</h3><p>${e(p.notes||'这一页还没写，留一点空白也很好。')}</p></div><div class="reading"><h3>一件让我更像自己的小事</h3><p>${e(p.experience||'还没有分享经历。')}</p></div>`:'<div class="reading"><h3>日常这一页，TA想先留给自己。</h3><p class="muted">不必填满每一页，也可以从一句简单的问候开始。</p></div>'}
 ${self?'<p class="source">以上均由本人补充，不由报告推测；编辑时可关闭日常展示。</p>':`<p class="connection">${e(connection(p,state.me))}</p>`}
 <div class="actions">${self?btn('去认识另一组的森友 '+icon('arrow'),'cross','primary'):ui.person==='me'?btn('退出访客视角','preview','primary'):btn('带着一个话题打招呼 '+icon('arrow'),'greet','primary')}</div>${btn('更深入地了解协作习惯 '+icon('folder'),'place','text-button','data-place="archive"')}`;
}
function archiveView(p,original,state,self,ui){
 const readable=canReadDeep(original,state,{owner:original.id==='me',preview:ui.preview});
 const status=state.grants[original.id];
 if(!readable){
  let title='这份档案，先敲门再打开。',desc='这里放着更细的协作习惯和支持方式。只有本人同意，才继续往里看。',action='';
  if(original.id==='me'&&ui.preview){title='深层档案未向初次来访者开放。';desc=original.deepMode==='closed'?'你选择了仅自己可见。':'同学需要向你申请，由你决定是否开放。';}
  else if(!original.deep){title='这份档案还没有准备好。';desc='没有报告也可以认识彼此。先聊兴趣和近况，不必等资料齐全。';if(self)action=btn('体验模拟报告生成','activate','primary');}
  else if(original.deepMode==='closed'){title='TA把这部分留给了自己。';desc='这不影响你们从公开信息开始交流。无需继续申请，也可以好好认识。';}
  else if(status==='pending'){title='申请已在本机记录，等待演示下一步。';desc='真实产品中应由对方决定。这是单机 Demo，不会向任何人发送请求。';action=btn('撤回本机申请','withdraw');}
  else if(status==='denied'){title='本次演示中，对方暂未同意。';desc='尊重这个边界；你仍可回到会客桌，从公开的话题聊起。';}
  else action=btn('申请了解协作档案','request','primary');
  return `<div class="locked"><div class="lock-icon">${icon('lock')}</div><h2>${title}</h2><p>${desc}</p><div class="actions">${action}${btn('回会客桌','place','secondary','data-place="table"')}</div></div>${status==='pending'&&original.id!=='me'?`<details class="demo-controls" open><summary>演示控制 · 代入对方的选择（非真实授权）</summary><div class="actions">${btn('模拟对方同意','approve')}${btn('模拟暂不开放','deny')}</div></details>`:status==='denied'?`<details class="demo-controls"><summary>演示控制</summary>${btn('重新演示此授权','withdraw','text-button')}</details>`:''}`;
 }
 const d=original.deep;
 return `<p class="headline">更懂一点，合作就轻松一点。</p><p class="section-label">档案袋 · ${self?'仅自己查看 / 可设置是否接受申请':'已获模拟授权'}</p><div class="reading"><h3>我的工作节奏</h3><p>${e(d.rhythm)}</p></div><div class="reading"><h3>这样支持我，会更有帮助</h3><p>${e(d.help)}</p></div><details class="reading"><summary>一句容易被误读的话</summary><p style="margin-top:12px">${e(d.misread)}</p></details><div class="reading"><h3>${icon('tree')} 成长小记</h3><p>${e(d.growth)}</p><small>${e(d.evidence)}</small></div><span class="source">${e(sourceNote)}。成长小记为个人练习示意，不代表测出的能力等级。</span>
 <div class="actions">${self?btn('编辑内容与可见范围','edit','primary'):btn('看看我们怎么配合','pair','primary')}</div>${!self?`${btn('撤销本次模拟授权','revoke','text-button')}<p class="note">读取个人档案不等于同意生成双人合拍；下一步会单独征求双方同意。</p>`:''}`;
}
export function discoverView(state,ui){return `<div class="form-heading"><h1>从一个共同话题，<br>认识一个新朋友。</h1><p>不只认识同组的人。看看森林里，谁和你有一个想一起做的小愿望。</p></div><label><span class="section-label">找人、找兴趣，或找一件想做的事</span><input id="search" class="search" type="search" placeholder="试试：桌游、咖啡、学习…" value="${e(ui.query)}" aria-label="搜索森友"></label><nav class="filters" aria-label="筛选森友">${[['all','全部森友'],['cross','不同组'],['open','正在找人'],['social','组局破冰'],['learn','共同学习']].map(([id,label])=>btn(label,'filter','',`data-filter="${id}" aria-pressed="${ui.filter===id}"`)).join('')}</nav><div id="results">${resultsView(state,ui)}</div>`;}
export function resultsView(state,ui){
 const people=filterPeople(NEIGHBORS,ui.query,ui.filter,state.me.group);
 const cards=people.map(p=>{
  const incomplete=!p.tags.length&&!p.work;
  const status=p.wish?e(p.status)+' · '+e(p.category):incomplete?'刚来森林':'随时聊聊';
  const wish=p.wish||(incomplete?'还没填完介绍，先打个照面。':'暂未发布找人事项，欢迎来坐坐。');
  return `<article class="person-card"><div class="card-top"><span class="avatar" aria-hidden="true">${e(p.name.slice(-1))}</span><div><h3>${e(p.name)}</h3><small>${e(p.group)}</small></div></div>${chips(p.tags.slice(0,2))}<p>${e(p.shareWork&&p.work||p.headline)}</p><div class="wish-small"><small>${status}</small><p>${e(wish)}</p></div><div class="actions">${btn('去TA的小屋 '+icon('arrow'),'person','primary',`data-id="${p.id}"`)}${btn(icon('heart'),'bookmark','secondary',`data-id="${p.id}" aria-label="${state.bookmarks.includes(p.id)?'取消记住':'记住'}${e(p.name)}" aria-pressed="${state.bookmarks.includes(p.id)}"`)}</div></article>`;
 }).join('');
 return `<p class="list-count">${people.length} 位森友${ui.filter==='cross'?' · 来自其他小组':''} · 所有人物均为虚构样例</p>${people.length?`<div class="people-grid">${cards}</div>`:`<div class="empty"><h3>暂时没有找到这样的森友。</h3><p>换个关键词，或看看其他组的同学。</p>${btn('清空搜索和筛选','clear-search','text-button')}</div>`}`;
}
export function editView(p,state){return `<h2 id="modal-title">让这间小屋，更像你。</h2><p class="muted">只写愿意分享的。除了昵称，其余都可留空；保存后还可以看访客视角。</p><form id="edit-form"><div class="form-group">${field('name','昵称',p.name,12)}${field('headline','一句话让人记住你',p.headline,60)}${field('tags','几个自己的特点',p.tags.join('，'),90,false,'用逗号隔开，最多 5 个，每个不超过 12 字。')}${field('work','和我一起做事，怎么沟通更舒服？',p.work,160,true,'这是你的表达，不是报告给你的固定标签。')}<label class="check-line"><input type="checkbox" name="shareWork" ${p.shareWork?'checked':''}>向班级同学展示这句协作提示</label></div>
 <div class="form-group"><h3>会客桌上的日常</h3>${field('interests','兴趣',p.interests.join('，'),120,false,'用逗号隔开，最多 6 个，每个不超过 16 字。')}${field('notes','最近在学 / 在探索',p.notes,240,true)}${field('experience','一件让我更像自己的小事',p.experience,240,true)}<label class="check-line"><input type="checkbox" name="shareLife" ${p.shareLife?'checked':''}>展示兴趣、探索与这件小事</label></div>
 <div class="form-group"><h3>最近想找人一起做的事</h3>${field('wish','事项标题',p.wish,70)}${field('wishDetail','邀请补充',p.wishDetail,140,true)}<div class="field-row">${select('category','分类',['社交','学习','运动','创造'],p.category)}<label class="field"><span>想找几位伙伴</span><input type="number" name="needed" min="1" max="20" value="${p.needed}"></label></div>${select('status','现在的状态',['找人中','已成局','已结束'],p.status)}</div>
 <details class="form-group"><summary>档案袋 · 深入协作与授权</summary>${p.deep?`${field('rhythm','我的工作节奏',p.deep.rhythm,200,true)}${field('help','这样支持我',p.deep.help,200,true)}${field('misread','容易被误读的地方',p.deep.misread,200,true)}${field('growth','正在练习什么',p.deep.growth,160,true)}${field('evidence','一条自己的实践记录',p.deep.evidence,240,true)}`:'<p class="note">尚未使用模拟报告，没有自动生成深层内容。</p>'}<label class="field"><span>别人能否申请查看？</span><select name="deepMode"><option value="request" ${p.deepMode==='request'?'selected':''}>允许申请，由我决定</option><option value="closed" ${p.deepMode==='closed'?'selected':''}>仅自己可见，不接受申请</option></select></label><p class="note">班级可见不等于完整报告公开。正式权限需要由服务端执行，本页只是状态演示。</p></details>
 <details class="form-group"><summary>小屋和形象</summary><label class="field"><span>小屋色彩</span><select name="houseColor">${[['#94a884','鼠尾草绿'],['#bc8d78','暖陶粉'],['#c5ac83','燕麦木色'],['#9bb3ad','湖水绿']].map(([v,l])=>`<option value="${v}"${p.houseColor===v?' selected':''}>${l}</option>`).join('')}</select></label><label class="field"><span>发型</span><select name="hairstyle">${[0,1,2,3].map((v)=>`<option value="${v}"${Number(p.appearance.hairstyle)===v?' selected':''}>造型 ${v+1}</option>`).join('')}</select></label><span class="field">衣服色彩</span><div class="swatches">${[['#a0ad87','苔绿'],['#c79167','暖杏'],['#90a7b1','雾蓝'],['#c4a29c','藕粉']].map(([v,l])=>`<label><input type="radio" name="outfit" value="${v}"${p.appearance.outfit===v?' checked':''}><i style="--swatch:${v}"></i>${l}</label>`).join('')}</div></details>
 <p id="form-error" class="error" role="alert"></p><div class="form-footer">${btn('取消','close','secondary')}<button type="submit" class="primary">保存我的呈现</button></div></form>`;}
export function aboutView(){return `<h2 id="modal-title">这次，先把两件事做完整。</h2><div class="reading"><h3>一 · 一个人的完整呈现</h3><p>模拟报告生成 → 本人修改 → 门前认识、会客桌、档案袋 → 切换访客视角。</p></div><div class="reading"><h3>二 · 一次认识另一个人的过程</h3><p>找另一组同学 → 发现共同话题 → 去小屋逐层了解 → 体验授权边界 → 准备一句合适的招呼。</p></div><div class="scope">人物、报告转译、授权和合拍均为模拟。没有真实报告接口、真实消息、企业登录或多人同步；不会向蚂蚁或任何同学发送数据。请勿填写真实员工报告与敏感信息。</div><p class="note">三维场景复用 Blender 原创模型。小树与森林是成长的隐喻，不是能力评分，也不兑换蚂蚁森林绿色能量。旧版活动与资料未被改写。</p><div class="actions">${btn('从头体验（清除本机新版演示）','reset-confirm','secondary')}</div>`;}
