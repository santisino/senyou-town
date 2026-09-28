import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh,transact,resident,visible,canVisit,persist,load,STORAGE } from '../state.js';
import { FIELDS } from '../data.js';
import { STATIONS } from '../journey.js';
import { PUBLIC_VILLAGE,ACTIVITY_VILLAGE,applyArrival,shareLink,mayManage,activeVillage } from '../villages.js';
import { cardData } from '../share-data.js';
const act=transact;
const publicEntry=s=>applyArrival(s,new URLSearchParams('entry=public'));
const sw=(s,id)=>act(s,{type:'net:switch',id});
const full=()=>{
 let s=act(fresh(),{type:'profile',name:'小岚',profile:Object.fromEntries(FIELDS.map(([k])=>[k,`我的${k}介绍`])),reviewed:true});
 s=act(s,{type:'meetMayor'});s=act(s,{type:'buildHome'});
 for(const key of Object.keys(STATIONS))s=act(s,{type:'finishStation',key});
 return act(s,{type:'confirm'});
};
test('fresh public entry never joins activity or public village implicitly',()=>{
 const s=publicEntry(fresh());assert.equal(s.network.active,PUBLIC_VILLAGE);assert.equal(s.stage,'open');
 assert.equal(resident(s).membership,'visitor');assert.equal(s.network.villages[ACTIVITY_VILLAGE].members.me.membership,'visitor');
 assert.equal(canVisit(s,'lin'),false);assert.equal(visible(s,'lin').profile.interests,'');
 assert.throws(()=>act(s,{type:'meetMayor'}));assert.throws(()=>act(s,{type:'confirm'}));
});
test('same profile and decoration travels, membership and visibility require consent',()=>{
 let s=act(full(),{type:'buy',product:'fern'});s=act(s,{type:'note',key:'reflection',value:'私密片段'});
 s=publicEntry(s);assert.equal(resident(s).name,'小岚');assert.ok(resident(s).decor.includes('fern'));
 assert.equal(resident(s).confirmed,false);assert.equal(resident(s).built,false);assert.equal(resident(s).notes.reflection,undefined);
 assert.equal(visible(s,'me','lin').profile.interests,'');
 s=act(s,{type:'net:join',public:{interests:true}});assert.equal(resident(s).confirmed,true);assert.equal(canVisit(s,'lin'),true);
 assert.equal(visible(s,'me','lin').profile.interests,'我的interests介绍');assert.equal(visible(s,'me','lin').profile.collaboration,'');
 s=act(s,{type:'profile',profile:{interests:'变成同一份新兴趣'}});s=sw(s,ACTIVITY_VILLAGE);
 assert.equal(resident(s).profile.interests,'变成同一份新兴趣');assert.equal(resident(s).public.collaboration,true);assert.equal(resident(s).notes.reflection,'私密片段');
 s=sw(s,PUBLIC_VILLAGE);assert.equal(resident(s).public.collaboration,false);
});
test('gift, wallet, wish requests and public results stay in original village',()=>{
 let s=act(act(act(fresh(),{type:'prepareDemo'}),{type:'switch',id:'he'}),{type:'stage',open:true});
 s=act(s,{type:'sendGift',to:'lin',item:s.items.find(i=>i.owner==='he').id});
 s=act(s,{type:'request',to:'lin'});s=act(s,{type:'publicResult',key:'class',value:{joined:true}});
 s=sw(s,PUBLIC_VILLAGE);assert.equal(s.gifts.length,0);assert.equal(s.requests.length,0);assert.equal(s.wallets.he.sent,0);assert.equal(s.publicResults['he:class'],undefined);
 s=sw(s,ACTIVITY_VILLAGE);assert.equal(s.gifts.length,1);assert.equal(s.requests.length,1);assert.equal(s.wallets.he.sent,1);assert.equal(s.publicResults['he:class'].joined,true);
});
test('new activity is not copy of public members; role scope is enforced locally',()=>{
 let s=act(publicEntry(fresh()),{type:'net:role',role:'public'});assert.equal(mayManage(s),true);
 assert.throws(()=>act(s,{type:'net:admin:create',name:'越界村'}));
 s=act(s,{type:'net:role',role:'donglai'});s=act(s,{type:'net:admin:create',name:'新一期百蚂村'});
 assert.equal(s.residents.length,1);assert.equal(resident(s).membership,'visitor');assert.equal(s.stage,'preparing');
 s=act(s,{type:'net:role',role:'public'});assert.equal(mayManage(s),false);
 assert.throws(()=>act(s,{type:'net:admin:stage',open:true}));
 s=act(s,{type:'net:role',role:'activity'});assert.equal(mayManage(s),true);
});
test('activity invitation imports public configuration but no mayor rights',()=>{
 const settings={...fresh().village,name:'摄影三班',mayor:'东来',goal:'在午休认识彼此'};
 const p=new URLSearchParams('entry=activity&vid=baima-session&policy=approval');
 let s=applyArrival(fresh(),p,settings);assert.equal(s.village.name,'摄影三班');assert.equal(s.network.manager,'resident');
 assert.equal(resident(s).membership,'visitor');s=act(s,{type:'profile',name:'新同学'});
 s=act(s,{type:'net:join',public:{headline:true}});assert.equal(resident(s).membership,'pending');assert.equal(canVisit(s,'lin'),false);
 s=act(s,{type:'net:role',role:'activity'});const req=activeVillage(s).joinRequests[0];
 s=act(s,{type:'net:admin:joinReply',id:req.id,accept:true});assert.equal(resident(s).membership,'joined');
 assert.throws(()=>act(s,{type:'net:admin:joinReply',id:req.id,accept:true}));assert.doesNotThrow(()=>act(s,{type:'meetMayor'}));
});
test('ordinary shares cannot leak profiles, activity ids, configs or roles',()=>{
 const s=full();s.residents[0].profile.headline='不得进入链接的秘密';s.network.manager='donglai';
 for(const kind of ['house','profile','wish','pair','work']) {
  const link=shareLink(s,kind),u=new URL(link);assert.equal(u.searchParams.get('entry'),'share');assert.equal(u.searchParams.get('who'),'demo');
  assert.equal(u.searchParams.get('kind'),kind);assert.deepEqual([...u.searchParams.keys()],['entry','who','kind']);assert.ok(!link.includes('秘密'));
  const landing=applyArrival(fresh(),u.searchParams);assert.equal(landing.network.active,PUBLIC_VILLAGE);assert.equal(landing.network.arrival.who,'lin');assert.equal(landing.network.manager,'resident');
 }
});
test('fictional inviter context persists and same local arrival deduplicates',()=>{
 let s=applyArrival(fresh(),new URLSearchParams('entry=share&who=he&kind=wish'));
 assert.equal(s.network.arrival.who,'he');assert.equal(s.network.arrival.content,'wish');
 s=applyArrival(s,new URLSearchParams('entry=share&who=he&kind=wish'));assert.equal(activeVillage(s).events.filter(e=>e.type==='share-arrival').length,1);
 s=sw(s,ACTIVITY_VILLAGE);assert.equal(s.network.arrival,null);
});
test('public village cannot close or archive and name is locked',()=>{
 let s=act(publicEntry(fresh()),{type:'net:role',role:'donglai'});
 for(const a of [{type:'net:admin:stage',open:false},{type:'net:admin:archive'},{type:'stage',open:false},{type:'net:admin:settings',value:{name:'改名'}}])assert.throws(()=>act(s,a));
});
test('archive preserves identity and all historical records; public not autojoined',()=>{
 let s=act(full(),{type:'net:role',role:'activity'});s=act(s,{type:'note',key:'reflection',value:'活动里的记录'});
 s=act(s,{type:'net:admin:archive'});assert.equal(s.stage,'archived');assert.throws(()=>act(s,{type:'buy',product:'fern'}));
 s=sw(s,PUBLIC_VILLAGE);assert.equal(resident(s).membership,'visitor');assert.equal(resident(s).name,'小岚');
 s=sw(s,ACTIVITY_VILLAGE);assert.equal(resident(s).notes.reflection,'活动里的记录');assert.equal(s.stage,'archived');
});
test('published content scope, participation idempotence, hide and report response',()=>{
 let s=act(full(),{type:'net:role',role:'donglai'});s=act(s,{type:'net:admin:stage',open:true});
 s=act(s,{type:'net:admin:content',space:'library',title:'光的笔记',body:'每人读一句，记住一束光。'});const c=activeVillage(s).content[0];
 s=act(s,{type:'net:takeContent',id:c.id});const result=s.publicResults[`me:village-content-${c.id}`];s=act(s,{type:'net:takeContent',id:c.id});assert.deepEqual(s.publicResults[`me:village-content-${c.id}`],result);
 s=act(s,{type:'net:admin:contentStatus',id:c.id});assert.throws(()=>act(s,{type:'net:takeContent',id:c.id}));
 s=act(s,{type:'net:report',text:'这条分享有补充建议'});const q=activeVillage(s).reports[0];s=act(s,{type:'net:admin:reportReply',id:q.id,reply:'已更新内容'});assert.equal(activeVillage(s).reports[0].reply,'已更新内容');
 s=sw(s,PUBLIC_VILLAGE);assert.equal(activeVillage(s).content.length,0);assert.equal(activeVillage(s).reports.length,0);
});
test('legacy migration keeps original state and writes one recovery backup',()=>{
 const legacy=full();delete legacy.network;for(const r of legacy.residents)delete r.membership;
 const raw=JSON.stringify(legacy),db=new Map([[STORAGE,raw]]),storage={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)};
 const s=load(storage);assert.equal(resident(s).name,'小岚');assert.equal(resident(s).confirmed,true);
 persist(s,storage);assert.equal(db.get(STORAGE+'-before-villages'),raw);
 persist(sw(s,PUBLIC_VILLAGE),storage);assert.equal(load(storage).network.active,PUBLIC_VILLAGE);assert.equal(db.get(STORAGE+'-before-villages'),raw);
});
test('share cards carry a public-village entry, not private content',()=>{
 const s=full(),card=cardData(s,'house');assert.equal(new URL(card.entryUrl).searchParams.get('entry'),'share');assert.ok(!card.entryUrl.includes('小岚'));
});
test('simulated join request adds exactly one pending request with usable inventory',()=>{
 let s=act(publicEntry(fresh()),{type:'net:role',role:'donglai'});s=act(s,{type:'net:admin:sampleRequest'});
 const req=activeVillage(s).joinRequests[0];assert.throws(()=>act(s,{type:'net:admin:sampleRequest'}));
 s=act(s,{type:'net:admin:joinReply',id:req.id,accept:true});s=act(s,{type:'switch',id:req.person});assert.equal(s.wallets[req.person].coins,100);assert.equal(resident(s).membership,'joined');
});
test('moderation pause and restore preserve home progress and other-village membership',()=>{
 let s=act(act(fresh(),{type:'prepareDemo'}),{type:'net:role',role:'donglai'});
 const prior=structuredClone(resident(s,'lin'));s=act(s,{type:'net:admin:member',id:'lin'});
 assert.equal(resident(s,'lin').membership,'removed');assert.equal(resident(s,'lin').plot,null);
 s=sw(s,PUBLIC_VILLAGE);assert.equal(resident(s,'lin').membership,'joined');
 s=sw(s,ACTIVITY_VILLAGE);s=act(s,{type:'net:admin:member',id:'lin'});
 assert.equal(resident(s,'lin').plot,prior.plot);assert.equal(resident(s,'lin').confirmed,true);assert.deepEqual(resident(s,'lin').public,prior.public);
});
test('completed profile joins approval village without retyping or rebuilding',()=>{
 let s=act(full(),{type:'net:role',role:'donglai'});s=act(s,{type:'net:admin:create',name:'第二场'});
 s=act(s,{type:'net:admin:settings',value:{},policy:'approval'});s=act(s,{type:'net:join',public:{interests:true}});
 const req=activeVillage(s).joinRequests[0];s=act(s,{type:'net:admin:joinReply',id:req.id,accept:true});
 assert.equal(resident(s).confirmed,true);assert.equal(resident(s).built,true);assert.ok(Number.isInteger(resident(s).plot));
});
test('malformed legacy storage can recover and save new state',()=>{
 const db=new Map([[STORAGE,'{broken']]),storage={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)};
 const s=load(storage);assert.doesNotThrow(()=>persist(s,storage));assert.equal(load(storage).network.version,1);
});
