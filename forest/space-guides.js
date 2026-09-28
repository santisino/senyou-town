export const GUIDES = {
  park: ['从一条心愿，找到想认识的人', ['看看有人想做什么','去主人家了解他','在心愿瓶表达兴趣'], '本次：本机虚构居民与申请流程。未来：接入真实班级成员、招募与通知。'],
  library: ['人分享什么，也在介绍自己', ['读一条实用的小经验','收藏，留给之后的自己','去分享者家认识他'], '本次：小林的一条示例笔记，收藏保存在本机。未来：居民推荐书架、自己的笔记与经验库；不是已接入的企业知识库。'],
  growth: ['让经历，变成对自己的新认识', ['带着问题去经历一次互动','回来写一个具体瞬间','自己决定是否修订介绍'], '本次：领取观察练习、私密回顾、本人确认后更新介绍。未来：真实活动回顾与本人可控的成长记录；不自动判断人格或表现。'],
  play: ['先共同经历，才有话可复盘', ['选择现场伙伴或模拟搭档','协商并布置一座共享花园','保存共同决定，再回顾配合'], '本次：线下两人共用一台设备记录，或使用明确标注的模拟搭档。未来：班级分组任务、不同角色资源和跨设备共同操作；目前不是实时双人联网。'],
  workshop: ['把一个人的点子，接着往下做', ['看看已有的拍照地点','选一处，贡献你的观察','在地图上留下署名，制作成果卡'], '本次：两条预置示例＋当前角色的本机贡献，形成地图与成果卡。未来：真实成员共编、照片上传、任务分工和版本记录；不假装多人实时提交。'],
  class: ['把愿意分享的经验，变成一次见面', ['看看谁愿意教点什么','报名，记下集合安排','在现场体验，再回顾'], '本次：示例活动报名与分享提纲，本机保存。未来：真实活动安排、报名通知和线下分享；本页不验证实际出席。'],
};
export const PHOTO_SPOTS=[
  ['park','公园树影',28,42],['library','图书馆窗边',24,22],['bridge','溪边小桥',51,57],['growth','成长林叶片',76,25],['workshop','工坊木墙',77,73],
];
export function gardenCheck(layout) {
  const flowers=layout.filter(x=>x===1).length,plants=layout.filter(x=>x===2).length;
  const path=[1,4,7].every(i=>layout[i]===0);
  return {flowers,plants,path,ok:flowers>=2&&flowers<=3&&plants>=1&&plants<=2&&path};
}
export function photoMap(state, actor, esc, button) {
  const own=state.publicResults[`${actor}:workshop`];
  const rows=[
    {who:'小林 · 预置示例',location:'park',contribution:'试试把树影留在画面里，不必把整棵树拍全。'},
    {who:'小禾 · 预置示例',location:'library',contribution:'慢慢走到窗边，看看同一束光落在书页上是什么样子。'},
    ...(own?[{who:state.residents.find(r=>r.id===actor).name+' · 我的贡献',location:own.location||'park',contribution:own.contribution}]:[]),
  ];
  return `<div class="photo-map" aria-label="共创拍照地图，示意位置"><span class="map-river"></span>${PHOTO_SPOTS.map(([id,title,x,y])=>`<button class="map-spot ${own?.location===id?'mine':''}" style="left:${x}%;top:${y}%" data-action="map-spot" data-location="${id}"><span>${id===own?.location?'●':'○'}</span>${esc(title)}</button>`).join('')}</div><small>这是任务示意地图。点一个地点，给它补上一条观察。</small><div class="map-contributions">${rows.map(r=>`<article class="result-row"><span class="eyebrow">${esc(r.who)}</span><h3>${esc(PHOTO_SPOTS.find(p=>p[0]===r.location)?.[1]||'我的地点')}</h3><p>${esc(r.contribution)}</p></article>`).join('')}</div>`;
}
