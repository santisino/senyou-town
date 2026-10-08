import { FIELDS, seedResidents } from './data.js?v=village-v4';
import { STATIONS } from './journey.js?v=cognition-v2';

// Canonical people + village memberships. The old scene receives a derived active-village
// projection; it is checkpointed before every switch. No cross-device authority is claimed.
export const PUBLIC_VILLAGE = 'ant-public';
export const ACTIVITY_VILLAGE = 'baima-session';
const PERSONAL = ['id','name','appearance','profile','interview','decor','signature','wishMode','capacity','simulated','social'];
const MEMBER = ['group','public','confirmed','reviewed','arrived','plot','built','journey','notes','bookmarked','controlled','membership','origin','suspended','socialPrivacy','cognitionConsent','cognitionPublication'];
const RUNTIME = ['experience','openingStep','welcomeSeen','wallets','items','gifts','requests','friends','connections','ledger','publicResults','shareCards'];
const copy = x => structuredClone(x);
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, copy(o[k])]));
const mask = v => Object.fromEntries([...FIELDS.map(([k])=>k),'workBackground','wantToLearn','challenges'].map(k => [k, !!v?.[k]]));
const fail = m => { throw new Error(m); };
const uid = () => crypto.randomUUID();
export const activeVillage = s => s.network.villages[s.network.active];
export const isPublic = s => activeVillage(s).kind === 'public';
export const joined = (s, id=s.actor) => s.residents.find(r=>r.id===id)?.membership === 'joined';
const freshMember = () => ({group:'新邻居',public:mask(),confirmed:false,reviewed:false,arrived:false,
  plot:null,built:false,journey:{metMayor:false,key:false,stations:[]},notes:{},bookmarked:[],membership:'visitor',origin:'自主探索'});
function runtime(people) {
  return {experience:'opening',openingStep:0,welcomeSeen:false,
    wallets:Object.fromEntries(people.map(r=>[r.id,{coins:100,sent:0}])),
    items:people.flatMap(r=>Array.from({length:5},()=>({id:uid(),owner:r.id,creator:r.id,
      name:r.signature.name,color:r.signature.color,template:r.signature.template,status:'available',kind:'signature'}))),
    gifts:[],requests:[],friends:[],connections:[],ledger:[],publicResults:{},shareCards:[]};
}
function newVillage(id,kind,settings,people=[]) {
  return {id,kind,settings:copy(settings),stage:kind==='public'?'open':'preparing',archived:false,
    joinPolicy:kind==='public'?'open':'invite',members:{},runtime:runtime(people),
    content:[],joinRequests:[],reports:[],events:[],createdAt:Date.now()};
}
export function ensureNetwork(s) {
  if(s.network?.version===1) return s;
  const oldMembers=Object.fromEntries(s.residents.map(r=>[r.id,{...freshMember(),...pick(r,MEMBER),membership:'joined',origin:'原版体验保留'}]));
  const activity=newVillage(ACTIVITY_VILLAGE,'activity',s.village,s.residents);
  activity.stage=s.stage; activity.members=oldMembers;activity.runtime=pick(s,RUNTIME);
  const publicVillage=newVillage(PUBLIC_VILLAGE,'public',{
    name:'蚂蚁森友村',mayor:'森森',tone:'温暖',appearance:'green',
    welcome:'欢迎来到蚂蚁森友村。这里一直亮着灯，朋友的分享会把新邻居带来。',
    goal:'在这里安一个家，留下自己的故事，遇见愿意一起做点什么的同事。你可以随时回来。'},s.residents);
  publicVillage.runtime.experience='mature';
  const samples=seedResidents();
  for(const [i,r] of samples.entries()) publicVillage.members[r.id]={...freshMember(),group:'公共村示例居民',
    membership:'joined',origin:'虚构示例',public:mask(r.public),arrived:true,plot:i,built:true,
    confirmed:true,reviewed:true,journey:{metMayor:true,key:true,stations:Object.keys(STATIONS)}};
  s.network={version:1,active:ACTIVITY_VILLAGE,people:Object.fromEntries(s.residents.map(r=>[r.id,{...pick(r,PERSONAL),complete:!!r.confirmed}])),
    villages:{[ACTIVITY_VILLAGE]:activity,[PUBLIC_VILLAGE]:publicVillage},manager:'resident',arrival:null};
  for(const r of s.residents)r.membership='joined';
  return s;
}
export function checkpoint(s) {
  ensureNetwork(s);
  const n=s.network,v=activeVillage(s);
  for(const r of s.residents) {
    if(!s.wallets[r.id]){const extra=runtime([r]);s.wallets[r.id]=extra.wallets[r.id];s.items.push(...extra.items);}
    const previous=n.people[r.id];
    n.people[r.id]={...pick(r,PERSONAL),complete:!!r.confirmed || (!!previous?.complete && FIELDS.every(([k])=>r.profile[k]?.trim()))};
    if(!FIELDS.every(([k])=>r.profile[k]?.trim()))for(const village of Object.values(n.villages))
      if(village.members[r.id])village.members[r.id].confirmed=false;
    v.members[r.id]={...freshMember(),...pick(r,MEMBER)};
  }
  v.settings=copy(s.village);v.stage=v.kind==='public'?'open':s.stage;
  if(v.archived)v.stage='archived';
  s.stage=v.stage;
  v.runtime=pick(s,RUNTIME);
  return s;
}
function project(s,id) {
  const n=s.network,v=n.villages[id];
  if(!v)fail('这座村庄不在本机演示中。');
  n.active=id;
  if(!v.members[s.actor])v.members[s.actor]=freshMember();
  s.village=copy(v.settings);s.stage=v.archived?'archived':v.kind==='public'?'open':v.stage;
  for(const k of RUNTIME) delete s[k];
  Object.assign(s,copy(v.runtime));
  s.shareCards ||= [];
  s.residents=Object.entries(v.members).filter(([rid])=>n.people[rid])
    .map(([rid,m])=>({...copy(n.people[rid]),...copy(m)}));
  const r=s.residents.find(r=>r.id===s.actor);
  if(!s.wallets[r.id]) {
    const extra=runtime([r]);s.wallets[r.id]=extra.wallets[r.id];s.items.push(...extra.items);
  }
  return s;
}
export function mayManage(s,id=s.network.active) {
  const v=s.network.villages[id],role=s.network.manager;
  return !!v && (role==='donglai'||role==='public'&&v.kind==='public'||role==='activity'&&v.kind==='activity');
}
export function villageSummary(s,id) {
  const v=s.network.villages[id],members=Object.values(v.members).filter(m=>m.membership==='joined');
  return {joined:members.length,ready:members.filter(m=>m.confirmed).length,pending:v.joinRequests.filter(q=>q.status==='pending').length,
    shares:v.events.filter(e=>e.type==='share-created').length,arrivals:v.events.filter(e=>e.type==='share-arrival').length};
}
function record(v,type,details={}) {v.events.push({id:uid(),type,at:Date.now(),...details});}
function bringHome(s,r) {
  if(r.membership!=='joined'||!s.network.people[r.id].complete)return;
  r.plot=Number.isInteger(r.plot)?r.plot:Array.from({length:50},(_,i)=>i).find(i=>!s.residents.some(p=>p.id!==r.id&&p.plot===i));
  if(r.plot===undefined)fail('这份 Demo 的 50 个宅地已满；正式公共村将按街区扩展。');
  r.built=true;r.confirmed=true;r.reviewed=true;r.journey={metMayor:true,key:true,stations:Object.keys(STATIONS)};
}
export function netAction(original,a) {
  const s=checkpoint(copy(original)),n=s.network,v=activeVillage(s),r=s.residents.find(r=>r.id===s.actor);
  if(a.type.startsWith('net:admin:')&&!mayManage(s))fail('请先选择拥有本村权限的演示村长身份。');
  if(a.type==='net:role') {
    if(!['resident','activity','public','donglai'].includes(a.role))fail('无此演示身份');
    n.manager=a.role;
  } else if(a.type==='net:switch') {
    if(!n.villages[a.id])fail('找不到这座村');
    if(a.id!==n.active)n.arrival=null;
    return project(s,a.id);
  } else if(a.type==='net:join') {
    if(v.archived)fail('活动已归档，不再接受新加入。');
    if(r.membership==='removed')fail('本机示例中已暂停你的本村成员资格。请切换村长演示恢复。');
    if(v.joinPolicy==='invite' && n.arrival?.village!==v.id && !joined(s))fail('请通过本活动的专属邀请入口报到。普通分享不会加入活动村。');
    if(!r.name.trim()||r.name==='新森友')fail('先告诉村长怎么称呼你。');
    r.public=mask(a.public);
    if(v.joinPolicy==='approval'&&!joined(s)) {
      if(!v.joinRequests.some(q=>q.person===r.id&&q.status==='pending'))v.joinRequests.push({id:uid(),person:r.id,status:'pending',at:Date.now()});
      r.membership='pending';record(v,'join-request',{person:r.id});
    } else {
      r.membership='joined';r.arrived=true;r.origin=n.arrival?.kind==='share'?'分享邀请':n.arrival?.kind==='activity'?'活动邀请':'自主加入';
      if(v.members[r.id]?.membership!=='joined')record(v,'join',{person:r.id});
    }
    bringHome(s,r);
  } else if(a.type==='net:privacy') {
    if(!joined(s))fail('先与村长确认加入这座村。');
    r.public=mask(a.public);
  } else if(a.type==='net:admin:settings') {
    for(const key of ['name','mayor','tone','appearance','welcome','goal'])if(a.value?.[key]!==undefined) {
      const val=String(a.value[key]).trim().slice(0,['welcome','goal'].includes(key)?300:30);
      if(!val)fail('村庄设置不能留空');
      if(key==='name'&&v.kind==='public'&&val!=='蚂蚁森友村')fail('公共村名称固定为蚂蚁森友村。');
      s.village[key]=val;
    }
    if(v.kind==='activity'&&['invite','approval'].includes(a.policy))v.joinPolicy=a.policy;
  } else if(a.type==='net:admin:stage') {
    if(v.kind==='public')fail('公共村持续开放，不使用活动开场开关。');
    if(v.archived)fail('先恢复活动，再调整阶段。');
    s.stage=a.open?'open':'preparing';record(v,'stage',{value:s.stage});
    v.lesson ||= {version:1,phase:0,pairs:[],goals:{},screenConsent:{},events:[],messages:[]};
    v.lesson.phase=a.open?Math.max(1,v.lesson.phase):0;
  } else if(a.type==='net:admin:create') {
    if(!['donglai','activity'].includes(n.manager))fail('只有活动村长演示身份可以创建活动村。');
    const name=String(a.name||'').trim().slice(0,30);if(!name)fail('给新活动村起个名字。');
    const id='activity-'+uid();
    n.villages[id]=newVillage(id,'activity',{...v.settings,name,welcome:`欢迎来到${name}。先认识自己，再认识彼此。`},[r]);
    n.arrival={kind:'activity',village:id};
    return project(s,id);
  } else if(a.type==='net:admin:joinReply') {
    const q=v.joinRequests.find(q=>q.id===a.id);if(!q||q.status!=='pending')fail('这条申请已处理。');
    q.status=a.accept?'accepted':'declined';
    const member=s.residents.find(p=>p.id===q.person);
    if(member){member.membership=a.accept?'joined':'visitor';member.arrived=!!a.accept;if(a.accept)bringHome(s,member);}
    record(v,'join-reply',{person:q.person,value:q.status});
  } else if(a.type==='net:admin:sampleRequest') {
    if(v.joinRequests.some(q=>q.simulated&&q.status==='pending'))fail('已有一条虚构申请待处理，先回应它吧。');
    const p={...pick(seedResidents()[0],PERSONAL),id:'guest-'+uid(),name:'小乔（示例）',simulated:true,complete:false};
    n.people[p.id]=p;
    v.joinRequests.push({id:uid(),person:p.id,status:'pending',at:Date.now(),simulated:true});
    if(!s.residents.some(r=>r.id===p.id))s.residents.push({...copy(p),...freshMember(),membership:'pending'});
  } else if(a.type==='net:admin:content') {
    if(v.archived)fail('归档活动不能发布新内容。');
    const title=String(a.title||'').trim().slice(0,60),body=String(a.body||'').trim().slice(0,600);
    if(!title||!body)fail('请写下标题与具体内容。');
    if(!['park','library','growth','play','class','workshop'].includes(a.space))fail('请选择一个公共空间。');
    v.content.push({id:uid(),space:a.space,title,body,status:'published',at:Date.now()});
  } else if(a.type==='net:admin:contentStatus') {
    const item=v.content.find(c=>c.id===a.id);if(!item)fail('内容不存在');
    item.status=item.status==='published'?'hidden':'published';
  } else if(a.type==='net:takeContent') {
    const c=v.content.find(c=>c.id===a.id&&c.status==='published');if(!c||!joined(s)||!r.confirmed||s.stage!=='open')fail('完成入驻并开放串门后再参与。');
    s.publicResults[`${s.actor}:village-content-${a.id}`] ||= {joined:true,at:Date.now()};
  } else if(a.type==='net:report') {
    if(!joined(s))fail('加入村庄后才能反馈内容。');
    const text=String(a.text||'').trim().slice(0,300);if(!text)fail('请写下希望村长关注的问题。');
    v.reports.push({id:uid(),person:s.actor,text,status:'pending',at:Date.now()});
  } else if(a.type==='net:admin:reportReply') {
    const report=v.reports.find(q=>q.id===a.id);if(!report||report.status!=='pending')fail('这条反馈已处理。');
    report.status='resolved';report.reply=String(a.reply||'村长已查看，并在本机演示中完成处理。').slice(0,300);
  } else if(a.type==='net:admin:member') {
    const member=s.residents.find(p=>p.id===a.id);if(!member)fail('成员不在当前村庄。');
    if(member.id===s.actor)fail('不能在工作台暂停正在体验的角色，请先切换角色。');
    if(member.membership==='removed') {
      Object.assign(member,member.suspended||{});delete member.suspended;member.membership='joined';
      if(s.residents.some(p=>p.id!==member.id&&Number.isInteger(member.plot)&&p.plot===member.plot))member.plot=null;
      if(member.built&&!Number.isInteger(member.plot))member.plot=Array.from({length:50},(_,i)=>i).find(i=>!s.residents.some(p=>p.plot===i));
      if(member.built&&member.plot===undefined)fail('宅地已满，暂不能恢复这个示例居民。');
    } else {
      member.suspended=pick(member,['arrived','confirmed','built','plot','journey']);
      member.membership='removed';member.confirmed=false;member.built=false;member.plot=null;member.arrived=false;member.journey={metMayor:false,key:false,stations:[]};
    }
  } else if(a.type==='net:admin:archive') {
    if(v.kind==='public')fail('蚂蚁森友村是持续存在的公共村，不能归档。');
    v.archived=!v.archived;s.stage=v.archived?'archived':'preparing';record(v,'archive',{value:v.archived});
  } else if(a.type==='net:shareCreated') {
    record(v,'share-created',{person:s.actor,kind:a.kind});
  } else fail('未知村庄操作');
  return checkpoint(s);
}

export function shareLink(s,kind,base='https://santisino.github.io/senyou-town/forest/') {
  const url=new URL(base);url.search='';url.hash='';
  // Only immutable fictional identities cross devices. Never serialize employee profiles.
  const r=s.residents.find(r=>r.id===s.actor);
  url.searchParams.set('entry','share');url.searchParams.set('who',seedResidents().some(p=>p.id===r.id)?r.id:'demo');
  url.searchParams.set('kind',['house','profile','wish','pair','work'].includes(kind)?kind:'house');
  return url.href;
}
export function applyArrival(original,params,settings) {
  const s=checkpoint(copy(original)),n=s.network,entry=params.get('entry');
  // A fresh recipient is not implicitly a participant of the default training village.
  const originalActor=s.residents.find(r=>r.id===s.actor);
  if(originalActor?.name==='新森友'&&!originalActor.journey?.key&&!s.welcomeSeen) {
    originalActor.membership='visitor';originalActor.arrived=false;originalActor.public=mask();checkpoint(s);
  }
  if(entry==='share'||entry==='public') {
    project(s,PUBLIC_VILLAGE);
    if(entry==='share') {
      const who=seedResidents().find(p=>p.id===params.get('who'))?.id||'lin';
      const kind=['house','profile','wish','pair','work'].includes(params.get('kind'))?params.get('kind'):'house';
      const signature=`${who}:${kind}:${params.get('who')==='demo'}`;
      const v=activeVillage(s);
      if(!v.events.some(e=>e.type==='share-arrival'&&e.signature===signature&&e.person===s.actor))record(v,'share-arrival',{signature,person:s.actor});
      n.arrival={kind:'share',who,content:kind,sample:params.get('who')==='demo',village:PUBLIC_VILLAGE};
    }else n.arrival=null;
  }else if(entry==='activity') {
    const id=/^activity-[a-zA-Z0-9-]{1,80}$/.test(params.get('vid')||'')?params.get('vid'):params.get('vid')===ACTIVITY_VILLAGE?ACTIVITY_VILLAGE:null;
    if(!id||!settings?.name)fail('活动邀请不完整，请向村长索取新链接。');
    if(!n.villages[id]) n.villages[id]=newVillage(id,'activity',settings,[n.people[s.actor]]);
    const target=n.villages[id];
    if(!target.runtime.welcomeSeen&&!Object.values(target.members).some(m=>m.built||m.journey?.key)) {
      target.settings={...target.settings,...settings};
      target.joinPolicy=params.get('policy')==='approval'?'approval':'invite';
    }
    // An invitation carries public configuration only, never role grants or participant data.
    project(s,id);n.arrival={kind:'activity',village:id};
  }
  return checkpoint(s);
}
