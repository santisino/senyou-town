import { lesson, PHASES, SCENARIO, livePair, pairView, review, recommendations, cardProfile, classSummary, shareData, shareApprovals, journal } from './lesson-data.js?v=classroom-v1';
import { activeVillage, mayManage, PUBLIC_VILLAGE, ACTIVITY_VILLAGE, joined } from './villages.js?v=villages-v1';
import qrcode from '../vendor/qrcode.mjs';

export function createLessonUI(ctx) {
  const {getState:s,commit,panel,button,esc,toast,close,walkSpace,walkHome,travel}=ctx;
  const $=q=>document.querySelector(q),me=()=>s().residents.find(r=>r.id===s().actor);
  const b=(text,action,data='',cls='')=>button(text,'learn-'+action,data,cls);
  let tab=0,posterURL=null,posterPair=null,posterFingerprint=null,posterBlob=null;
  const label=id=>s().residents.find(r=>r.id===id)?.name||'森友';
  const disclaimer='<p class="lesson-disclaimer">本机模拟 · 数据保存在当前浏览器；不同手机不会同步。示例报告与搭档响应不代表真实测评或真人操作。</p>';
  const phaseCopy=[
    ['先把自己带进森林','完成个人表达，确认愿意公开的内容。','开放发现伙伴'],
    ['发现一个具体的连接理由','去公告栏看懂我卡，走进小屋，再邀请一位伙伴。','发布协作任务'],
    ['先各自选择，再一起商量','没有人格标准答案。先说明你在意什么，再留下双方认可的约定。','进入共同复盘'],
    ['把一次配合，变成下一次的起点','回顾真实选择与共同约定。课后在成长林记下一次实际尝试。','查看班级大屏'],
  ];
  function dispose(){if(posterURL)URL.revokeObjectURL(posterURL);posterURL=posterBlob=posterPair=posterFingerprint=null;}
  function show(title,sub,body,foot='',cls='lesson-panel') {dispose();panel(title,sub,body,foot,cls);}
  function progressTable() {
    const rows=s().residents.filter(r=>r.membership==='joined');
    return `<section class="lesson-roster"><div class="lesson-section-head"><h3>本村参与进度</h3><small>${rows.filter(r=>r.simulated).length} 位虚构居民示例 · 非测评完成率</small></div><div class="lesson-table-scroll"><table><thead><tr><th>森友</th><th>个人表达</th><th>协作任务</th><th>分享授权</th></tr></thead><tbody>${rows.map(r=>{const p=livePair(s(),r.id);return `<tr><td>${esc(r.name)}${r.simulated?' <small>示例</small>':''}</td><td>${r.confirmed?'已确认':'准备中'}</td><td>${p?({pending:'待回应',accepted:'进行中',completed:'共同确认'})[p.status]:'未开始'}</td><td>${p?.shareConsent[r.id]?'已作选择':'未授权'}</td></tr>`;}).join('')}</tbody></table></div></section>`;
  }
  function teacher(index=tab) {
    tab=Number(index)||0;
    if(activeVillage(s()).kind==='public'){
      show('教学主持台','公共村长期开放，课堂进度属于各自的活动村。','<p>公共村保留课后去处，不替所有居民设置上课阶段。回到百蚂活动村，再组织这一堂课。</p>',b('回到百蚂村的主持台','activity','','primary'));return;
    }
    if(!mayManage(s())){
      show('以班主任视角演示','仅切换本地演示身份，不是真实账号权限。','<p>教学主持台负责课堂阶段、准备进度与匿名汇总，不读取个人原始报告、反思或隐藏资料。</p>',b('选择活动村长演示身份','authorize','','primary'));return;
    }
    const l=lesson(s()),copy=phaseCopy[l.phase];
    const rail=`<ol class="lesson-rail">${PHASES.map((name,i)=>`<li class="${l.phase===i?'current':i<l.phase?'passed':''}"><span>${i+1}</span><strong>${name}</strong></li>`).join('')}</ol>`;
    let body='';
    if(tab===0)body=`<h1>让一次协作，成为认识彼此的开始</h1><p class="lesson-subtitle">准备 → 发现伙伴 → 协作任务 → 共同复盘</p>${rail}<div class="lesson-stage-layout"><section class="lesson-current"><h2>${copy[0]}</h2><p>${copy[1]}</p><div class="actions">${l.phase<3?b(copy[2],'phase',`data-phase="${l.phase+1}"`,'primary'):b(copy[2],'screen','','primary')}${b('走到林间教室','walk')}</div></section><aside class="lesson-tips"><h3>给班主任的话</h3><ol><li><strong>邀请大家先探索</strong><span>让每位同学找到自己的节奏。</span></li><li><strong>提醒本人确认公开范围</strong><span>不愿公开，也能完成个人表达。</span></li><li><strong>不展示隐藏资料</strong><span>复盘行为，不给人格或能力排名。</span></li></ol></aside></div>${progressTable()}`;
    if(tab===1)body=`<h1>看参与进度，不看私人答案</h1><p class="lesson-subtitle">提交选择只显示“进行中”；个人理由与反思不进入主持台。</p>${progressTable()}<div class="lesson-teacher-help"><h3>现场引导顺序</h3><ol><li>尚未完成表达：提醒回到自己的小屋，逐件探索。</li><li>尚未找到伙伴：去森友公告栏看看共同兴趣。</li><li>双方都已作答：请先互相解释理由，再形成约定。</li></ol></div>`;
    if(tab===2)body=screenBody();
    if(tab===3)body=`<h1>一堂课的演示手册</h1><p class="lesson-subtitle">真实本地交互 + 明示的虚构样本。无需后台或真实报告接口。</p><ol class="lesson-demo-steps"><li><strong>准备样本</strong><p>安置虚构居民，不改写你的个人资料。不会清除已有课堂记录。</p>${b('准备虚构居民小屋','seed','','primary')}</li><li><strong>切换学员视角</strong><p>作为小禾走到公告栏，找到小林，再去小屋认识他。角色切换仅用于演示。</p>${b('作为小禾走到公告栏','actor','data-id="he"')}</li><li><strong>发布任务</strong><p>回主持台，推进到协作任务阶段。受邀人、双方作答与海报授权均可单独演示。</p></li><li><strong>预览班级结果</strong><p>可单独生成两组虚构结果及示例投屏授权，跳过已有任务和被接管的示例角色。不会伪造真实员工数据。</p>${b('生成两组虚构课堂结果','sample')}</li></ol><div class="notice">正式课堂的真实登录、专业报告接口、多人同步与持久后台由蚂蚁技术团队实现。本次不提供合拍分数、人格排名或能力判断。</div><div class="actions">${b('开始新一轮课堂','reset-check')}</div>`;
    show('森友会 / 百蚂合拍局','',`<div class="lesson-workspace"><aside class="lesson-sidebar"><h2>教学主持台</h2><nav>${['课堂进程','参与进度','班级大屏','演示说明'].map((t,i)=>b(t,'tab',`data-tab="${i}" aria-current="${i===tab?'page':'false'}"`,i===tab?'selected':'')).join('')}</nav><small>本机模拟 · 非实时班级</small></aside><main class="lesson-main">${body}${disclaimer}</main></div>`,'','lesson-console');
    $('.panel-head .close').textContent='返回森林';
  }
  function screenBody() {
    const x=classSummary(s());
    return `<div class="lesson-section-head"><h1>这一次，我们怎样一起做事</h1>${b('打开投屏视图','screen')}</div><p class="lesson-subtitle">${esc(s().village.name)} · ${PHASES[lesson(s()).phase]} · 只看这次任务，不推断人格与能力</p><div class="lesson-screen-stats"><div><strong>${x.ready}<small> / ${x.joined}</small></strong><span>已确认个人表达</span></div><div><strong>${x.pairs}</strong><span>本轮任务小组</span></div><div><strong>${x.completed}</strong><span>双方确认的约定</span></div></div><section class="lesson-chart"><h2>面对同一个情境，我们先关注什么？</h2><p>${x.anonymous?`仅汇总 ${x.voted} 份主动授权的本机选择。${x.sampleCount?'包含虚构示例，不代表真实班级。':''}`:'至少 3 位参与者提交选择并主动授权后，才显示匿名分布。不显示姓名或个人理由。'}</p>${x.distribution.map(v=>`<div class="lesson-bar"><span>${v.title}</span><div><i style="width:${x.anonymous?v.count/x.voted*100:0}%"></i></div><b>${x.anonymous?v.count+' 人':'—'}</b></div>`).join('')}</section><section class="lesson-debrief"><h3>把图表变成一次讨论</h3><ol><li>你当时最希望保护什么？</li><li>听完对方的理由，哪一点改变了你的理解？</li><li>下次遇到类似情况，你们准备怎样配合？</li></ol><p>选择只是当下情境的回答。分布不是测评，不代表班级优势、能力高下或未来业绩。</p></section>`;
  }
  function screen(){if(!mayManage(s())){teacher();return;}show('百蚂合拍局 · 班级大屏','匿名汇总 / 本机演示',screenBody()+disclaimer,b('回教学主持台','tab','data-tab="0"'),'lesson-console lesson-projection');}
  function classroom() {
    const l=lesson(s()),p=livePair(s());
    if(activeVillage(s()).kind==='public'){
      show('公共村 · 林间教室','课堂属于各自的活动村；课后探索可以延续。','<h1>把收获带回来，<br>把新的好奇留下来。</h1><p>在活动村完成的共同约定，保留在你自己的成长叶里。公共村不会继承课堂的配对、投屏授权和私人理由。</p><p>这轮先演示跨村保留与私密回顾；开放课程、长期学习活动和真实同事共学，由后续版本接入。</p>',b('翻开我的课后成长叶','journal','','primary')+b('回百蚂村看课堂','activity'));return;
    }
    if(!joined(s())){show('林间教室','先认识村长，再决定加入。','<p>教室里的协作任务属于当前村庄。加入之前，不会展示居民名单与课堂记录。</p>',button('去找村长','net-mayor','','primary'));return;}
    const invites=l.messages.filter(m=>m.to===s().actor);
    show('百蚂村 · 合拍局','不是选出最像的人，而是学会接住不同的想法。',`<div class="lesson-intro"><span class="lesson-phase">${PHASES[l.phase]}</span><h1>一起做个决定，<br>再认识彼此一点。</h1><p>先各自表达，再互相解释。最后带走一条下次能用的协作约定。</p></div><div class="lesson-task-brief"><h3>${SCENARIO.title}</h3><p>${SCENARIO.story}</p><small>约 5 分钟任务 + 讨论与共同确认；无标准人格答案。</small></div>${!me().confirmed?'<div class="notice">先回自己的小屋完成说明书，并亲自确认公开范围。不使用报告也能参与。</div>':''}${l.phase===0?'<p>班主任还在准备课堂。现在可以记录一个想探索的问题，再回森林走走。</p>':''}<label class="field">这次我想更了解自己的哪一点？<textarea id="lesson-goal" maxlength="180" placeholder="比如：面对不同意见，我怎样表达自己的担心？">${esc(l.goals[s().actor]||'')}</textarea></label>${b('保存我的课前问题','goal')}<label class="lesson-consent"><input id="lesson-screen-consent" type="checkbox" ${l.screenConsent[s().actor]?'checked':''}>允许把本次选择计入本村匿名课堂分布（不含理由，可随时取消）</label>${b('保存投屏选择','screen-consent')}${invites.length?`<details><summary>收到 ${invites.length} 句森林问候</summary>${invites.map(m=>`<section><strong>${esc(label(m.from))}</strong><p>${esc(m.text)}</p></section>`).join('')}</details>`:''}`,`${p?b('查看我的协作任务','pair',`data-id="${p.id}"`,'primary'):l.phase>0&&me().confirmed?b('走到公告栏找伙伴','discover','','primary'):b('回小屋继续探索','own','','primary')}${b('我的课后成长叶','journal')}`);
  }
  function card(id) {
    const r=cardProfile(s(),id);if(!r){toast('这份介绍暂未对你开放。');return;}
    const p=r.profile,reason=recommendations(s()).find(x=>x.id===id);
    const row=(title,text)=>text?`<section class="readme-section"><h3>${title}</h3><p>${esc(text)}</p></section>`:'';
    show(`${r.name}的懂我卡`,'读取同一份已确认资料：门牌、小屋物件和《小屋里的我》同步。',`<div class="readme-top"><span class="readme-avatar">${esc(r.name.slice(0,1))}</span><div><h1>${esc(r.name)}</h1><p>${esc(p.headline||'主人把更多故事留在了小屋里。')}</p></div></div>${reason?`<div class="lesson-connection">${esc(reason.reasons[0])}<small>依据双方已公开的表达 · 规则推荐，非 AI 测评</small></div>`:''}<div class="readme-tags">${p.traits.split(/[、，,]/).filter(Boolean).slice(0,5).map(t=>`<span>${esc(t)}</span>`).join('')}</div>${row('最近想一起',p.wish)}${row('这样沟通更舒服',p.collaboration)}<div class="readme-columns">${row('我喜欢',p.interests)}${row('最近在探索',p.learning)}</div><details class="readme-deep"><summary>再多认识一点</summary>${row('兴趣背后的故事',p.story)}${row('我愿意搭把手',p.help)}<p class="muted">私人报告、原始回答与反思不会出现在这里。去小屋阅读完整册子，也只会看到主人公开的内容。</p></details><div class="actions">${b('写一句问候','greet',`data-id="${r.id}"`)}${lesson(s()).phase>0&&lesson(s()).phase<3&&r.id!==s().actor?b('邀请一起做协作任务','invite',`data-id="${r.id}"`):''}</div>`,button('沿路去他家坐坐','visit',`data-id="${r.id}"`,'primary'));
  }
  function recommendHTML() {
    const rec=recommendations(s());return rec.length?`<section class="lesson-recommend"><h3>从一个共同点开始</h3><p>按本村已公开的兴趣、心愿与探索内容找连接点，不计算人格合拍分数。</p>${rec.map(r=>`<div><strong>${esc(r.name)}</strong><span>${esc(r.reasons[0])}</span>${b('看看懂我卡','card',`data-id="${r.id}"`)}</div>`).join('')}</section>`:'';
  }
  function pair(id=livePair(s())?.id) {
    const p=pairView(s(),id);if(!p){walkSpace('class');return;}
    const other=p.members.find(x=>x!==s().actor),sample=s().residents.find(r=>r.id===other)?.simulated;
    let body=`<p class="lesson-pair-names">${esc(label(s().actor))}<span>和</span>${esc(label(other))}</p>`,foot='';
    if(p.status==='pending'){
      body+=`<h2>邀请从一句“愿意吗”开始</h2><p>一起体验「${SCENARIO.title}」。接受邀请不等于公开报告、联系方式或双人海报。</p>`;
      foot=p.members[1]===s().actor?b('这次先不了','reply',`data-id="${id}"`)+b('接受邀请','reply',`data-id="${id}" data-accept="yes"`,'primary'):b('撤回邀请','withdraw',`data-id="${id}"`);
      if(sample&&p.members[0]===s().actor)body+=simulate(id,'accept','模拟搭档接受邀请');
    } else if(['declined','withdrawn'].includes(p.status))body+='<p>这次邀请已结束。可以继续探索，或认识另一位伙伴。</p>';
    else {
      body+=`<section class="lesson-task-brief"><h2>${SCENARIO.title}</h2><p>${SCENARIO.story}</p></section>`;
      const own=p.choices[s().actor],both=p.members.every(x=>p.choices[x]);
      if(!own){
        body+=`<p>先独立选择。你的理由只会在双方都提交后展示给搭档，不进入班主任看板。</p><fieldset class="lesson-options"><legend>你会先怎么做？</legend>${SCENARIO.choices.map(o=>`<label><input type="radio" name="lesson-choice" value="${o.id}"><span><strong>${o.title}</strong><small>${o.detail}</small></span></label>`).join('')}</fieldset><label class="field">我最在意的是（可不填）<textarea id="lesson-reason" maxlength="180" placeholder="说说你希望保护的事，不需要证明自己是对的。"></textarea></label>`;
        foot=b('提交我的选择','choose',`data-id="${id}" ${lesson(s()).phase!==2?'disabled':''}`,'primary');
        if(lesson(s()).phase!==2)body+='<p class="notice">等待班主任发布协作任务，再提交选择。</p>';
      }else if(!both)body+='<div class="notice">你的选择已保存。等待搭档提交后，再一起看彼此的理由。</div>';
      if(sample&&!p.choices[other]&&lesson(s()).phase===2)body+=simulate(id,'choice','模拟搭档独立作答');
      if(both){
        const r=review(p);
        body+=`<section class="lesson-review"><h2>${r.headline}</h2><div class="lesson-two-choices">${p.members.map(pid=>`<article><h3>${esc(label(pid))}</h3><strong>${esc(SCENARIO.choices.find(o=>o.id===p.choices[pid].id).title)}</strong><p>${esc(p.choices[pid].reason||'没有补充理由，可以当面聊聊。')}</p></article>`).join('')}</div><h3>先听听彼此最在意什么</h3><p>${r.suggestion}</p><ul>${[...new Set(r.questions)].map(t=>`<li>${t}</li>`).join('')}</ul><small>根据本次选择生成的讨论提示，不是 DISC 分数、人格结论或关系诊断。</small></section><label class="field">我们下一次可以这样配合<textarea id="lesson-agreement" maxlength="300" placeholder="谁先做什么？什么时候同步？遇到什么情况再一起决定？">${esc(p.agreement)}</textarea></label>${b('保存约定草稿','agreement',`data-id="${id}"`)}<p>修改草稿后，双方需要重新确认与授权分享。</p>`;
        if(p.agreement){
          body+=`<div class="lesson-signatures">${p.members.map(pid=>`<span>${esc(label(pid))} · ${p.signatures[pid]?'已确认':'待确认'}</span>`).join('')}</div>`;
          if(!p.signatures[s().actor])body+=b('我认可这条约定','sign',`data-id="${id}"`,'primary');
          if(sample&&!p.signatures[other])body+=simulate(id,'sign','模拟搭档确认约定');
        }
        if(p.status==='completed'){
          const approvals=shareApprovals(s(),p);
          body+=`<div class="lesson-signatures" aria-label="当前版本的分享授权">${p.members.map(pid=>`<span>${esc(label(pid))} · ${approvals[pid]?'已授权当前版分享':'尚未授权当前版分享'}</span>`).join('')}</div>`;
          body+=`<section class="lesson-complete"><h3>一条共同约定，已经留下。</h3><p>它已进入各自的私密成长叶。是否分享这次经历，还需要双方分别决定。</p>${b('同意分享当前这版双人卡','share-consent',`data-id="${id}" data-allow="yes"`)}${b('撤回我的分享授权','share-consent',`data-id="${id}"`)}${sample?simulate(id,'share','模拟搭档同意分享当前版'):''}<div class="actions">${b('预览协作成果卡','poster',`data-id="${id}" ${shareData(s(),id)?'':'disabled'}`,'primary')}${b('我的课后成长叶','journal')}</div><small>仅双方都授权当前内容后才能生成。已保存到设备的图片不能远程收回。</small></section>`;
        }
      }
    }
    show('一次协作，一点新认识','真实本地步骤；示例搭档响应须主动触发。',body,foot+b('回到教室','classroom'));
  }
  const simulate=(id,step,label)=>`<div class="lesson-simulation"><small>演示专用 · 对方是虚构居民</small>${b(label,'simulate',`data-id="${id}" data-step="${step}"`)}</div>`;
  function growth() {
    const entries=journal(s());
    show('我的课后成长叶','跟着人保留；不自动公开给公共村、班主任或其他居民。',`<h1>把一次约定，带回日常。</h1><p>不是打卡越多就成长越多。记下一个真实尝试，也可以记下没有奏效的地方。</p>${entries.length?entries.map(e=>`<section class="lesson-journal"><small>${esc(e.villageName)} · ${e.simulated?'含模拟搭档的演示记录':'本机记录'}</small><h3>${esc(e.scenario)}</h3><p>${esc(e.agreement)}</p><label class="field">后来，我试了什么？<textarea id="practice-${esc(e.id)}" maxlength="400" placeholder="什么时候试了这条约定？发生了什么？下次想怎样调整？">${esc(e.practice?.text||'')}</textarea></label>${b('保存这片实践叶','practice',`data-id="${e.id}"`)}</section>`).join(''):'<div class="notice">还没有共同确认的约定。先到林间教室，和伙伴完成一次协作。</div>'}<div class="notice">个人反思保持私密。若想写进个人说明书，请回自己的小屋亲自修改和确认，不会自动同步为公开介绍。</div>`,b('走到林间教室','walk')+b('去蚂蚁森友村继续探索','public','','primary'));
  }
  async function poster(id) {
    const data=shareData(s(),id);if(!data){toast('双方需确认约定，并授权当前这版内容。');return;}
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const c=canvas.getContext('2d');
    c.fillStyle='#f9f5eb';c.fillRect(0,0,1080,1440);c.fillStyle='#57814c';c.fillRect(0,0,1080,16);
    const text=(value,x,y,size=32,color='#344f3e')=>{c.fillStyle=color;c.font=`${size>=44?'600':'400'} ${size}px "PingFang SC", sans-serif`;c.fillText(value,x,y);};
    const wrap=(value,y,size=32,max=8)=>{c.font=`400 ${size}px "PingFang SC", sans-serif`;let rows=[''];for(const ch of value){if(ch==='\n'||c.measureText(rows.at(-1)+ch).width>880)rows.push(ch==='\n'?'':ch);else rows[rows.length-1]+=ch;}rows.slice(0,max).forEach((r,i)=>text(r+(i===max-1&&rows.length>max?'…':''),90,y+i*(size+18),size));return y+Math.min(rows.length,max)*(size+18);};
    text('森友会 / 百蚂合拍局',90,100,28);text('一起做个决定',90,205,65);text('也多认识彼此一点',90,285,52);
    wrap(data.names.map(n=>n.length>12?n.slice(0,12)+'…':n).join('  ×  '),380,40,2);
    text('面对同一个情境，我们的起点是',90,510,26,'#77816e');
    data.choices.forEach((v,i)=>text(v,90,575+i*54,34));
    const compact=data.agreement.replace(/\s+/g,' '),font=compact.length>180?24:32;
    const lines=Math.ceil(compact.length/(font===24?36:27));
    c.fillStyle='#e8eddf';c.fillRect(65,690,950,Math.min(510,160+lines*(font+18)));
    text('我们约定',90,750,30);wrap(compact,820,font,10);
    text(data.simulated?'虚构居民 / 模拟协作示例':'本机协作记录',90,1260,24,'#77816e');
    text('不含原始报告与私人理由 · 双方已授权当前内容',90,1305,22,'#77816e');
    const url=new URL('./',location.href);url.search='entry=public&v=classroom-v1';url.hash='';
    const qr=qrcode(0,'L');qr.addData(url.href);qr.make();const count=qr.getModuleCount(),sz=160/(count+8);c.fillStyle='#fff';c.fillRect(850,1220,160,160);c.fillStyle='#344f3e';for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x))c.fillRect(850+(x+4)*sz,1220+(y+4)*sz,Math.ceil(sz),Math.ceil(sz));
    text('扫码去公共村 · 各设备独立体验',90,1360,22,'#77816e');
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob||shareData(s(),id)?.fingerprint!==data.fingerprint){toast('资料或授权已变化，请重新预览。');return;}
    show('带走这次共同约定','1080 × 1440 PNG · 约定自动换行，长名字缩写，以预览为准。','<div id="lesson-poster"></div><p>电脑可下载；手机可打开图片长按保存，或使用系统分享。是否能保存到相册取决于浏览器。</p>',b('下载 PNG','download','','primary')+b('手机系统分享','system-share')+b('回到协作任务','pair',`data-id="${id}"`));
    posterURL=URL.createObjectURL(blob);posterBlob=blob;posterPair=id;posterFingerprint=data.fingerprint;
    $('#lesson-poster').innerHTML=`<a href="${posterURL}" target="_blank" rel="noopener" aria-label="打开原图，长按保存"><img src="${posterURL}" alt="双方授权后的协作成果分享卡"></a>`;
  }
  async function handle(action,d) {
    if(!action.startsWith('learn-'))return false;
    try {
      const type=action.slice(6);
      if(type==='teacher')teacher(0);
      else if(type==='authorize'){if(commit({type:'net:role',role:'activity'}))teacher(0);}
      else if(type==='activity'){if(commit({type:'net:switch',id:ACTIVITY_VILLAGE})){travel(false);teacher(0);}}
      else if(type==='tab')teacher(d.tab);
      else if(type==='phase'){if(commit({type:'class:admin:phase',phase:Number(d.phase)}))teacher(0);}
      else if(type==='seed'){if(commit({type:'prepareDemo'})){teacher(0);toast('只准备虚构居民，不填写你的资料。');}}
      else if(type==='sample'){if(commit({type:'class:admin:sample'}))teacher(2);}
      else if(type==='screen')screen();
      else if(type==='classroom')walkSpace('class');
      else if(type==='walk')walkSpace('class');
      else if(type==='own')walkHome(s().actor);
      else if(type==='discover')walkSpace('park');
      else if(type==='card')card(d.id);
      else if(type==='goal'){if(commit({type:'class:goal',value:$('#lesson-goal').value}))toast('课前问题已私密保存。');}
      else if(type==='screen-consent'){if(commit({type:'class:screen',allow:$('#lesson-screen-consent').checked}))toast('已保存本次投屏选择。');}
      else if(type==='invite'){if(commit({type:'class:invite',to:d.id}))pair();}
      else if(type==='pair')pair(d.id||undefined);
      else if(type==='reply'){if(commit({type:'class:reply',id:d.id,accept:d.accept==='yes'}))pair(d.id);}
      else if(type==='withdraw'){if(commit({type:'class:withdraw',id:d.id}))classroom();}
      else if(type==='choose'){if(commit({type:'class:choose',id:d.id,choice:$('[name="lesson-choice"]:checked')?.value,reason:$('#lesson-reason').value}))pair(d.id);}
      else if(type==='simulate'){if(commit({type:'class:simulate',id:d.id,step:d.step}))pair(d.id);}
      else if(type==='agreement'){if(commit({type:'class:agreement',id:d.id,text:$('#lesson-agreement').value}))pair(d.id);}
      else if(type==='sign'||type==='share-consent'){
        const p=pairView(s(),d.id),draft=$('#lesson-agreement')?.value.trim();
        if(draft!==undefined&&draft!==p?.agreement){toast('约定文字有修改，请先保存草稿，再确认或授权这一版。');return true;}
        if(commit(type==='sign'?{type:'class:sign',id:d.id}:{type:'class:share',id:d.id,allow:d.allow==='yes'}))pair(d.id);
      }
      else if(type==='journal')growth();
      else if(type==='practice'){if(commit({type:'class:practice',id:d.id,text:document.getElementById('practice-'+d.id).value}))toast('实践叶已私密保存，换村后仍在。');}
      else if(type==='public'){if(commit({type:'net:switch',id:PUBLIC_VILLAGE})){travel();toast(joined(s())?'已回到公共村。当前居民已加入；课堂记录和成长叶仍不自动公开。':'先找村长确认公共村加入与公开范围；成长叶不会自动公开。');}}
      else if(type==='greet'){
        const r=cardProfile(s(),d.id);if(!r){toast('这份资料暂未开放。');return true;}
        const hint=r.profile.collaboration;
        show('用自己的话打个招呼','建议来自对方公开的协作提示，可修改；不是 AI 读取私人报告。',`<p>${esc(hint||'对方暂未公开沟通偏好，先问问怎样交流更舒服。')}</p><label class="field">想对他说<textarea id="lesson-greeting" maxlength="180">${esc(`你好，${r.name}！${hint?'我看了你的相处提示，':'很高兴在森林遇见你，'}想听听你最近在探索的事，什么时候方便聊聊？`)}</textarea></label>`,b('留一句本机问候','message',`data-id="${d.id}"`,'primary'));
      }else if(type==='message'){if(commit({type:'class:message',to:d.id,text:$('#lesson-greeting').value})){toast('问候已保存在对方的本机教室收件记录，不是跨设备消息。');card(d.id);}}
      else if(type==='actor'){
        if(!s().residents.find(r=>r.id===d.id)?.simulated){toast('只能切换虚构演示居民。');return true;}
        if(commit({type:'switch',id:d.id})){travel();walkSpace('park');}
      }else if(type==='reset-check')show('开始新一轮课堂？','不会清除个人说明书或已完成的课后成长叶。','<p>将清除本村当前课堂邀请、选择、问候、投屏与分享授权，并回到准备阶段。请先保存需要的成果。</p>',b('取消','teacher')+b('确认新一轮','reset','','danger'));
      else if(type==='reset'){if(commit({type:'class:admin:reset',confirm:true}))teacher(0);}
      else if(type==='poster')await poster(d.id);
      else if(type==='download'||type==='system-share'){
        if(!posterURL||shareData(s(),posterPair)?.fingerprint!==posterFingerprint){dispose();toast('当前授权或资料已变化，请重新生成。');return true;}
        if(type==='system-share'){
          const file=new File([posterBlob],'森友会-协作成果卡.png',{type:'image/png'});
          if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'我们的协作约定'});}catch(e){if(e.name!=='AbortError')toast('系统分享未完成，可以打开图片长按保存。');}}
          else toast('此浏览器不支持文件分享。点击图片打开原图，长按保存，或下载 PNG。');
        }else{const a=document.createElement('a');a.href=posterURL;a.download='森友会-协作成果卡.png';a.click();}
      }
    }catch(e){toast(e.message||'这一步未完成，请重试。');}
    return true;
  }
  return {teacher,classroom,card,recommendHTML,handle,growth,dispose};
}
