import { activeVillage, ACTIVITY_VILLAGE, isPublic, joined } from './villages.js?v=connections-v2';
import { lesson, livePair, pairView, shareApprovals } from './lesson-data.js?v=connections-v2';
import { advanceCohort } from './settlement.js';

// Experience routing is local Demo presentation, not authentication or server permissions.
export const entry = s => s.entry?.version === 1 ? s.entry : {version:1,role:null,mode:'solo',employeeActor:'me',preview:null};
export const soloEmployee = s => entry(s).role === 'employee' && entry(s).mode === 'solo';
const fail = message => { throw new Error(message); };
const person = (s,id) => s.residents.find(r=>r.id===id);

export function entryAction(original,a,act) {
  let s=structuredClone(original);
  s.entry={...entry(s)};
  const run = action => {s=act(s,action);};
  const switchActor = id => {
    if(person(s,id))run({type:'switch',id});
    else {s.actor=id;run({type:'net:switch',id:s.network.active});}
  };
  const restorePreview = () => {
    const back=s.entry.preview;if(!back)return;
    run({type:'net:switch',id:back.village});switchActor(back.actor);
    run({type:'net:role',role:back.manager});s.entry={...s.entry,role:'organizer',mode:'organizer',preview:null};
  };
  const mayorPhase = phase => {
    const manager=s.network.manager;
    run({type:'net:role',role:'donglai'});
    run({type:'class:admin:phase',phase});
    run({type:'net:role',role:manager});
    activeVillage(s).lesson.events.at(-1).simulatedMayor=true;
  };
  if(a.type==='entry:choose') {
    if(!['employee','organizer'].includes(a.role))fail('请选择员工体验或活动组织者。');
    restorePreview();
    if(a.role==='employee') {
      const actor=s.entry.employeeActor||'me';switchActor(actor);
      run({type:'net:role',role:'resident'});
      s.entry={version:1,role:'employee',mode:a.invited?'invited':'solo',employeeActor:actor,preview:null};
    }else {
      if(isPublic(s))run({type:'net:switch',id:ACTIVITY_VILLAGE});
      run({type:'net:role',role:'donglai'});
      s.entry={...s.entry,role:'organizer',mode:'organizer',preview:null};
    }
  }else if(a.type==='entry:gate') {
    restorePreview();s.entry={...s.entry,role:null};run({type:'net:role',role:'resident'});
  }else if(a.type==='entry:preview') {
    if(s.entry.role!=='organizer')fail('请从村长工作台预览员工体验。');
    const back={actor:s.actor,village:s.network.active,manager:s.network.manager};
    switchActor(s.entry.employeeActor||'me');run({type:'net:role',role:'resident'});
    s.entry={...s.entry,role:'employee',mode:'preview',preview:back};
  }else if(a.type==='entry:preview-return') {
    if(!s.entry.preview)fail('当前不是组织者预览。');restorePreview();
  }else if(a.type==='entry:mayor-open'||a.type==='entry:mayor-task') {
    if(!soloEmployee(s)||isPublic(s)||!joined(s)||!person(s,s.actor)?.confirmed||activeVillage(s).archived)
      fail('只有独自体验 Demo 时，示例村长才能推进活动。');
    if(a.type==='entry:mayor-open') {
      if(lesson(s).phase!==0||s.stage==='open')fail('串门已经开放。');
      advanceCohort(s,5);mayorPhase(1);
    }else {
      if(lesson(s).phase!==1||!['accepted','completed'].includes(livePair(s)?.status))fail('先找到一位愿意一起做任务的伙伴。');
      mayorPhase(2);
    }
  }else if(a.type==='entry:response') {
    const response=nextDemoResponse(s);
    if(!response||response.id!==a.id||response.step!==a.step)fail('这条示例回应已经处理或不再适用。');
    if(response.kind==='pair')run({type:'class:simulate',id:a.id,step:a.step});
    else {
      const actor=s.actor;s.actor=response.other;
      run(response.kind==='gift'?{type:'giftReply',id:a.id,reply:'accept'}:
        {type:'requestReply',id:a.id,reply:response.step});
      s.actor=actor;
      const record=(response.kind==='gift'?s.gifts:s.requests).find(x=>x.id===a.id);
      record.demoResponse=true;
    }
  }else fail('未知体验入口操作。');
  return s;
}

export function nextDemoResponse(s) {
  if(!soloEmployee(s)||!joined(s)||s.stage!=='open'||!person(s,s.actor)?.confirmed)return null;
  const allowed=id=>{const r=person(s,id);return r?.simulated&&!r.controlled&&joined(s,id);};
  const p=pairView(s,livePair(s)?.id),other=p?.members.find(id=>id!==s.actor);
  if(p&&allowed(other)) {
    let step=null;
    if(p.status==='pending'&&p.members[0]===s.actor)step='accept';
    else if(p.status==='accepted'&&lesson(s).phase===2&&p.choices[s.actor]&&!p.choices[other])step='choice';
    else if(p.agreement&&p.signatures[s.actor]&&!p.signatures[other])step='sign';
    else if(p.status==='completed') {
      const approvals=shareApprovals(s,p);if(approvals[s.actor]&&!approvals[other])step='share';
    }
    if(step)return {kind:'pair',id:p.id,other,step};
  }
  const gift=s.gifts.find(g=>g.from===s.actor&&g.status==='pending'&&allowed(g.to));
  if(gift)return {kind:'gift',id:gift.id,other:gift.to,step:'accept'};
  const request=s.requests.find(q=>q.from===s.actor&&q.status==='pending'&&allowed(q.to));
  if(request) {
    const full=s.requests.filter(q=>q.to===request.to&&q.status==='accepted').length>=person(s,request.to).capacity;
    return {kind:'request',id:request.id,other:request.to,step:full?'rejected':'accepted'};
  }
  return null;
}
