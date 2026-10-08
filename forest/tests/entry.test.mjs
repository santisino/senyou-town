import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, transact as act, resident, persist, load } from '../state.js';
import { entry, soloEmployee, nextDemoResponse } from '../entry-data.js';
import { ACTIVITY_VILLAGE, PUBLIC_VILLAGE, activeVillage } from '../villages.js';
import { lesson, livePair, shareData } from '../lesson-data.js';

function ready() {
  let s=act(fresh(),{type:'entry:choose',role:'employee'});
  s=act(s,{type:'profile',name:'小测试'});s=act(s,{type:'meetMayor'});s=act(s,{type:'buildHome'});
  s=act(s,{type:'profile',profile:{headline:'认真认识自己',traits:'好奇',interests:'摄影',story:'常拍树影',learning:'光线',help:'整理资料',collaboration:'先讲目标',wish:'午休摄影'},reviewed:true});
  for(const key of ['door','interest','table','wish'])s=act(s,{type:'finishStation',key});
  return act(s,{type:'confirm'});
}
const respond=s=>{const q=nextDemoResponse(s);return act(s,{type:'entry:response',id:q.id,step:q.step});};
test('fresh and legacy data ask for a role without deleting old content',()=>{
  let s=fresh();assert.equal(entry(s).role,null);s=act(s,{type:'profile',name:'旧昵称'});
  const old=JSON.stringify(s);const next=act(s,{type:'entry:choose',role:'employee'});
  assert.equal(JSON.stringify(s),old);assert.equal(resident(next).name,'旧昵称');assert.equal(next.network.manager,'resident');
  assert.equal(next.actor,'me');assert.equal(soloEmployee(next),true);assert.equal(resident(next).confirmed,false);
});
test('organizer auto opens both-village demo authority; employee revokes it',()=>{
  let s=act(fresh(),{type:'entry:choose',role:'organizer'});assert.equal(s.network.manager,'donglai');
  s=act(s,{type:'entry:choose',role:'employee'});assert.equal(s.network.manager,'resident');
  assert.throws(()=>act(s,{type:'class:admin:phase',phase:2}));
});
test('solo mayor needs a personally confirmed manual; opening does not change identity',()=>{
  let s=act(fresh(),{type:'entry:choose',role:'employee'});assert.throws(()=>act(s,{type:'entry:mayor-open'}));
  s=ready();assert.equal(s.stage,'preparing');s=act(s,{type:'entry:mayor-open'});
  assert.equal(s.stage,'open');assert.equal(lesson(s).phase,1);assert.equal(s.actor,'me');
  assert.equal(s.network.manager,'resident');assert.equal(lesson(s).events.at(-1).simulatedMayor,true);
  assert.throws(()=>act(s,{type:'entry:mayor-task'}));
});
test('invited and preview employees cannot override organizer stages',()=>{
  for(const mode of ['invited','preview']) {
    let s=ready();s.entry.mode=mode;
    assert.throws(()=>act(s,{type:'entry:mayor-open'}));assert.equal(nextDemoResponse(s),null);
  }
});
test('preview is visibly a separate mode and restores organizer actor, village and manager',()=>{
  let s=act(ready(),{type:'entry:choose',role:'organizer'});s=act(s,{type:'switch',id:'lin'});
  const before={actor:s.actor,village:s.network.active,manager:s.network.manager};
  s=act(s,{type:'entry:preview'});assert.equal(s.actor,'me');assert.equal(entry(s).mode,'preview');
  assert.equal(s.network.manager,'resident');assert.equal(resident(s).name,'小测试');
  s=act(s,{type:'net:switch',id:PUBLIC_VILLAGE});s=act(s,{type:'entry:preview-return'});
  assert.deepEqual({actor:s.actor,village:s.network.active,manager:s.network.manager},before);
  assert.equal(entry(s).role,'organizer');assert.equal(entry(s).preview,null);
});
test('role gate preserves manual, gifts and coins; gate during preview restores first',()=>{
  let s=act(ready(),{type:'entry:choose',role:'organizer'});s=act(s,{type:'entry:preview'});
  const profile=structuredClone(resident(s).profile),coins=s.wallets.me.coins;
  s=act(s,{type:'entry:gate'});assert.equal(entry(s).role,null);assert.equal(s.network.manager,'resident');
  assert.deepEqual(resident(s,'me').profile,profile);assert.equal(s.wallets.me.coins,coins);
});
test('solo storyline carries acceptance, independent choice, agreement and opt-in sharing',()=>{
  let s=act(ready(),{type:'entry:mayor-open'});s=act(s,{type:'class:invite',to:'lin'});
  const id=livePair(s).id;assert.equal(nextDemoResponse(s).step,'accept');s=respond(s);
  assert.equal(livePair(s).status,'accepted');assert.equal(lesson(s).phase,1);assert.equal(s.actor,'me');
  s=act(s,{type:'entry:mayor-task'});assert.equal(lesson(s).phase,2);
  assert.equal(nextDemoResponse(s),null);s=act(s,{type:'class:choose',id,choice:'check'});s=respond(s);
  assert.ok(livePair(s).choices.lin);s=act(s,{type:'class:agreement',id,text:'先检查关键风险，再一起决定。'});
  assert.equal(nextDemoResponse(s),null);s=act(s,{type:'class:sign',id});s=respond(s);
  assert.equal(livePair(s).status,'completed');assert.equal(shareData(s,id),null);
  s=act(s,{type:'class:share',id,allow:true});s=respond(s);assert.ok(shareData(s,id));
  assert.equal(s.actor,'me');assert.equal(s.network.manager,'resident');assert.equal(resident(s,'lin').controlled,undefined);
});
test('automatic response never signs or shares for the employee',()=>{
  let s=act(ready(),{type:'entry:mayor-open'});s=act(s,{type:'class:invite',to:'lin'});s=respond(s);
  assert.equal(nextDemoResponse(s),null);assert.deepEqual(livePair(s).choices,{});
  assert.deepEqual(livePair(s).signatures,{});assert.deepEqual(livePair(s).shareConsent,{});
});
test('controlled or non-fictional partner never auto responds',()=>{
  for(const marker of ['controlled','real']) {
    let s=act(ready(),{type:'entry:mayor-open'});s=act(s,{type:'class:invite',to:'lin'});
    if(marker==='controlled')resident(s,'lin').controlled=true;else resident(s,'lin').simulated=false;
    assert.equal(nextDemoResponse(s),null);
    assert.throws(()=>act(s,{type:'entry:response',id:livePair(s).id,step:'accept'}));
  }
});
test('gift and wish sample responses preserve actor and reject duplicate processing',()=>{
  let s=act(ready(),{type:'entry:mayor-open'}),item=s.items.find(i=>i.owner==='me');
  s=act(s,{type:'sendGift',to:'lin',item:item.id});const q=nextDemoResponse(s);s=respond(s);
  assert.equal(s.gifts[0].status,'accept');assert.equal(s.gifts[0].demoResponse,true);assert.equal(s.actor,'me');
  assert.throws(()=>act(s,{type:'entry:response',id:q.id,step:q.step}));
  s=act(s,{type:'request',to:'lin'});s=respond(s);assert.equal(s.requests[0].status,'accepted');assert.equal(s.actor,'me');
  assert.equal(s.wallets.me.sent,1);assert.equal(resident(s,'lin').controlled,undefined);
});
test('selected role, preview context and manual survive refresh',()=>{
  let s=act(ready(),{type:'entry:choose',role:'organizer'});s=act(s,{type:'entry:preview'});
  const db=new Map(),storage={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)};
  persist(s,storage);const t=load(storage);assert.deepEqual(entry(t),entry(s));assert.equal(resident(t).confirmed,true);
  assert.equal(entry(act(t,{type:'entry:preview-return'})).role,'organizer');
});
test('invited re-entry demotes a saved organizer and never moves to public village',()=>{
  let s=act(fresh(),{type:'entry:choose',role:'organizer'});s=act(s,{type:'entry:choose',role:'employee',invited:true});
  assert.equal(s.network.active,ACTIVITY_VILLAGE);assert.equal(entry(s).mode,'invited');assert.equal(s.network.manager,'resident');
});
