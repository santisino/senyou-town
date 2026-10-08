import { CARD_TYPES, LABELS, cardData, partners, makePairCard, respondCard, pairCardValid, canExportPair } from './share-data.js?v=connections-v2';
import { renderCard } from './share-render.js?v=connections-v2';

export function createSharing({ getState, getWorld, panel, button, esc, saveState, toast, commit }) {
  let session = null, imageURL = null, generation = 0;
  const $ = s => document.querySelector(s);
  function dispose() { generation++; if (imageURL) URL.revokeObjectURL(imageURL); imageURL = null; session = null; }
  const b = (text, action, data = '', cls = '') => button(text, 'share-' + action, data, cls);
  const getRecord = id => (getState().shareCards || []).find(c => c.id === id);
  function inboxHTML() {
    const s = getState(), cards = (s.shareCards || []).filter(c => c.data.people.some(p => p.id === s.actor));
    if (!cards.length) return '';
    return '<section class="section"><h3>同行明信片 · 公开确认</h3>' + cards.map(c => {
      const label = !pairCardValid(s, c) ? '资料已变化，请重新制作' : ({pending:'等待另一位森友确认',approved:'双方已同意',declined:'对方暂不公开'})[c.status];
      return `<div class="result-row"><strong>${esc(c.data.people.map(p=>p.name).join(' & '))}</strong><p>${esc(label)}</p>${b('查看这版明信片','review',`data-id="${c.id}"`)}</div>`;
    }).join('') + '</section>';
  }
  function studio() {
    dispose();
    panel('门前的留影相机', '带走一张森林明信片，不打断下一次探索。',
      `<p>先确认自己的介绍，再让小屋和故事一起走出森林。</p><div class="share-choices">${b('拍一张小屋明信片','open','data-kind="house"','primary')}${b('做我的森林个人名片','open','data-kind="profile"')}</div><p class="muted">心愿邀请在心愿瓶制作，同行卡在会客桌制作，共创成果在工坊制作。不会自动发布到任何地方。</p>${inboxHTML()}`);
  }
  function pairList() {
    dispose(); const s = getState(), list = partners(s);
    panel('会客桌上的同行明信片', '只邀请已经确认同行或成为森友的人。',
      `<p>连接成功不等于允许公开。你选定内容后，对方还要查看并确认这张卡。</p>${list.length ? list.map(r=>`<div class="result-row"><strong>${esc(r.name)}</strong>${b('邀请一起留影','open',`data-kind="pair" data-partner="${r.id}"`)}</div>`).join('') : '<div class="notice">还没有已确认的同行伙伴。先到别人的心愿瓶表达意向，或接受成为森友的邀请。</div>'}${inboxHTML()}`);
  }
  function open(kind, partner) {
    dispose();
    const data = cardData(getState(), kind, {partner});
    session = {kind, partner, data, blob:null, record:null};
    const spec = CARD_TYPES[kind], allowed = spec.fields.filter(k=>data.people.some(p=>p.fields[k]));
    panel(spec.name, '真实场景留影 · 1080 × 1440 PNG',
      `<div class="share-layout"><div class="share-settings"><p>只带上你愿意公开的内容。已隐藏的资料不会进入图片。</p><label class="field">这张卡想说的话（可不填）<textarea id="share-caption" maxlength="80" placeholder="${esc(spec.title)}"></textarea></label><fieldset class="share-fields"><legend>图片包含哪些介绍</legend><p class="muted">姓名／昵称、形象与村名会显示；可取消下列文字。</p>${allowed.map(k=>`<label class="checkline"><input type="checkbox" data-share-field="${k}" checked ${kind==='wish'?'disabled':''}>${esc(LABELS[k])}</label>`).join('') || '<p>本张卡不附加个人资料。</p>'}${kind==='work'?'<p>会显示已提交的贡献。搭档贡献明确标注为示例。</p>':''}</fieldset><label class="field">拍摄角度<select id="share-angle"><option value="front">温暖正面</option><option value="side">侧面留影</option></select></label>${b('生成预览','generate','','primary')}<label class="checkline share-consent"><input id="share-consent" type="checkbox">${kind==='pair'?'我同意公开本版内容，并邀请对方确认。':'我已查看图片，同意将其中内容保存为可转发的图片。'}</label><p class="muted">二维码仅进入通用 Demo，不是你的私人小屋。图片不会自动上传。</p></div><div class="share-preview"><div id="share-image" aria-live="polite">选择内容后，点击「生成预览」。</div><p id="share-status" role="status"></p></div></div>`,
      kind==='pair' ? b('邀请对方确认这版','request','','primary') : b('下载 PNG','download','','primary') + b('手机系统分享','native') + b('复制分享承接链接','copy-link'), 'wide share-panel');
    const copy=$('.share-settings .muted:last-child');
    if(copy)copy.textContent='二维码会进入蚂蚁森友村，保留本次分享类型。虚构居民可演示找到邀请人；你的自填资料不上传，跨设备将用小林的示例演示后续体验。不会加入原活动村。';
    updateButtons();
  }
  function options() {
    return { partner:session.partner, caption:$('#share-caption')?.value || '', angle:$('#share-angle')?.value || 'front',
      fields:[...document.querySelectorAll('[data-share-field]:checked')].map(x=>x.dataset.shareField), created:session.data.created };
  }
  function updateButtons() {
    const enabled = !!session?.blob && !!$('#share-consent')?.checked;
    for(const a of ['download','native','request','copy-link']) { const el=$(`[data-action="share-${a}"]`); if(el)el.disabled=!enabled; }
  }
  function invalidated() {
    if (!session || session.record) return;
    generation++; session.blob=null;
    if(imageURL)URL.revokeObjectURL(imageURL); imageURL=null;
    $('#share-image').textContent='内容已调整，请重新生成预览。';
    $('#share-consent').checked=false; updateButtons();
  }
  document.addEventListener('input', e=>{
    if(e.target.id==='share-consent')updateButtons();
    else if(e.target.id==='share-caption'||e.target.id==='share-angle'||e.target.dataset.shareField)invalidated();
  });
  async function generate() {
    if (!session) return;
    const target=session, n=++generation;
    if (!target.record) target.data=cardData(getState(),target.kind,options());
    $('#share-image').textContent='正在为这张明信片布光……';
    target.blob=null;updateButtons();
    try {
      const result=await renderCard(getWorld(),target.data);
      if(n!==generation||session!==target||!$('#share-image'))return;
      // Before both people agree, the preview is explicitly watermarked and never offered as a final export.
      if(target.kind==='pair'&&!canExportPair(getState(),target.record && getRecord(target.record))) {
        const ctx=result.canvas.getContext('2d');ctx.save();ctx.translate(540,450);ctx.rotate(-.22);ctx.fillStyle='rgba(252,246,233,.9)';ctx.fillRect(-490,-45,980,95);ctx.font='600 36px sans-serif';ctx.textAlign='center';ctx.fillStyle='#84523b';ctx.fillText('待双方确认 · 仅供预览，请勿转发',0,14);ctx.restore();
        result.blob=await new Promise((resolve,reject)=>result.canvas.toBlob(v=>v?resolve(v):reject(new Error('无法生成预览')),'image/png'));
      }
      if(n!==generation||session!==target)return;
      if(imageURL)URL.revokeObjectURL(imageURL);
      imageURL=URL.createObjectURL(result.blob);target.blob=result.blob;
      $('#share-image').innerHTML=`<img src="${imageURL}" alt="${esc(CARD_TYPES[target.kind].name)}预览" width="1080" height="1440">`;
      $('#share-status').textContent=target.kind==='pair'&&!canExportPair(getState(),getRecord(target.record)) ? '等待双方确认。此预览带有水印，不能下载正式卡。' : '图片已生成。手机可长按图片，使用浏览器提供的保存选项；也可下载或系统分享。';
      updateButtons();
      commit?.({type:'net:shareCreated',kind:target.kind});
      if(matchMedia('(max-width:640px)').matches)$('#share-image').scrollIntoView({block:'start'});
    } catch(error) {
      if(n===generation&&session===target) {$('#share-image').textContent='图片没有生成，请重试。';$('#share-status').textContent=error.message;target.blob=null;updateButtons();}
    }
  }
  function review(id) {
    dispose(); const s=getState(), card=getRecord(id);
    if(!card || !card.data.people.some(p=>p.id===s.actor)) throw new Error('找不到这张明信片。');
    if(!pairCardValid(s,card)) {panel('这张明信片需要重新制作','资料、公开范围或连接状态发生了变化。','<p>旧版不再提供预览或下载，请回会客桌用当前资料发起新的确认。已被他人保存的图片无法远程收回。</p>');return;}
    session={kind:'pair',data:card.data,record:id,blob:null};
    const canRespond=card.status==='pending'&&!card.approved.includes(s.actor);
    panel('查看同行明信片',card.status==='approved'?'双方已同意本版内容':'本机角色模拟确认 · 不会发给真实账号',
      `<div class="share-review"><div id="share-image" aria-live="polite"></div><p id="share-status" role="status"></p><p>这版包含：${esc(card.data.people.map(p=>p.name).join('、'))}的姓名与形象${card.data.fields.includes('collaboration')?'，以及已公开的协作介绍':''}。${esc(card.data.caption)}</p>${card.status==='approved'?'<label class="checkline"><input id="share-consent" type="checkbox">我已查看图片，确认保存本版。</label>':'<p>只有双方都同意，才能导出没有水印的正式卡。</p>'}</div>`,
      canRespond ? b('同意公开这版','approve',`data-id="${id}"`,'primary')+b('暂不公开','decline',`data-id="${id}"`) : card.status==='approved'?b('下载 PNG','download','','primary')+b('手机系统分享','native'): '', 'wide share-panel');
    generate();
  }
  function exportFile() {
    if(!session?.blob || !$('#share-consent')?.checked)throw new Error('请先生成并确认图片。');
    if(session.kind==='pair'&&!canExportPair(getState(),getRecord(session.record)))throw new Error('需要双方确认当前版本后才能导出。');
    if(session.kind!=='pair' && JSON.stringify(cardData(getState(),session.kind,options()))!==JSON.stringify(session.data))throw new Error('资料已变化，请重新生成图片。');
    const filename=`森友会-${session.data.people.map(p=>p.name).join('与')}-${CARD_TYPES[session.kind].name}.png`.replace(/[\\/:*?"<>|]/g,'-');
    return new File([session.blob],filename,{type:'image/png'});
  }
  async function handle(action,d) {
    if(!action.startsWith('share-'))return false;
    try {
      switch(action) {
        case 'share-open':open(d.kind,d.partner);break;
        case 'share-generate':await generate();break;
        case 'share-review':review(d.id);break;
        case 'share-pairs':pairList();break;
        case 'share-request': {
          if(!session?.blob||!$('#share-consent')?.checked)throw new Error('请先生成并确认预览。');
          const {next,record}=makePairCard(getState(),options());
          if(saveState(next)){review(record.id);toast('邀请已留在对方信箱。演示时切换对方角色，查看并回应。');}break;
        }
        case 'share-approve':case 'share-decline':
          if(!session?.blob)throw new Error('请等图片生成，查看后再确认。');
          if(saveState(respondCard(getState(),d.id,action==='share-approve')))review(d.id);break;
        case 'share-download': {
          const file=exportFile(), link=document.createElement('a'), url=URL.createObjectURL(file);link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('已请求保存 PNG。手机若没有下载提示，可长按预览图保存。');break;
        }
        case 'share-native': {
          const file=exportFile();
          if(!navigator.canShare?.({files:[file]})||!navigator.share){$('#share-status').textContent='当前浏览器不支持系统文件分享。请下载 PNG，或长按上方图片保存后转发。';break;}
          try {await navigator.share({files:[file],title:CARD_TYPES[session.kind].name});}
          catch(e){if(e.name==='AbortError')toast('已取消分享，图片仍在这里。');else $('#share-status').textContent='系统分享未完成。请下载图片，或长按上方图片保存。';}break;
        }
        case 'share-copy-link': {
          exportFile();
          try{await navigator.clipboard.writeText(session.data.entryUrl);toast('分享承接链接已复制。');}
          catch{$('#share-status').textContent='请复制链接：'+session.data.entryUrl;}
          break;
        }
      }
    } catch(error) {toast(error.message);}
    return true;
  }
  return {studio,pairList,inboxHTML,handle,dispose};
}
