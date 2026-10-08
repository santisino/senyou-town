import { activeVillage, joined, mayManage } from './villages.js?v=cognition-v2';

export const EXTRA_FIELDS = [
  ['workBackground','我的工作与经验','比如：产品运营，常常组织跨团队活动'],
  ['wantToLearn','我想向别人学什么','比如：摄影入门、把汇报讲得更清楚'],
  ['challenges','最近想和人讨论的困惑','比如：想法很多，怎样把优先级排清楚？'],
];
export const IDENTITIES = [
  {id:'explorer',name:'林间探索家',animal:'鹿',line:'让新的可能，在林间发生。'},
  {id:'spark',name:'灵感点灯人',animal:'狐',line:'一个念头，也能照亮一条路。'},
  {id:'anchor',name:'同行守望者',animal:'熊',line:'让一起出发的人，都被好好接住。'},
  {id:'weaver',name:'线索编织者',animal:'猫头鹰',line:'把散落的线索，织成可走的小径。'},
];
export const PREFERENCES = [
  {id:'action',name:'先试一小步',hint:'先说目标和可试的第一步，再约定风险边界。',question:'什么条件下先试？什么情况下停下来？'},
  {id:'ideas',name:'先交流想法',hint:'留一点碰想法的时间，结束后一起把结论写下来。',question:'想法聊到什么时候？怎样选出一个先做？'},
  {id:'steady',name:'先明确安排',hint:'提前说明计划与变化，约好彼此舒服的节奏。',question:'有哪些变化需要提前通知？谁来同步？'},
  {id:'detail',name:'先看信息依据',hint:'先给背景、材料和判断依据，再约时间讨论。',question:'需要哪些材料就足够决定，不必无限补充？'},
];
const person=(s,id=s.actor)=>s.residents.find(r=>r.id===id);
const tidy=(x,n=400)=>String(x??'').trim().slice(0,n);
const fail=m=>{throw new Error(m);};
const key=()=>crypto.randomUUID();
export const social=s=>activeVillage(s).social||{lights:[],advice:[],events:[]};
export const privacy=r=>({light:true,advice:true,anonymous:false,map:false,mapName:false,report:false,growth:false,...r?.socialPrivacy});
export function publicPerson(s,id) {
  const r=person(s,id);
  if(!r||!joined(s)||!joined(s,id)||!r.confirmed||s.stage!=='open')return null;
  if(!person(s)?.confirmed&&!mayManage(s))return null;
  const p=Object.fromEntries(Object.entries(r.profile).map(([k,v])=>[k,r.public[k]?String(v||''):'']));
  const pref=privacy(r);
  return {id:r.id,name:r.name,profile:p,simulated:!!r.simulated,privacy:pref,
    identity:r.social?.identity||'explorer',style:r.social?.style||'friendly',
    report:pref.report&&r.social?.report?.confirmed?r.social.report:null};
}
const TOPICS=[['摄影','拍照','树影'],['产品','需求'],['运营','活动'],['设计'],['写作','表达','汇报'],['编程','开发'],['读书','阅读'],['咖啡'],['散步','徒步'],['桌游'],['植物'],['烘焙'],['优先级','排序'],['沟通','跨团队'],['时间','安排'],['学习']];
const topics=value=>TOPICS.filter(xs=>xs.some(t=>{const text=String(value||''),at=text.indexOf(t);return at>=0&&!/不喜欢|不想|不愿|不考虑|讨厌/.test(text.slice(Math.max(0,at-6),at));})).map(xs=>xs[0]);
const overlap=(a,b)=>[...new Set([...topics(a).filter(t=>topics(b).includes(t)),...String(a||'').split(/[、，,；;\s]+/).filter(t=>t.length>1&&t.length<15&&!/暂时|没有|公开|不喜欢|不想|不愿|讨厌/.test(t)&&String(b||'').includes(t)&&!(/不喜欢|不想|不愿|讨厌/.test(String(b||''))))])].slice(0,3);
export function connectionReasons(s,a,b) {
  const x=publicPerson(s,a),y=publicPerson(s,b);if(!x||!y)return [];
  const p=x.profile,q=y.profile,rows=[];
  for(const [dim,k,label] of [['兴趣','interests','都喜欢'],['心愿','wish','都想围绕'],['探索','learning','都在探索'],['工作','workBackground','工作经验都涉及'],['困惑','challenges','都想聊聊']]){
    const common=overlap(p[k],q[k]);if(common.length)rows.push({dimension:dim,text:`${label}「${common.join('、')}」`,source:`双方公开的${dim}表达`});
  }
  const help=overlap(p.wantToLearn,q.help);if(help.length)rows.push({dimension:'成长',text:`你想学「${help.join('、')}」，${y.name}愿意提供相关帮助`,source:'你的公开学习需求 + 对方公开的帮助'});
  const reverse=overlap(p.help,q.wantToLearn);if(reverse.length)rows.push({dimension:'成长',text:`你愿意提供的「${reverse.join('、')}」经验，回应了${y.name}的学习需要`,source:'你的公开帮助 + 对方公开学习需求'});
  if(x.report&&y.report){const same=x.report.preference===y.report.preference;rows.push({dimension:'协作偏好',text:same?'你们确认了相近的协作起点，可以聊聊彼此需要的具体条件':'你们确认的协作起点不同，可以交换各自最在意的事',source:'双方主动公开并确认的偏好；示例不等于专业合拍结论'});}
  return rows;
}
export function matchList(s,{dimension='全部',personId=s.actor}={}) {
  return s.residents.filter(r=>r.id!==personId).map(r=>({id:r.id,name:r.name,reasons:connectionReasons(s,personId,r.id)}))
    .filter(r=>r.reasons.length&&(dimension==='全部'||r.reasons.some(x=>x.dimension===dimension)))
    .map(r=>({...r,reasons:dimension==='全部'?r.reasons:[...r.reasons].sort((a,b)=>Number(b.dimension===dimension)-Number(a.dimension===dimension))}))
    .sort((a,b)=>b.reasons.length-a.reasons.length||a.name.localeCompare(b.name));
}
export function previewData(s,id) {
  const a=publicPerson(s,s.actor),b=publicPerson(s,id);if(!a||!b||id===s.actor)return null;
  const ra=PREFERENCES.find(p=>p.id===a.report?.preference),rb=PREFERENCES.find(p=>p.id===b.report?.preference);
  const hints=[{name:a.name,text:a.profile.collaboration||'暂未公开，可以先询问怎样配合更舒服。'},
    {name:b.name,text:b.profile.collaboration||'暂未公开，可以先询问怎样配合更舒服。'}];
  return {names:[a.name,b.name],reasons:connectionReasons(s,a.id,b.id),hints,
    preferences:[ra,rb],sources:[a.report?.source,b.report?.source],
    advice:ra&&rb?(ra.id===rb.id?`你们都选择「${ra.name}」。相似不代表条件一致：${ra.question}`:`${a.name}倾向「${ra.name}」，${b.name}倾向「${rb.name}」。先各说一个必须被照顾的条件，再约定第一步。`):'目前不足以对比双方偏好。先交换公开提示，再直接询问对方；不从文字猜测人格。',
    questions:[...new Set([ra?.question,rb?.question].filter(Boolean))]};
}
export function introduction(r,style=r.social?.style||'friendly',{publicOnly=true}={}) {
  const p=Object.fromEntries(Object.entries(r.profile).map(([k,v])=>[k,!publicOnly||r.public[k]?tidy(v,160):'']));
  const interest=p.interests?`喜欢${p.interests}。`:'',help=p.help?`我愿意搭把手：${p.help}`:'';
  if(style==='brief')return [p.headline,interest,help].filter(Boolean).join('\n')||'我的故事，慢慢告诉你。';
  if(style==='invitation')return [`我是${r.name}。`,p.wish?`最近想一起：${p.wish}`:interest,p.collaboration?`一起做事时：${p.collaboration}`:'有好奇的事，欢迎来小屋聊聊。'].filter(Boolean).join('\n');
  return [`你好，我是${r.name}。`,p.headline,interest,p.learning?`最近在探索：${p.learning}`:''].filter(Boolean).join('\n');
}
export function growthInfo(s,id=s.actor,now=Date.now()) {
  const entries=s.network.learningJournal?.[id]||[],practices=entries.flatMap(e=>e.practices||(e.practice?[e.practice]:[]));
  return {stage:practices.length?'长出新叶':entries.length?'约定发芽':'一颗种子',entries,practices:practices.length,
    due:entries.filter(e=>now-e.at>=7*86400000&&!e.practices?.length&&!e.practice).length};
}
export function classGraph(s) {
  if(!mayManage(s)||s.stage!=='open')return {nodes:[],edges:[]};
  const people=s.residents.filter(r=>r.confirmed&&joined(s,r.id)&&privacy(r).map);
  if(people.length<3)return {nodes:[],edges:[],waiting:true};
  const nodes=people.map((r,i)=>({id:r.id,label:privacy(r).mapName?r.name:`森友 ${i+1}`,named:privacy(r).mapName,simulated:!!r.simulated}));
  const edges=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
    const a=nodes[i].id,b=nodes[j].id,reasons=connectionReasons(s,a,b);
    const paired=(activeVillage(s).lesson?.pairs||[]).some(p=>p.members.includes(a)&&p.members.includes(b)&&p.status==='completed');
    if(reasons.length||paired)edges.push({a,b,dimensions:[...new Set(reasons.map(r=>r.dimension))],paired});
  }
  return {nodes,edges};
}
export function classInsights(summary) {
  if(!summary.anonymous)return {observations:['有效授权选择不足 3 份，暂不生成班级观察。'],questions:['先邀请自愿参与，不为展示完整而替同学授权。'],experiment:'可以先用明确标注的虚构课堂结果演示。'};
  const ranked=[...summary.distribution].sort((a,b)=>b.count-a.count),top=ranked.filter(x=>x.count===ranked[0].count),nonzero=ranked.filter(x=>x.count);
  return {observations:[`${summary.voted} 份授权选择中，${top.map(x=>`「${x.title}」${x.count} 人`).join('、')}最常出现${top.length>1?'（并列）':''}。`,
    nonzero.length>1?`出现 ${nonzero.length} 种起点，需要给不同关注点留出表达时间。`:'目前可见的起点相近，仍需确认大家心里的具体条件是否一致。',
    `${summary.completed} / ${summary.pairs} 组已共同确认约定；这是参与记录，不是学习效果评分。`],
    questions:nonzero.map(x=>`选择「${x.title}」时，你最想保护什么？另一种起点能补充什么？`),
    experiment:nonzero.length>1?'下一轮交换主持与记录角色：先各说一条底线，再用 2 分钟写清负责人、检查条件和同步时间。':'下一轮请每组主动补充一个反例：什么情况下，你们会选择另一条路径？'};
}
export function greeting(s,id) {
  const r=publicPerson(s,id);if(!r)return '';
  const topic=connectionReasons(s,s.actor,id)[0]?.text||'想听听你最近在探索的事';
  const t=r.profile.collaboration,preference=r.report?.preference;
  const end=preference==='detail'||/文字|材料|依据/.test(t)?'我可以先发一段背景和想请教的问题，你方便时看完，我们再约时间。':
    preference==='steady'||/提前|安排|慢/.test(t)?'想先问问你方便的时间，我们约好再聊，不用马上回复。':
    preference==='action'||/目标|先试|结论/.test(t)?'我想先说清想做的目标，再约十分钟商量一个可以试的小步骤。':'想找个轻松的时间互相碰一碰想法，最后一起记下一个小结。';
  return `你好，${r.name}！${topic}。${end}`;
}
export function connectAction(s,a) {
  const v=activeVillage(s),r=person(s);if(!joined(s)||v.archived)fail('先加入开放中的村庄再操作。');
  v.social ||= {lights:[],advice:[],events:[]};const data=v.social;
  if(a.type!=='social:seed'){r.social ||= {};r.socialPrivacy ||= {};}
  if(a.type==='social:settings'){
    connectAction(s,{type:'social:profile',profile:a.profile,public:a.public});
    connectAction(s,{type:'social:report',...a.report});
    return connectAction(s,{type:'social:privacy',value:a.value});
  }
  if(a.type==='social:profile'){
    for(const [k] of EXTRA_FIELDS){if(a.profile?.[k]!==undefined)r.profile[k]=tidy(a.profile[k]);if(a.public?.[k]!==undefined)r.public[k]=!!a.public[k];}
    return s;
  }
  if(a.type==='social:identity'){
    if(!r.confirmed)fail('先确认个人说明书，再领取村民卡。');
    if(!IDENTITIES.some(x=>x.id===a.identity)||!['brief','friendly','invitation'].includes(a.style))fail('请选择有效的身份与文风。');
    r.social.identity=a.identity;r.social.style=a.style;r.social.identityConfirmed=true;return s;
  }
  if(a.type==='social:report'){
    if(a.clear){delete r.social.report;r.socialPrivacy.report=false;return s;}
    if(!a.confirmed||!PREFERENCES.some(x=>x.id===a.preference))fail('请亲自确认一种协作偏好，也可以不使用报告。');
    r.social.report={preference:a.preference,source:a.source==='sample'?'示例 DISC 建议，经本人确认':'本人自述，非测评',confirmed:true};
    r.socialPrivacy.report=!!a.public;return s;
  }
  if(a.type==='social:privacy'){
    for(const k of Object.keys(privacy(r)))if(a.value?.[k]!==undefined)r.socialPrivacy[k]=!!a.value[k];return s;
  }
  if(a.type==='social:seed'){
    if(!mayManage(s))fail('仅演示主持人可准备样本。');
    const rows={lin:['产品运营，跨团队活动','摄影入门','怎样排好想法的优先级','ideas','spark'],he:['设计，产品体验','产品运营','跨团队沟通怎样更清楚','detail','weaver'],ze:['开发，产品技术','汇报表达','怎样排好想法的优先级','action','explorer'],an:['运营，活动组织','摄影入门','跨团队沟通怎样更清楚','steady','anchor'],yu:['设计，内容表达','开发入门','工作与学习时间怎么安排','ideas','spark']};
    for(const p of s.residents.filter(x=>x.simulated&&!x.controlled&&x.confirmed&&!x.social?.seeded)){
      const row=rows[p.id]||rows.lin;
      EXTRA_FIELDS.forEach(([k],i)=>{if(p.profile[k]===undefined){p.profile[k]=row[i];p.public[k]=true;}});
      p.social={...p.social,seeded:true,assessment:'sample',identity:row[4],style:'friendly',identityConfirmed:true,report:{preference:row[3],source:'虚构居民的示例 DISC 建议',confirmed:true}};
      p.socialPrivacy={...privacy(p),map:true,mapName:false,report:true};
    }return s;
  }
  if(a.type==='social:assessment'){
    if(!['not-started','sample','self-reported','skip'].includes(a.value))fail('请选择有效状态。');
    r.social.assessment=a.value;return s;
  }
  if(a.type==='social:practice'){
    const e=(s.network.learningJournal?.[s.actor]||[]).find(x=>x.id===a.id);if(!e)fail('只能记录自己的实践。');
    const text=tidy(a.text);if(!text)fail('先写下这次发生了什么。');
    e.practices ||= e.practice?[e.practice]:[];
    if(e.practices.at(-1)?.text===text)return s;
    e.practices.push({id:key(),text,next:tidy(a.next,180),outcome:['worked','adjust','not-yet'].includes(a.outcome)?a.outcome:'adjust',at:Date.now()});return s;
  }
  const target=publicPerson(s,a.to);if(!target||a.to===s.actor)fail('这份介绍暂未开放，无法互动。');
  if(a.type==='social:light'){
    if(!target.privacy.light)fail('对方暂不接收点亮。');
    const existing=data.lights.find(x=>x.from===s.actor&&x.to===a.to);
    if(existing)data.lights=data.lights.filter(x=>x!==existing);else data.lights.push({id:key(),from:s.actor,to:a.to,at:Date.now()});return s;
  }
  if(a.type==='social:advice'){
    if(!target.privacy.advice||a.anonymous&&!target.privacy.anonymous)fail('对方暂不接收这种建议。');
    if(!target.profile.learning)fail('对方没有公开探索内容。');
    const text=tidy(a.text,250);if(!text)fail('写一条具体、友善的建议。');
    if(!data.advice.some(x=>x.from===s.actor&&x.to===a.to&&x.text===text))data.advice.push({id:key(),from:s.actor,to:a.to,text,anonymous:!!a.anonymous,at:Date.now()});return s;
  }
  fail('未知森林互动。');
}
