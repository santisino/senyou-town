import { activeVillage, joined, mayManage } from './villages.js?v=cognition-v2';
import { matchList } from './connect-data.js?v=cognition-v2';

export const PHASES = ['准备入村', '发现伙伴', '协作任务', '共同复盘'];
export const SCENARIO = {
  id: 'release-check',
  title: '还有 30 分钟，要不要上线？',
  story: '你们负责一个内部活动报名功能。距离约定上线还有 30 分钟：主流程已经通过测试，但有一项异常提示尚未检查；延期可能影响同事报名。你会先怎么做？',
  choices: [
    {id:'try', title:'先小范围试用', detail:'限定人数、保留回滚，尽快获得实际反馈。', need:'希望先获得真实反馈', question:'小范围是多少人？谁负责回滚？'},
    {id:'check', title:'先补关键检查', detail:'检查异常提示及回退流程，再决定上线范围。', need:'希望先明确风险边界', question:'哪些检查必须做完？何时给出结论？'},
    {id:'align', title:'先对齐各方预期', detail:'同步风险、时间与影响，请相关同事一起确认。', need:'希望相关人员有共同预期', question:'谁必须参与？怎样避免讨论超过时限？'},
    {id:'delay', title:'先告知延期方案', detail:'给出替代报名方式和新时间，保证大家不被耽误。', need:'希望为参与者保留稳定安排', question:'替代方式是什么？新的时间如何承诺？'},
  ],
};
export const DEMO_CHOICES = {lin:'try', he:'check', ze:'align', an:'delay', yu:'align'};
const uid=()=>crypto.randomUUID();
const clean=(v,n=600)=>String(v??'').trim().slice(0,n);
const fail=m=>{throw new Error(m);};
const person=(s,id=s.actor)=>s.residents.find(r=>r.id===id);
const initial=()=>({version:1,phase:0,pairs:[],goals:{},screenConsent:{},events:[],messages:[]});
export const lesson=s=>{const l=activeVillage(s).lesson||initial();return s.stage==='open'&&l.phase===0?{...l,phase:1}:l;};
export const livePair=(s,id=s.actor)=>lesson(s).pairs.find(p=>p.members.includes(id)&&!['declined','withdrawn'].includes(p.status));
const opt=id=>SCENARIO.choices.find(x=>x.id===id);
export function cardProfile(s,id,viewer=s.actor) {
  const r=person(s,id);
  if(!r||!joined(s,viewer)||!joined(s,id))return null;
  if(id!==viewer&&(!r.confirmed||s.stage!=='open'))return null;
  return {...r,profile:Object.fromEntries(Object.entries(r.profile).map(([k,v])=>[k,id===viewer||r.public[k]?v:''])),interview:{},notes:{}};
}
export function recommendations(s) {
  return matchList(s).slice(0,3).map(x=>({...x,reasons:x.reasons.map(r=>r.text),weight:x.reasons.length}));
}
export function pairView(s,id) {
  const p=lesson(s).pairs.find(q=>q.id===id);
  if(!p||!p.members.includes(s.actor))return null;
  const both=p.members.every(id=>p.choices[id]);
  return {...p,choices:Object.fromEntries(Object.entries(p.choices).filter(([id])=>id===s.actor||both))};
}
export function review(p) {
  const a=opt(p.choices[p.members[0]]?.id),b=opt(p.choices[p.members[1]]?.id);
  if(!a||!b)return null;
  return {headline:a.id===b.id?'起点相近，也值得把边界说清楚':'选择不同，不代表目标不同',
    points:[a.need,b.need],questions:[a.question,b.question],
    suggestion:a.id===b.id?'把适用范围、负责人和停止条件写下来，检查你们是否真的理解一致。':'先各用一分钟说明最担心的事，再约定检查底线、试用范围与沟通时间。'};
}
function shareFingerprint(s,p) {
  return JSON.stringify([p.members.map(id=>person(s,id)?.name||''),p.agreement,p.members.map(id=>p.choices[id]?.id)]);
}
export function shareApprovals(s,p) {const key=shareFingerprint(s,p);return Object.fromEntries(p.members.map(id=>[id,p.shareConsent[id]===key]));}
export function shareData(s,id) {
  const p=lesson(s).pairs.find(q=>q.id===id);
  if(!p||!p.members.includes(s.actor)||p.status!=='completed')return null;
  if(p.members.some(id=>!joined(s,id)))return null;
  const fingerprint=shareFingerprint(s,p);
  if(!p.members.every(id=>p.shareConsent[id]===fingerprint))return null;
  return {names:p.members.map(id=>person(s,id).name),agreement:p.agreement,
    choices:p.members.map(id=>opt(p.choices[id].id).title),scenario:SCENARIO.title,
    simulated:p.members.some(id=>person(s,id)?.simulated),fingerprint};
}
export function classSummary(s) {
  const l=lesson(s),people=s.residents.filter(r=>r.membership==='joined');
  const opted=people.filter(r=>l.screenConsent[r.id]);
  const included=l.pairs.filter(p=>!['declined','withdrawn'].includes(p.status));
  const votes=opted.flatMap(r=>included.filter(p=>p.members.includes(r.id)&&p.choices[r.id]).map(p=>p.choices[r.id].id));
  const enough=votes.length>=3;
  return {joined:people.length,ready:people.filter(r=>r.confirmed).length,
    pairs:included.length,completed:included.filter(p=>p.status==='completed').length,
    voted:votes.length,anonymous:enough,
    distribution:SCENARIO.choices.map(o=>({id:o.id,title:o.title,count:enough?votes.filter(v=>v===o.id).length:0})),
    sampleCount:people.filter(r=>r.simulated).length,
    // No names, raw answers, private notes, personal reflections or pair text in the projection.
  };
}
export function journal(s,id=s.actor) {return s.network.learningJournal?.[id]||[];}
export function lessonAction(s,a) {
  const v=activeVillage(s),r=person(s),admin=a.type.startsWith('class:admin:');
  if(admin&&(!mayManage(s)||v.kind==='public'))fail('请以本活动村的演示村长身份操作。');
  if(v.archived)fail('活动已归档，课堂记录保留，但不能继续修改。');
  if(!admin&&!joined(s))fail('先找村长确认加入这座村。');
  v.lesson ||= initial();const l=v.lesson;
  if(s.stage==='open'&&l.phase===0)l.phase=1;
  const event=(type,info={})=>l.events.push({type,actor:s.actor,at:Date.now(),...info});
  if(a.type==='class:admin:phase') {
    if(!Number.isInteger(a.phase)||a.phase<0||a.phase>3)fail('未知课堂阶段。');
    l.phase=a.phase;
    if(a.phase>0){s.stage='open';v.stage='open';}
    else {s.stage='preparing';v.stage='preparing';}
    event('phase',{phase:a.phase});return s;
  }
  if(a.type==='class:admin:reset') {
    if(a.confirm!==true)fail('请确认开始新一轮课堂。');
    v.lesson=initial();s.stage='preparing';v.stage='preparing';return s;
  }
  if(a.type==='class:admin:sample') {
    const candidates=[['lin','he'],['ze','an']].filter(ids=>ids.every(id=>{
      const r=person(s,id);return r?.simulated&&!r.controlled&&r.confirmed&&joined(s,id)&&!livePair(s,id);
    }));
    if(!candidates.length)fail('没有可用的空闲示例组合。请先准备虚构居民；已有任务和已接管角色不会被覆盖。');
    const original=s.actor;l.phase=2;s.stage=v.stage='open';
    try {for(const [a,b] of candidates){
      s.actor=a;lessonAction(s,{type:'class:invite',to:b});const p=livePair(s,a);
      s.actor=b;lessonAction(s,{type:'class:reply',id:p.id,accept:true});
      for(const id of [a,b]){s.actor=id;lessonAction(s,{type:'class:choose',id:p.id,choice:DEMO_CHOICES[id],reason:'虚构课堂结果：希望说明自己的担心，再听听搭档的理由。'});l.screenConsent[id]=true;}
      lessonAction(s,{type:'class:agreement',id:p.id,text:'先用 10 分钟列出必须检查的风险，再限定试用范围；由一人记录结论，遇到异常一起决定是否暂停。'});
      for(const id of [a,b]){s.actor=id;lessonAction(s,{type:'class:sign',id:p.id});}
    }}finally{s.actor=original;}
    event('sample-results',{groups:candidates.length,simulated:true});return s;
  }
  if(a.type==='class:goal') {l.goals[s.actor]=clean(a.value,180);return s;}
  if(a.type==='class:screen') {l.screenConsent[s.actor]=a.allow===true;return s;}
  if(a.type==='class:message') {
    if(!cardProfile(s,a.to)||a.to===s.actor)fail('暂时不能给这位森友留言。');
    const text=clean(a.text,180);if(!text)fail('先写一句具体的问候。');
    if(l.messages.some(m=>m.from===s.actor&&m.to===a.to&&m.text===text))return s;
    l.messages.push({id:uid(),from:s.actor,to:a.to,text,at:Date.now()});return s;
  }
  if(a.type==='class:invite') {
    if(l.phase!==1&&l.phase!==2)fail('等班主任开放发现伙伴或协作任务后再邀请。');
    if(!r.confirmed||!cardProfile(s,a.to)||a.to===s.actor)fail('双方需先确认个人说明书。');
    if(livePair(s)||livePair(s,a.to))fail('你或对方已有本轮任务邀请。可先回应或撤回。');
    l.pairs.push({id:uid(),members:[s.actor,a.to],status:'pending',choices:{},agreement:'',signatures:{},shareConsent:{},createdAt:Date.now()});event('invite',{to:a.to});return s;
  }
  if(a.type==='class:practice') {
    const entry=journal(s).find(e=>e.id===a.id);if(!entry)fail('只能记录自己的课后实践。');
    const text=clean(a.text,400);if(!text)fail('写一个实际尝试或观察，不需要证明自己变好了。');
    entry.practices ||= entry.practice?[entry.practice]:[];
    if(entry.practices.at(-1)?.text!==text)entry.practices.push({text,at:Date.now()});
    entry.practice={text,at:Date.now()};return s;
  }
  if(a.type==='class:simulate') {
    const p=l.pairs.find(q=>q.id===a.id);if(!p||!p.members.includes(s.actor))fail('只能演示自己的搭档响应。');
    const other=p.members.find(id=>id!==s.actor),target=person(s,other);
    if(!target?.simulated)fail('不能替真实填写的参与者作答。');
    const types={accept:'class:reply',choice:'class:choose',sign:'class:sign',share:'class:share'};
    if(!types[a.step])fail('未知模拟操作。');
    const nested={type:types[a.step],id:p.id,accept:true,choice:DEMO_CHOICES[other]||'check',reason:'模拟搭档：我希望先说明这一步最担心的风险。',allow:true};
    if(a.step==='choice'&&p.choices[other])return s;
    const original=s.actor;s.actor=other;
    try {lessonAction(s,nested);} finally {s.actor=original;}
    event('simulated-response',{person:other,step:a.step});return s;
  }
  const p=l.pairs.find(q=>q.id===a.id);
  if(!p||!p.members.includes(s.actor))fail('这不是你的协作任务。');
  if(p.members.some(id=>!joined(s,id)))fail('参与资格已变化，暂不能继续这次任务。');
  if(a.type==='class:reply') {
    if(p.members[1]!==s.actor||p.status!=='pending')fail('只有受邀人可回应待处理邀请。');
    p.status=a.accept?'accepted':'declined';event('reply');return s;
  }
  if(a.type==='class:withdraw') {
    if(p.members[0]!==s.actor||p.status!=='pending')fail('只能撤回自己尚未被回应的邀请。');
    p.status='withdrawn';return s;
  }
  if(a.type==='class:choose') {
    if(l.phase!==2)fail('等班主任发布协作任务后再作答。');
    if(p.status!=='accepted'||!opt(a.choice))fail('先等待双方接受邀请，并选择一个有效选项。');
    if(p.choices[s.actor])fail('本轮选择已提交；复盘时可以讨论和修正想法。');
    p.choices[s.actor]={id:a.choice,reason:clean(a.reason,180),at:Date.now()};event('choice');return s;
  }
  if(a.type==='class:agreement') {
    if(!p.members.every(id=>p.choices[id])||!['accepted','completed'].includes(p.status))fail('双方先各自作答，再商量约定。');
    const text=clean(a.text,300);if(!text)fail('写下一条可以尝试的具体约定。');
    if(p.agreement===text)return s;
    p.agreement=text;p.status='accepted';p.signatures={};p.shareConsent={};event('agreement');return s;
  }
  if(a.type==='class:sign') {
    if(!p.agreement||!p.members.every(id=>p.choices[id]))fail('先写下共同约定。');
    p.signatures[s.actor]=true;
    if(p.members.every(id=>p.signatures[id])){
      p.status='completed';s.network.learningJournal ||= {};
      for(const id of p.members){
        const entries=s.network.learningJournal[id] ||= [];
        const entry={id:p.id,village:v.id,villageName:s.village.name,scenario:SCENARIO.title,agreement:p.agreement,
          ownChoice:opt(p.choices[id].id).title,simulated:p.members.some(rid=>person(s,rid)?.simulated),at:Date.now()};
        const index=entries.findIndex(e=>e.id===p.id);if(index>=0)entries[index]={...entries[index],...entry};else entries.push(entry);
      }
    }return s;
  }
  if(a.type==='class:share') {
    if(p.status!=='completed')fail('共同约定需经双方确认后才能授权分享。');
    p.shareConsent[s.actor]=a.allow?shareFingerprint(s,p):null;return s;
  }
  fail('未知课堂操作。');
}
