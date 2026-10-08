import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,transact as act,visible,resident,load,persist} from '../state.js';
import {matchList,connectionReasons,previewData,publicPerson,classGraph,classInsights,growthInfo,privacy,introduction,social,greeting} from '../connect-data.js';
import {lesson,livePair,classSummary,journal} from '../lesson-data.js';
import {PUBLIC_VILLAGE,ACTIVITY_VILLAGE} from '../villages.js';
function ready(){let s=act(fresh(),{type:'net:role',role:'activity'});s=act(s,{type:'prepareDemo'});s=act(s,{type:'social:seed'});s=act(s,{type:'stage',open:true});return act(s,{type:'switch',id:'he'});}
test('old opening controls and migrated open states all allow discovering partners',()=>{
 let s=ready();assert.equal(lesson(s).phase,1);s.network.villages[s.network.active].lesson.phase=0;assert.equal(lesson(s).phase,1);s=act(s,{type:'class:invite',to:'lin'});assert.ok(livePair(s));s=act(s,{type:'net:admin:stage',open:false});assert.equal(lesson(s).phase,0);
});
test('preparing blocks new social routes and class maps',()=>{
 let s=ready();s=act(s,{type:'class:admin:phase',phase:0});assert.equal(publicPerson(s,'lin'),null);assert.equal(matchList(s).length,0);assert.equal(classGraph(s).nodes.length,0);assert.throws(()=>act(s,{type:'social:light',to:'lin'}));
});
test('seeding never overwrites human actor or controlled sample',()=>{
 let s=ready();s=act(s,{type:'social:profile',profile:{challenges:'我自己的问题'},public:{challenges:false}});s=act(s,{type:'social:seed'});assert.equal(resident(s).profile.challenges,'我自己的问题');assert.equal(s.residents.find(r=>r.id==='me').social,undefined);
});
test('seven dimensions supported with explicit public evidence, no percentages',()=>{
 let s=ready();s=act(s,{type:'social:profile',profile:{workBackground:'产品运营',wantToLearn:'点子',challenges:'怎样排好想法的优先级'},public:{workBackground:true,wantToLearn:true,challenges:true}});
 s=act(s,{type:'profile',profile:{interests:'摄影',learning:'摄影',wish:'摄影'}});
 const dims=connectionReasons(s,'he','lin').map(x=>x.dimension);for(const d of ['兴趣','心愿','探索','工作','困惑','成长','协作偏好'])assert.ok(dims.includes(d),d);
 assert.ok(!JSON.stringify(matchList(s)).includes('%'));
});
test('private own and partner fields do not leak into recommendations, graphs or previews',()=>{
 let s=ready();s=act(s,{type:'social:profile',profile:{challenges:'独家秘密'},public:{challenges:false}});s=act(s,{type:'switch',id:'lin'});s=act(s,{type:'social:profile',profile:{challenges:'独家秘密'},public:{challenges:true}});s=act(s,{type:'switch',id:'he'});
 assert.ok(!JSON.stringify(matchList(s)).includes('独家秘密'));assert.ok(!JSON.stringify(previewData(s,'lin').reasons).includes('独家秘密'));assert.equal(visible(s,'he','lin').profile.challenges,'');
});
test('optional content is canonical, travels with person, new village permission is not inherited',()=>{
 let s=ready();s=act(s,{type:'social:profile',profile:{workBackground:'设计师'},public:{workBackground:true}});assert.equal(visible(s,'he','lin').profile.workBackground,'设计师');s=act(s,{type:'net:switch',id:PUBLIC_VILLAGE});assert.equal(resident(s).profile.workBackground,'设计师');assert.equal(privacy(resident(s)).report,false);s=act(s,{type:'net:switch',id:ACTIVITY_VILLAGE});assert.equal(resident(s).public.workBackground,true);
});
test('report suggestion must be confirmed, no report or hidden preference yields no guessed style',()=>{
 let s=ready();assert.throws(()=>act(s,{type:'social:report',preference:'detail',confirmed:false}));s=act(s,{type:'social:report',clear:true});assert.equal(previewData(s,'lin').preferences[0],undefined);assert.ok(!connectionReasons(s,'he','lin').some(x=>x.dimension==='协作偏好'));
});
test('identity requires confirmed manual and all three intros respect hidden fields',()=>{
 assert.throws(()=>act(fresh(),{type:'social:identity',identity:'spark',style:'brief'}));let s=ready();s=act(s,{type:'profile',profile:{learning:'隐藏学习'},public:{learning:false}});for(const style of ['brief','friendly','invitation'])assert.ok(!introduction(resident(s),style).includes('隐藏学习'));s=act(s,{type:'social:identity',identity:'spark',style:'brief'});assert.ok(resident(s).social.identityConfirmed);
});
test('light is reversible and does not establish friendship',()=>{
 let s=ready();s=act(s,{type:'social:light',to:'lin'});assert.equal(social(s).lights.length,1);assert.equal(s.friends.length,0);s=act(s,{type:'social:light',to:'lin'});assert.equal(social(s).lights.length,0);
});
test('advice deduplicates, anonymous requires recipient permission and stays village scoped',()=>{
 let s=ready();assert.throws(()=>act(s,{type:'social:advice',to:'lin',text:'建议',anonymous:true}));const a={type:'social:advice',to:'lin',text:'可以练习拍树影'};s=act(s,a);s=act(s,a);assert.equal(social(s).advice.length,1);s=act(s,{type:'switch',id:'lin'});s=act(s,{type:'social:privacy',value:{anonymous:true}});s=act(s,{type:'switch',id:'he'});s=act(s,{...a,text:'匿名建议',anonymous:true});assert.equal(social(s).advice.length,2);s=act(s,{type:'net:switch',id:PUBLIC_VILLAGE});assert.equal(social(s).advice.length,0);
});
test('greeting differs with shared collaboration preference',()=>{
 const s=ready();assert.notEqual(greeting(s,'lin'),greeting(s,'an'));assert.match(greeting(s,'an'),/方便的时间|材料|背景/);
});
test('map requires opt in, preserves anonymous names and revocation removes node and edges',()=>{
 let s=ready();let graph=classGraph(s);assert.ok(graph.nodes.length>=3);assert.ok(graph.nodes.every(n=>n.label.startsWith('森友')));s=act(s,{type:'social:privacy',value:{map:false}});graph=classGraph(s);assert.ok(!graph.nodes.some(x=>x.id==='he'));assert.ok(!graph.edges.some(e=>e.a==='he'||e.b==='he'));s=act(s,{type:'net:role',role:'resident'});assert.equal(classGraph(s).nodes.length,0);
});
test('insights have no unsupported claims and change with observed choices',()=>{
 let s=ready();assert.match(classInsights(classSummary(s)).observations[0],/不足/);s=act(s,{type:'class:admin:sample'});const summary=classSummary(s);assert.equal(lesson(s).phase,2);assert.ok(summary.completed>0);const insight=classInsights({...summary,anonymous:true,voted:3,distribution:summary.distribution.map((x,i)=>({...x,count:i===0?3:0}))});assert.match(insight.observations[0],/3 人/);assert.match(insight.experiment,/反例/);
});
test('practice timeline appends, deduplicates double clicks, and stays private across villages',()=>{
 let s=act(fresh(),{type:'prepareDemo'});s=act(s,{type:'net:role',role:'activity'});s=act(s,{type:'class:admin:sample'});s=act(s,{type:'switch',id:'lin'});const id=journal(s)[0].id;
 assert.equal(growthInfo(s,'lin',Date.now()+8*86400000).due,1);
 const a={type:'social:practice',id,text:'先问了对方最担心什么',next:'下次留出两分钟',outcome:'worked'};s=act(s,a);s=act(s,a);s=act(s,{...a,text:'第二次更顺畅'});assert.equal(journal(s)[0].practices.length,2);assert.equal(growthInfo(s).stage,'长出新叶');s=act(s,{type:'net:switch',id:PUBLIC_VILLAGE});assert.equal(journal(s)[0].practices.length,2);assert.ok(!JSON.stringify(publicPerson(s,'lin')).includes('第二次更顺畅'));
});
test('persistence restores social identity, preferences and per-village privacy',()=>{
 let s=ready();s=act(s,{type:'social:identity',identity:'anchor',style:'invitation'});const m=new Map(),db={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};persist(s,db);const restored=load(db);assert.deepEqual(resident(restored).social,resident(s).social);assert.deepEqual(privacy(resident(restored)),privacy(resident(s)));
});
test('negative interests do not become positive shared-interest claims',()=>{
 let s=ready();s=act(s,{type:'profile',profile:{interests:'不喜欢摄影'}});assert.ok(!connectionReasons(s,'he','lin').some(x=>x.dimension==='兴趣'));
});
test('combined settings are atomic if report confirmation fails',()=>{
 const s=ready(),old=JSON.stringify(s);assert.throws(()=>act(s,{type:'social:settings',profile:{workBackground:'不应保存'},report:{preference:'ideas',confirmed:false}}));assert.equal(JSON.stringify(s),old);
});
test('ordinary unfinished resident cannot bypass discovery through a new card action',()=>{
 let s=ready();s=act(s,{type:'switch',id:'me'});s=act(s,{type:'net:role',role:'resident'});assert.equal(publicPerson(s,'lin'),null);assert.equal(previewData(s,'lin'),null);assert.throws(()=>act(s,{type:'social:advice',to:'lin',text:'你好'}));
});
