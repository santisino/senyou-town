import { EXTRA_FIELDS,IDENTITIES,PREFERENCES,privacy,social,publicPerson,connectionReasons,matchList,previewData,introduction,growthInfo,classGraph,classInsights,greeting } from './connect-data.js?v=connections-v2';
import { lesson,livePair,classSummary } from './lesson-data.js?v=connections-v2';
import { mayManage,activeVillage } from './villages.js?v=connections-v2';
import qrcode from '../vendor/qrcode.mjs';
import { photograph } from './share-render.js?v=connections-v2';

export function createConnectUI(ctx) {
  const {getState:s,commit,panel,button,esc,toast,walkHome,walkSpace,teacher,pair}=ctx;
  const $=q=>document.querySelector(q), me=()=>s().residents.find(r=>r.id===s().actor);
  const b=(t,a,d='',c='')=>button(t,'social-'+a,d,c);
  const show=(t,sub,body,foot='',cls='lesson-panel')=>{dispose();panel(t,sub,body,foot,cls);};
  const row=(title,text)=>text?`<section class="readme-section"><h3>${esc(title)}</h3><p>${esc(text)}</p></section>`:'';
  const check=(id,label,yes)=>`<label class="lesson-consent"><input type="checkbox" id="${id}" ${yes?'checked':''}>${label}</label>`;
  const name=id=>s().residents.find(r=>r.id===id)?.name||'森友';
  let pngURL,blob,exportKey,identityPhoto;
  const takePhoto=()=>photograph(ctx.getWorld(),{kind:'house',angle:'front',people:[{name:me().name,appearance:me().appearance,decor:me().decor}]});
  function dispose(){if(pngURL)URL.revokeObjectURL(pngURL);pngURL=blob=exportKey=null;}
  const proof=()=>JSON.stringify([s().actor,me().name,me().profile,me().public,me().social,s().network.active]);
  function identity() {
    const r=me();if(!r.confirmed){toast('先在小屋册子里确认个人说明书，再领取村民卡。');walkHome(s().actor);return;}
    const suggested=({action:'explorer',ideas:'spark',steady:'anchor',detail:'weaver'})[r.social?.report?.preference]||'explorer';
    const ident=r.social?.identity||suggested,style=r.social?.style||'friendly';
    identityPhoto=takePhoto();
    show('门牌旁 · 我的村民卡','选一个喜欢的森林称号；它是自我表达，不是人格评级。',`<div class="identity-layout"><div><fieldset class="identity-choices"><legend>我想带着怎样的身份出发？</legend>${IDENTITIES.map(x=>`<label><input name="identity" type="radio" value="${x.id}" ${ident===x.id?'checked':''}><strong>${x.name}</strong><small>${x.animal} · ${x.line}</small></label>`).join('')}</fieldset><label class="field">我的介绍语气<select id="intro-style"><option value="friendly">自然聊天</option><option value="brief">简洁干练</option><option value="invitation">发出邀请</option></select></label><p class="muted">三种文风由规则整理公开表达，不是 AI 推断。改写原资料请回门牌；未公开内容不会进入卡片。</p></div><article class="identity-paper" id="identity-preview"></article></div>`,b('更新预览','identity-preview')+b('确认身份并生成分享图','identity-save','','primary')+b('补充连接线索与偏好','edit'));
    $('#intro-style').value=style;drawIdentity();
    document.querySelectorAll('[name="identity"],#intro-style').forEach(el=>el.addEventListener('change',drawIdentity));
  }
  function drawIdentity(){const r=me(),id=IDENTITIES.find(x=>x.id===$('[name="identity"]:checked')?.value)||IDENTITIES[0];$('#identity-preview').innerHTML=`<small>${esc(s().village.name)} · 森林居民</small><img class="identity-photo" src="${identityPhoto.toDataURL()}" alt="由现有 Blender 模型拍摄的我的小屋与形象"><div class="identity-emblem" aria-label="${id.animal}森林徽记">${({explorer:"🦌",spark:"🦊",anchor:"🐻",weaver:"🦉"})[id.id]}</div><h1>${esc(r.name)}</h1><h2>${id.name}</h2><p class="identity-intro">${esc(introduction(r,$('#intro-style').value))}</p>${row('我愿意带来的帮助',r.public.help?r.profile.help:'')}${row('与我协作的小提醒',r.public.collaboration?r.profile.collaboration:'')}<footer>${growthInfo(s()).stage} · 由本人选择与确认</footer>`;}
  function edit() {
    const r=me(),pr=privacy(r),report=r.social?.report;
    show('会客桌 · 多一点连接线索','这些问题可选；留空、保持私密，都不影响入驻。',`<p>不仅是“你喜欢什么”，也让别人知道你能提供什么、希望向谁学习。</p>${EXTRA_FIELDS.map(([k,title,hint])=>`<label class="field">${title}<textarea id="extra-${k}" maxlength="400" placeholder="${hint}">${esc(r.profile[k]||'')}</textarea></label>${check('public-'+k,'在当前村公开这项内容，用于认识与撮合',r.public[k])}`).join('')}<h2>我愿意确认的协作起点</h2><p>可以自己选择，也可以体验虚构报告建议。不会上传、解析真实 DISC 报告，也不把偏好当作能力。</p><label class="field">参考来源<select id="report-source"><option value="self">我的自述，不使用报告</option><option value="sample">体验一份示例 DISC 建议</option></select></label><div class="actions">${b('带入示例建议，仍由我确认','sample-report')}</div><label class="field">现在更适合我的方式<select id="report-preference"><option value="">暂不表达</option>${PREFERENCES.map(x=>`<option value="${x.id}">${x.name}</option>`).join('')}</select></label><p id="preference-hint" class="notice"></p>${check('report-confirm','我已阅读，这代表我现在愿意表达的偏好',!!report?.confirmed)}${check('privacy-report','在本村公开这条已确认的偏好，用于合拍预览',pr.report)}<h2>我愿意接收怎样的互动？</h2>${check('privacy-light','接收森友点亮',pr.light)}${check('privacy-advice','接收具名的学习建议',pr.advice)}${check('privacy-anonymous','也接收匿名建议（本机界面隐去发送者，并非安全匿名系统）',pr.anonymous)}${check('privacy-map','允许公开线索与已完成合作进入班级合拍地图',pr.map)}${check('privacy-mapName','地图上也展示我的名字，否则使用去标识编号',pr.mapName)}${check('privacy-growth','在懂我卡显示成长阶段，不公开反思正文',pr.growth)}`,b('保存我的选择','edit-save','','primary')+b('回我的懂我卡','card',`data-id="${r.id}"`));
    $('#report-source').value=report?.source?.includes('示例')?'sample':'self';$('#report-preference').value=report?.preference||'';
    const hint=()=>{$('#preference-hint').textContent=PREFERENCES.find(x=>x.id===$('#report-preference').value)?.hint||'暂不表达也可以完成全部核心体验。';};hint();$('#report-preference').onchange=hint;
  }
  function card(id) {
    const own=id===s().actor,r=own?me():publicPerson(s(),id);if(!r){toast('这份介绍暂未开放。');return;}
    const p=own?Object.fromEntries(Object.entries(r.profile).map(([k,v])=>[k,r.public[k]?v:''])):r.profile;
    const pr=own?privacy(r):r.privacy,pref=PREFERENCES.find(x=>x.id===(own?r.social?.report?.preference:r.report?.preference));
    const identity=IDENTITIES.find(x=>x.id===(own?r.social?.identity:r.identity));
    const reasons=own?[]:connectionReasons(s(),s().actor,id),pairing=livePair(s());
    const pending=s().requests.find(x=>x.from===s().actor&&x.to===id&&['pending','accepted','interested'].includes(x.status));
    const lit=social(s()).lights.some(x=>x.from===s().actor&&x.to===id);
    const phase=lesson(s()).phase,kind=activeVillage(s()).kind;
    let invitation=own?'':pairing?button('查看我的本轮协作任务','learn-pair',`data-id="${pairing.id}"`):kind==='public'?'<small>公共村可认识伙伴；课堂协作在活动村举行。</small>':phase===1||phase===2?button('邀请一起做协作任务','learn-invite',`data-id="${id}"`,'primary'):`<div class="notice">${phase===3?'本轮已进入复盘。下一轮开放发现伙伴后可以发起新任务。':'尚未开放发现伙伴。等待班主任统一开放。'}${mayManage(s())?button('去主持台调整课堂阶段','learn-teacher'):''}</div>`;
    show(`${r.name}的懂我卡`,'先认识一点，再决定怎样靠近。此处与小屋、完整册子读取同一份资料。',`<div class="readme-top"><span class="readme-avatar">${esc(r.name.slice(0,1))}</span><div><h1>${esc(r.name)}</h1><p>${esc(identity?.name||'一位正在被认识的森友')}</p></div></div>${own?'<p class="notice">这是我的公开预览。未公开内容只在本人编辑时显示。</p>':''}<p class="quote">${esc(p.headline||'更多故事，留在小屋慢慢聊。')}</p><div class="readme-tags">${String(p.traits||'').split(/[、，,]/).filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join('')}</div>${reasons.length?`<div class="lesson-connection">${esc(reasons[0].text)}<details><summary>更多连接点 · ${reasons.length} 条依据</summary>${reasons.map(x=>`<p>${esc(x.text)}<small>${esc(x.source)}</small></p>`).join('')}</details></div>`:''}<section class="social-section"><h2>最近想一起</h2><p>${esc(p.wish||'暂时没有公开心愿。')}</p>${!own&&p.wish&&!p.wish.includes('暂时')?b(pending?'查看心愿申请状态':'我也想做','wish',`data-id="${id}"`):''}</section><section class="social-section"><h2>从喜欢的事开始聊</h2><p>${esc(p.interests||'可以先问问对方。')}</p>${!own?b('找有共同兴趣的森友','matches','data-dimension="兴趣"'):''}${row('兴趣背后的小故事',p.story)}${!own?b(lit?'已点亮 · 再点撤回':'点亮 TA','light',`data-id="${id}" ${pr.light?'':'disabled'}`):''}</section><section class="social-section"><h2>最近在探索</h2><p>${esc(p.learning||'暂时没有公开。')}</p>${!own&&p.learning?b('给 TA 一条建议','advice',`data-id="${id}" ${pr.advice?'':'disabled'}`):''}</section>${row('和我一起做事',p.collaboration)}<details class="readme-deep"><summary>再多认识一点：经验、帮助与协作偏好</summary>${row('我愿意搭把手',p.help)}${EXTRA_FIELDS.map(([k,title])=>row(title,p[k])).join('')}${pref&&(own?pr.report:true)?row('我确认的协作起点',`${pref.name}。${pref.hint}`):'<p>主人未公开协作偏好；不从其他文字猜测 DISC 类型。</p>'}${pr.growth?row('我的成长种子',growthInfo(s(),id).stage):''}<small>只展示当前村公开内容；不展示原始报告、私人反思或成长记录正文。</small></details><div class="actions">${own?b('领取 / 更新我的村民卡','identity','','primary')+b('补充连接线索与公开设置','edit')+b('看我的成长种子','growth'):b('写一句适合 TA 的问候','greet',`data-id="${id}"`)+b('先看我们的合拍预览','preview',`data-id="${id}"`)}</div>`,own?b('查看我的森林消息','inbox'):invitation+button('沿路去他家坐坐','visit',`data-id="${id}"`,'primary'),'lesson-panel social-card-panel');
  }
  function matches(dimension='全部') {
    const rows=matchList(s(),{dimension});
    show('森林里的连接线索','只依据双方公开表达；无合拍百分比，不读取私密问题。',`<nav class="connect-filters">${['全部','兴趣','心愿','探索','协作偏好','工作','成长','困惑'].map(x=>b(x,'matches',`data-dimension="${x}"`,dimension===x?'primary':'')).join('')}</nav><p>${rows.length} 位有线索的森友 · 连接点多不代表关系更好</p>${rows.map(r=>`<section class="social-section"><h2>${esc(r.name)}</h2><p>${esc(r.reasons[0].text)}</p><details><summary>展开 ${r.reasons.length} 条具体依据</summary>${r.reasons.map(x=>row(x.dimension,x.text+' · '+x.source)).join('')}</details>${b('看看懂我卡','card',`data-id="${r.id}"`)}${b('看看我们如何配合','preview',`data-id="${r.id}"`)}</section>`).join('')||'<div class="notice">目前没有足够的公开线索，不硬凑推荐。可以补充自己的公开表达，或回公告栏自由认识其他森友。</div>'}`,b('补充我的连接线索','edit'));
  }
  function preview(id) {
    const d=previewData(s(),id);if(!d){toast('双方需完成表达并开放资料，才能看预览。');return;}
    show('如果我们一起做点事','单方阅读公开信息，不代表对方已同意建立关系。',`<h1>${esc(d.names.join(' × '))}</h1><p>不计算匹配率。先认识差异，再直接和对方确认。</p>${row('从这里开始聊',d.reasons.map(x=>x.text).join('；')||'暂未发现明确共同点，不代表不适合合作。')}<div class="readme-columns">${d.hints.map(x=>row(`${x.name}公开的小提醒`,x.text)).join('')}</div><section class="lesson-review"><h2>试着这样配合</h2><p>${esc(d.advice)}</p>${d.questions.map(q=>`<p>${esc(q)}</p>`).join('')}<small>依据：本人公开表达${d.sources.filter(Boolean).length?'；'+esc(d.sources.filter(Boolean).join(' / ')):''}。这不是专业双人报告。</small></section><p>建议先说清这次要做什么，再分别说一个需要被照顾的条件，最后约定时间与第一步。</p>`,b('带着这个话题问候 TA','greet',`data-id="${id}"`,'primary')+b('回懂我卡','card',`data-id="${id}"`));
  }
  function inboxHTML() {
    const data=social(s()),advice=data.advice.filter(x=>x.to===s().actor),lights=data.lights.filter(x=>x.to===s().actor),msgs=(lesson(s()).messages||[]).filter(x=>x.to===s().actor);
    return `<section class="social-section"><h2>森林里的新回应</h2><p>${lights.length} 次点亮 · ${advice.length} 条建议 · ${msgs.length} 句问候（本机记录）</p>${lights.map(x=>`<p>${esc(name(x.from))}点亮了你的介绍。</p>`).join('')}${advice.map(x=>row(x.anonymous?'一位森友的匿名建议':`${name(x.from)}给你的建议`,x.text)).join('')}${msgs.map(x=>row(`${name(x.from)}的问候`,x.text)).join('')}${!lights.length&&!advice.length&&!msgs.length?'<p>还没有回应。演示时可切换到另一位虚构居民，点亮或留言，再切回来查看。</p>':''}${b('调整我愿意接收的互动','edit')}</section>`;
  }
  function graphHTML(filter='全部') {
    const graph=classGraph(s());
    if(!graph.nodes.length)return '<div class="notice">至少 3 位居民完成表达、开放串门并主动允许进入地图后，才显示去标识关系图。演示准备会明确为虚构样本开启示例授权。</div>';
    const nodes=graph.nodes,edges=graph.edges.filter(e=>filter==='全部'||filter==='已合作'?filter==='全部'||e.paired:e.dimensions.includes(filter));
    const positions=Object.fromEntries(nodes.map((n,i)=>{const angle=i/nodes.length*Math.PI*2-Math.PI/2,r=nodes.length>20&&i%2?135:210;return [n.id,{x:360+Math.cos(angle)*r,y:265+Math.sin(angle)*r}];}));
    return `<nav class="connect-filters">${['全部','兴趣','心愿','探索','协作偏好','工作','成长','困惑','已合作'].map(x=>b(x,'graph',`data-dimension="${x}"`,filter===x?'primary':'')).join('')}</nav><p>${nodes.length} 位自愿参与 · ${edges.length} 条${filter==='已合作'?'已完成合作':'连接线索'} · 不展示私人理由或原始报告</p><p class="map-mobile-help">左右滑动查看关系图，也可展开下方文字清单。</p><div class="map-scroll" tabindex="0" aria-label="可横向滚动的关系图"><svg class="connection-map" viewBox="0 0 720 530" role="img" aria-label="班级合拍地图，节点是已授权居民，线条是公开连接线索"><rect width="720" height="530" rx="24" fill="#edf0e3"/>${edges.map(e=>`<line x1="${positions[e.a].x}" y1="${positions[e.a].y}" x2="${positions[e.b].x}" y2="${positions[e.b].y}" stroke="${e.paired?'#b66b42':'#9cba96'}" stroke-width="${e.paired?3:1.5}" opacity=".6"/>`).join('')}<text x="360" y="257" text-anchor="middle" fill="#456245" font-size="22">连接，从一点好奇开始</text><text x="360" y="284" text-anchor="middle" fill="#75816d" font-size="14">绿线：公开线索 · 棕线：完成合作</text>${nodes.map(n=>`<g><circle cx="${positions[n.id].x}" cy="${positions[n.id].y}" r="${nodes.length>20?13:24}" fill="#fffdf5" stroke="#77966c" stroke-width="2"/><text x="${positions[n.id].x}" y="${positions[n.id].y+5}" text-anchor="middle" font-size="12" fill="#344f3e">${esc(n.label.length>8?n.label.slice(0,7)+'…':n.label)}</text></g>`).join('')}</svg></div><details><summary>查看文字版连接清单（与图中筛选一致）</summary>${edges.map(e=>`<p>${esc(nodes.find(n=>n.id===e.a).label)} × ${esc(nodes.find(n=>n.id===e.b).label)}：${esc(e.dimensions.join('、'))}${e.paired?' · 已完成合作':''}</p>`).join('')||'<p>这个维度暂无连接，不代表没有合作可能。</p>'}</details><small>去标识图不是严格匿名统计，熟悉同学的人仍可能识别；参与者可关闭授权。示例居民不代表真实在线班级。</small>`;
  }
  function insightsHTML(){const d=classInsights(classSummary(s()));return `<section class="lesson-debrief"><h2>班级协同观察</h2>${d.observations.map(x=>`<p>${esc(x)}</p>`).join('')}<h3>带回课堂讨论</h3><ul>${d.questions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3>下一轮尝试</h3><p>${esc(d.experiment)}</p><small>基于本次选择的规则总结，不是 DISC 班级诊断，不评价能力或业绩。</small></section>`;}
  function growth(simulate=false) {
    const now=Date.now()+(simulate?7*86400000:0),g=growthInfo(s(),s().actor,now);
    show('成长林 · 我的种子与实践叶','私密记录跟着人走；不会自动变成公开标签或班主任数据。',`<div class="growth-banner"><span>${g.practices?'新叶':g.entries.length?'嫩芽':'种子'}</span><div><h1>${g.stage}</h1><p>${g.entries.length} 条共同约定 · ${g.practices} 次实践记录</p></div></div>${simulate?'<div class="notice">正在预览“一周后回来”的画面，未修改系统时间、未伪造实践，也没有设置自动推送。</div>':''}<p>${g.due?`有 ${g.due} 条约定可以回访：这周试过了吗？没试也可以如实记录。`:'先完成一次共同约定，再用实际经历慢慢观察自己。'}</p>${g.entries.map(e=>`<section class="social-section"><small>${esc(e.villageName)} · ${new Date(e.at).toLocaleDateString('zh-CN')} · ${e.simulated?'含虚构搭档':'本机记录'}</small><h2>${esc(e.scenario)}</h2><p>${esc(e.agreement)}</p><ol class="practice-timeline">${(e.practices||(e.practice?[e.practice]:[])).map(p=>`<li><small>${new Date(p.at).toLocaleString('zh-CN')}</small><p>${esc(p.text)}</p>${p.next?`<p>下次：${esc(p.next)}</p>`:''}</li>`).join('')}</ol><label class="field">这次尝试发生了什么？<textarea id="growth-text-${e.id}" maxlength="400" placeholder="具体的场景、我做了什么、对方怎样回应。也可以写还没试的原因。"></textarea></label><label class="field">我现在的感受<select id="growth-outcome-${e.id}"><option value="adjust">还要调整</option><option value="worked">这次有帮助</option><option value="not-yet">还没有尝试</option></select></label><label class="field">下一次想调整什么？<input id="growth-next-${e.id}" maxlength="180" placeholder="写一个小到能开始的动作"></label>${b('保存这一次实践','practice',`data-id="${e.id}"`,'primary')}</section>`).join('')||'<p class="notice">还没有约定。到教室完成一次协作；你的成长不是靠填写更多隐私换来的。</p>'}<section class="social-section"><h3>一个可选的小练习</h3><p>${g.practices?'回看上次记录：这次换一个沟通次序，观察对方的回应有什么不同。':'下一次有不同意见时，先问“你最担心的是什么”，再说自己的建议。'}</p><p>如果有新的认识，可以亲自修改协作说明；记录不会自动公开。</p></section>`,b('预览一周后的回访','growth-week')+b('用新认识更新我的协作说明','update-intro')+button('走到林间教室','learn-walk'));
  }
  async function exportIdentity() {
    const r=me(),id=IDENTITIES.find(x=>x.id===r.social?.identity)||IDENTITIES[0],fingerprint=proof();
    const c=document.createElement('canvas');c.width=1080;c.height=1680;const x=c.getContext('2d');
    x.fillStyle='#f9f5eb';x.fillRect(0,0,c.width,c.height);x.fillStyle='#567b4e';x.fillRect(0,0,1080,18);
    const text=(t,y,size=32,color='#344f3e')=>{x.fillStyle=color;x.font=`${size>=44?600:400} ${size}px "PingFang SC",sans-serif`;x.fillText(t,88,y);};
    const wrap=(value,y,size,max)=>{x.font=`400 ${size}px "PingFang SC",sans-serif`;let rows=[''];for(const ch of value){if(ch==='\n'||x.measureText(rows.at(-1)+ch).width>900)rows.push(ch==='\n'?'':ch);else rows[rows.length-1]+=ch;}rows.slice(0,max).forEach((t,i)=>text(t+(i===max-1&&rows.length>max?'…':''),y+i*(size+17),size));};
    text('蚂蚁森友会 / 我的村民卡',68,28);text(r.name.length>14?r.name.slice(0,13)+'…':r.name,151,56);text(id.name,214,38);
    const photo=takePhoto();x.save();x.beginPath();x.roundRect(88,255,904,603,20);x.clip();x.drawImage(photo,88,255,904,603);x.restore();
    wrap(introduction(r),924,28,5);
    text('我愿意带来的帮助',1190,24,'#77816e');wrap(r.public.help?r.profile.help:'更多故事，来小屋慢慢聊。',1238,26,2);
    text('与我协作的小提醒',1340,24,'#77816e');wrap(r.public.collaboration?r.profile.collaboration:'先问问彼此怎样交流更舒服。',1388,26,2);
    const url=new URL('./',location.href);url.search='entry=public&v=connections-v2';url.hash='';const qr=qrcode(0,'L');qr.addData(url.href);qr.make();const count=qr.getModuleCount(),unit=135/(count+8);x.fillStyle='#fff';x.fillRect(850,1495,135,135);x.fillStyle='#344f3e';for(let y=0;y<count;y++)for(let z=0;z<count;z++)if(qr.isDark(y,z))x.fillRect(850+(z+4)*unit,1495+(y+4)*unit,Math.ceil(unit),Math.ceil(unit));
    text('本人确认的公开表达 · 非人格评级',1540,22,'#77816e');text('扫码去公共村 · 不传输个人资料',1590,22,'#77816e');
    const result=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!result||fingerprint!==proof()){toast('资料变化了，请重新生成。');return;}
    show('我的村民卡 · 可以带走了','1080 × 1680 PNG · 只使用当前村公开资料。','<div id="identity-export"></div><p>电脑下载 PNG；手机点开原图长按保存，或使用系统分享。长内容节选，以预览为准，完整介绍仍在小屋。扫码进入公共村独立体验，不读取卡主人的私人资料。</p>',b('下载 PNG','download','','primary')+b('手机系统分享','system-share')+b('重新选一个表达方式','identity'));
    blob=result;pngURL=URL.createObjectURL(result);exportKey=fingerprint;$('#identity-export').innerHTML=`<a href="${pngURL}" target="_blank" rel="noopener"><img src="${pngURL}" alt="本人确认后的森林村民卡，点击打开原图"></a>`;
  }
  async function handle(action,d) {
    if(!action.startsWith('social-'))return false;
    const a=action.slice(7);
    try {
      if(a==='identity')identity();
      else if(a==='identity-preview')drawIdentity();
      else if(a==='identity-save'){if(commit({type:'social:identity',identity:$('[name="identity"]:checked')?.value,style:$('#intro-style').value}))await exportIdentity();}
      else if(a==='edit')edit();
      else if(a==='sample-report'){$('#report-source').value='sample';$('#report-preference').value='ideas';$('#report-confirm').checked=false;$('#report-preference').dispatchEvent(new Event('change'));toast('已带入虚构建议；可以修改，确认后才保存。');}
      else if(a==='edit-save'){
        const preference=$('#report-preference').value;
        if(preference&&!$('#report-confirm').checked){toast('请确认协作偏好，或选择暂不表达。');return true;}
        const profile=Object.fromEntries(EXTRA_FIELDS.map(([k])=>[k,$('#extra-'+k).value])),pub=Object.fromEntries(EXTRA_FIELDS.map(([k])=>[k,$('#public-'+k).checked]));
        const value=Object.fromEntries(['light','advice','anonymous','map','mapName','growth'].map(k=>[k,$('#privacy-'+k).checked]));
        if(commit({type:'social:settings',profile,public:pub,report:{clear:!preference,preference,source:$('#report-source').value,confirmed:$('#report-confirm').checked,public:$('#privacy-report').checked},value})){toast('已保存；个人资料各处同步，公开范围仅用于当前村。');card(s().actor);}
      }
      else if(a==='card')card(d.id);
      else if(a==='matches')matches(d.dimension);
      else if(a==='preview')preview(d.id);
      else if(a==='light'){if(commit({type:'social:light',to:d.id}))card(d.id);}
      else if(a==='wish'){
        const r=publicPerson(s(),d.id);if(!r?.profile.wish){toast('心愿暂未公开。');return true;}
        const req=s().requests.find(x=>x.from===s().actor&&x.to===d.id&&['pending','accepted','interested'].includes(x.status));
        show('这件事，我也想一起','表达兴趣不等于对方已经同意。',row(`${r.name}的心愿`,r.profile.wish)+(req?row('当前状态',({pending:'已申请，等待主人回应',accepted:'主人已同意',interested:'已表示感兴趣，等待回应'})[req.status]):'<p>主人会在礼物信箱看到。名额与申请限制沿用现有心愿规则，不需要先送礼。</p>'),req?b('回懂我卡','card',`data-id="${d.id}"`):b('确认表达意向','wish-send',`data-id="${d.id}"`,'primary'));
      }else if(a==='wish-send'){if(commit({type:'request',to:d.id})){toast('已送到主人的心愿信箱。');card(d.id);}}
      else if(a==='advice'){
        const r=publicPerson(s(),d.id);if(!r)return true;
        show('给一份具体的小建议','只给主人看；没有全村公开评论。',row(`${r.name}最近在探索`,r.profile.learning)+`<label class="field">有什么资源、经验或问题想送给 TA？<textarea id="social-advice" maxlength="250" placeholder="比如：我试过一个练习……如果你愿意，可以从这里开始。"></textarea></label>${r.privacy.anonymous?check('advice-anonymous','不在对方界面显示我的名字（仅本机演示）',false):'<small>主人只接收具名建议。</small>'}`,b('把建议留给 TA','advice-send',`data-id="${d.id}"`,'primary'));
      }else if(a==='advice-send'){if(commit({type:'social:advice',to:d.id,text:$('#social-advice').value,anonymous:!!$('#advice-anonymous')?.checked})){toast('建议已放进主人的森林消息，也可从礼物信箱查看。');card(d.id);}}
      else if(a==='greet')show('换一种更舒服的开场','依据公开协作提示整理，可以自由改写；不是 AI 读取私人报告。',`<label class="field">我的问候<textarea id="social-greeting" maxlength="180">${esc(greeting(s(),d.id).slice(0,180))}</textarea></label>`,b('留下这句问候','greet-send',`data-id="${d.id}"`,'primary'));
      else if(a==='greet-send'){if(commit({type:'class:message',to:d.id,text:$('#social-greeting').value})){toast('问候已保存到对方的本机森林消息。');card(d.id);}}
      else if(a==='inbox')show('我的森林消息','仅当前村本机互动，不是跨设备通知。',inboxHTML(),b('回我的懂我卡','card',`data-id="${s().actor}"`));
      else if(a==='graph'){if(!mayManage(s())){toast('班级地图由活动村主持人展示。');return true;}show('班级合拍地图','自愿公开的连接线索，不是人格关系诊断。',graphHTML(d.dimension),button('回教学主持台','learn-teacher'),'lesson-console lesson-projection');}
      else if(a==='growth'||a==='growth-week')growth(a==='growth-week');
      else if(a==='practice'){if(commit({type:'social:practice',id:d.id,text:document.getElementById('growth-text-'+d.id).value,next:document.getElementById('growth-next-'+d.id).value,outcome:document.getElementById('growth-outcome-'+d.id).value}))growth();}
      else if(a==='update-intro')show('把新的认识写回说明书','由你亲自改写，不自动引用或公开实践记录。',`<label class="field">和我一起做事，可以这样<textarea id="updated-collaboration" maxlength="600">${esc(me().profile.collaboration)}</textarea></label>${check('updated-public','在当前村公开这段话',me().public.collaboration)}`,b('确认更新这段公开表达','update-save','','primary'));
      else if(a==='update-save'){if(!$('#updated-collaboration').value.trim()){toast('可以写暂不公开，但不要留空。');return true;}if(commit({type:'profile',profile:{collaboration:$('#updated-collaboration').value},public:{collaboration:$('#updated-public').checked}})){toast('会客桌、懂我卡和册子已同步更新。');growth();}}
      else if(a==='assessment'){if(commit({type:'social:assessment',value:$('#assessment-state').value}))toast('已保存自报状态，非专业系统核验。');}
      else if(a==='download'||a==='system-share'){
        if(!pngURL||proof()!==exportKey){dispose();toast('资料变化了，请重新生成分享图。');return true;}
        if(a==='download'){const link=document.createElement('a');link.href=pngURL;link.download='森友会-我的村民卡.png';link.click();}
        else {const file=new File([blob],'森友会-我的村民卡.png',{type:'image/png'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'我的森林村民卡'});else toast('浏览器不支持系统文件分享，点击图片打开原图后长按保存。');}
      }
    }catch(e){if(e.name!=='AbortError')toast(e.message||'这一步未完成，请重试。');}
    return true;
  }
  return {handle,card,identity,edit,matches,preview,growth,graphHTML,insightsHTML,inboxHTML,dispose};
}
