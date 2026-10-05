import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh,transact as act,resident,load,persist } from '../state.js';
import { lesson,livePair,pairView,shareData,classSummary,journal,cardProfile,recommendations } from '../lesson-data.js';
import { PUBLIC_VILLAGE,ACTIVITY_VILLAGE } from '../villages.js';
function ready(){let s=act(fresh(),{type:'prepareDemo'});s=act(s,{type:'net:role',role:'activity'});s=act(s,{type:'class:admin:phase',phase:1});return act(s,{type:'switch',id:'he'});}
function invited(){let s=act(ready(),{type:'class:invite',to:'lin'});return s;}
function choices(){let s=invited();const id=livePair(s).id;s=act(s,{type:'class:simulate',id,step:'accept'});s=act(s,{type:'class:admin:phase',phase:2});s=act(s,{type:'class:choose',id,choice:'check',reason:'我的私密理由'});return act(s,{type:'class:simulate',id,step:'choice'});}
function completed(){let s=choices();const id=livePair(s).id;s=act(s,{type:'class:agreement',id,text:'先对齐检查范围，再同步结果。'});s=act(s,{type:'class:sign',id});return act(s,{type:'class:simulate',id,step:'sign'});}
test('class progression requires activity manager and protects public village',()=>{
 assert.throws(()=>act(fresh(),{type:'class:admin:phase',phase:2}));let s=ready();s=act(s,{type:'net:switch',id:PUBLIC_VILLAGE});assert.throws(()=>act(s,{type:'class:admin:phase',phase:0}));
});
test('class actions immutable; invalid invitations do not create records',()=>{
 const s=ready(),old=JSON.stringify(s);assert.throws(()=>act(s,{type:'class:invite',to:'he'}));assert.equal(JSON.stringify(s),old);assert.equal(lesson(s).pairs.length,0);assert.throws(()=>act(s,{type:'class:invite',to:'me'}));
});
test('invitations are bilateral, duplicate blocked and withdrawal belongs to sender',()=>{
 let s=invited();const id=livePair(s).id;assert.throws(()=>act(s,{type:'class:invite',to:'lin'}));assert.throws(()=>act(s,{type:'class:reply',id,accept:true}));let other=act(s,{type:'switch',id:'lin'});assert.throws(()=>act(other,{type:'class:withdraw',id}));s=act(s,{type:'class:withdraw',id});assert.equal(livePair(s),undefined);
});
test('no response can be simulated for non-fictional participant',()=>{
 let s=invited();s.residents.find(r=>r.id==='lin').simulated=false;s.network.people.lin.simulated=false;assert.throws(()=>act(s,{type:'class:simulate',id:livePair(s).id,step:'accept'}));
});
test('choice unavailable before task publication, hidden until both submit',()=>{
 let s=invited();const id=livePair(s).id;s=act(s,{type:'class:simulate',id,step:'accept'});assert.throws(()=>act(s,{type:'class:choose',id,choice:'check'}));s=act(s,{type:'class:admin:phase',phase:2});s=act(s,{type:'class:simulate',id,step:'choice'});assert.deepEqual(pairView(s,id).choices,{});s=act(s,{type:'class:choose',id,choice:'check'});assert.equal(Object.keys(pairView(s,id).choices).length,2);assert.throws(()=>act(s,{type:'class:choose',id,choice:'try'}));
});
test('third party and teacher cannot open pair view',()=>{
 let s=choices(),id=livePair(s).id;s=act(s,{type:'switch',id:'ze'});assert.equal(pairView(s,id),null);assert.throws(()=>act(s,{type:'class:agreement',id,text:'替你决定'}));
});
test('agreement signatures do not imply sharing permission',()=>{
 let s=completed(),id=livePair(s).id;assert.equal(livePair(s).status,'completed');assert.equal(journal(s).length,1);assert.equal(shareData(s,id),null);s=act(s,{type:'class:share',id,allow:true});assert.equal(shareData(s,id),null);s=act(s,{type:'class:simulate',id,step:'share'});assert.ok(shareData(s,id));assert.ok(!JSON.stringify(shareData(s,id)).includes('私密理由'));
});
test('editing agreement clears signatures and approvals; revoke disables export',()=>{
 let s=completed(),id=livePair(s).id;s=act(s,{type:'class:share',id,allow:true});s=act(s,{type:'class:simulate',id,step:'share'});s=act(s,{type:'class:share',id,allow:false});assert.equal(shareData(s,id),null);s=act(s,{type:'class:agreement',id,text:'新版本约定'});assert.deepEqual(livePair(s).signatures,{});assert.deepEqual(livePair(s).shareConsent,{});assert.equal(livePair(s).status,'accepted');
});
test('name change invalidates old image approval',()=>{
 let s=completed(),id=livePair(s).id;s=act(s,{type:'class:share',id,allow:true});s=act(s,{type:'class:simulate',id,step:'share'});s=act(s,{type:'profile',name:'新称呼'});assert.equal(shareData(s,id),null);
});
test('private journal persists across villages and lesson reset',()=>{
 let s=completed(),id=livePair(s).id;s=act(s,{type:'class:practice',id,text:'今天我先给了书面材料。'});s=act(s,{type:'net:switch',id:PUBLIC_VILLAGE});assert.equal(journal(s)[0].practice.text,'今天我先给了书面材料。');assert.equal(lesson(s).pairs.length,0);s=act(s,{type:'net:switch',id:ACTIVITY_VILLAGE});s=act(s,{type:'class:admin:reset',confirm:true});assert.equal(journal(s).length,1);assert.equal(lesson(s).pairs.length,0);assert.equal(resident(s).confirmed,true);
});
test('projection excludes private content and requires at least three opt-ins',()=>{
 let s=choices();s=act(s,{type:'class:goal',value:'只有我能看的问题'});s=act(s,{type:'class:screen',allow:true});let summary=classSummary(s);assert.equal(summary.anonymous,false);assert.equal(summary.voted,1);assert.ok(summary.distribution.every(r=>r.count===0));assert.ok(!JSON.stringify(summary).includes('私密'));assert.ok(!JSON.stringify(summary).includes('问题'));
});
test('sample outcome action is explicit and does not overwrite controlled residents',()=>{
 let s=act(fresh(),{type:'prepareDemo'});s=act(s,{type:'net:role',role:'activity'});s=act(s,{type:'class:admin:sample'});assert.equal(lesson(s).pairs.length,2);assert.equal(classSummary(s).completed,2);assert.equal(classSummary(s).voted,4);assert.equal(classSummary(s).anonymous,true);assert.equal(resident(s).confirmed,false);assert.throws(()=>act(s,{type:'class:admin:sample'}));
 let t=act(ready(),{type:'class:admin:sample'});assert.equal(lesson(t).pairs.length,1);assert.ok(lesson(t).pairs.every(p=>!p.members.includes('he')));
});
test('card reads public profile directly and never reveals hidden field',()=>{
 let s=ready();const original=cardProfile(s,'lin').profile.interests;assert.ok(original);s=act(s,{type:'switch',id:'lin'});s=act(s,{type:'profile',profile:{interests:'特殊私密关键词'},public:{interests:false}});s=act(s,{type:'switch',id:'he'});assert.equal(cardProfile(s,'lin').profile.interests,'');assert.ok(!JSON.stringify(recommendations(s)).includes('特殊私密关键词'));s=act(s,{type:'class:admin:phase',phase:0});assert.equal(cardProfile(s,'lin'),null);
});
test('messages deduplicate and cannot reach hidden or absent residents',()=>{
 let s=ready();const a={type:'class:message',to:'lin',text:'你好，一起聊摄影吗？'};s=act(s,a);s=act(s,a);assert.equal(lesson(s).messages.length,1);assert.throws(()=>act(s,{...a,to:'missing'}));
});
test('storage roundtrip restores lesson, journal, choices and consent',()=>{
 let s=completed();const db=new Map(),storage={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)};persist(s,storage);const restored=load(storage);assert.deepEqual(lesson(restored),lesson(s));assert.deepEqual(journal(restored),journal(s));
});
test('archived lesson disallows further writes',()=>{
 let s=completed();s=act(s,{type:'net:admin:archive'});assert.throws(()=>act(s,{type:'class:goal',value:'后来'}));assert.throws(()=>act(s,{type:'class:admin:sample'}));
});
