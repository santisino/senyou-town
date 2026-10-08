import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,transact as act,resident,visible,load,persist} from '../state.js';
import {cognition,sample,SAMPLES,BOOKS,REACTIONS,progress,recipe,labComparison} from '../cognition-data.js';
import {publicPerson,classGraph,matchList} from '../connect-data.js';
import {PUBLIC_VILLAGE,ACTIVITY_VILLAGE} from '../villages.js';
function ready(){let s=act(fresh(),{type:'net:role',role:'activity'});s=act(s,{type:'prepareDemo'});s=act(s,{type:'social:seed'});s=act(s,{type:'stage',open:true});return act(s,{type:'switch',id:'lin'});}
const report=s=>act(s,{type:'cog:report',id:'grove',confirmed:true});
const lab=s=>act(s,{type:'cog:lab-start',partner:'an',sampleConsent:true});
test('report is opt-in, built-owner only, and replacing never silently rewrites public expression',()=>{
 assert.throws(()=>report(fresh()));let s=ready();assert.throws(()=>act(s,{type:'cog:report',id:'grove'}));assert.throws(()=>act(s,{type:'cog:report',id:'grove',confirmed:true,owner:'an'}));s=report(s);const old=resident(s).profile.collaboration;assert.throws(()=>act(s,{type:'cog:report',id:'spark',confirmed:true}));s=act(s,{type:'cog:report',id:'spark',confirmed:true,replace:true});assert.equal(sample(s).id,'spark');assert.equal(resident(s).profile.collaboration,old);
});
test('four-dimensional calibration is a spectrum, not a forced total, and preserves original report',()=>{
 let s=report(ready());const original=JSON.stringify(SAMPLES);s=act(s,{type:'cog:mix',values:[10,100,60,80]});assert.deepEqual(cognition(s).mix,[10,100,60,80]);assert.equal(JSON.stringify(SAMPLES),original);assert.deepEqual(sample(s).natural,[48,60,72,82]);assert.throws(()=>act(s,{type:'cog:mix',values:[-1,0,1,2]}));assert.throws(()=>act(s,{type:'cog:mix',values:[NaN,0,1,2]}));
});
test('three-state comparison requires actively opening pressure; two pressure books remain locked until then',()=>{
 let s=report(ready());assert.equal(BOOKS.length,16);assert.throws(()=>act(s,{type:'cog:book',id:'book-11',match:'yes'}));assert.throws(()=>act(s,{type:'cog:window',id:'pressure'}));for(const id of ['natural','work','pressure'])s=act(s,{type:'cog:window',id,confirmed:id==='pressure'});assert.ok(cognition(s).seen.windows);for(const b of BOOKS)s=act(s,{type:'cog:book',id:b.id,match:'part',text:'这个词要看具体情境',turned:true});assert.equal(Object.keys(cognition(s).bookMarks).length,16);
});
test('mirror, rating, report and private door never appear in visitor views, graph or connection summaries',()=>{
 let s=report(ready());s=act(s,{type:'cog:mirror',answers:['PRIVATE_SENTINEL','PRIVATE_SENTINEL','PRIVATE_SENTINEL'],rating:8,reflection:'PRIVATE_SENTINEL'});s=act(s,{type:'cog:door',strength:'PRIVATE_SENTINEL',practice:'PRIVATE_SENTINEL',suggestion:'PRIVATE_SENTINEL'});assert.equal(cognition(s).mirror.rating,8);assert.throws(()=>act(s,{type:'cog:mirror',answers:['a','b','c'],rating:11}));
 s=act(s,{type:'switch',id:'an'});for(const view of [visible(s,'lin'),publicPerson(s,'lin'),classGraph(s),matchList(s)])assert.ok(!JSON.stringify(view).includes('PRIVATE_SENTINEL'));
});
test('publication is one confirmed canonical line, not entire reflection; unpublishing and closed stage mask it',()=>{
 let s=report(ready());assert.throws(()=>act(s,{type:'cog:publish',text:'PUBLIC_LINE',public:true}));s=act(s,{type:'cog:publish',text:'PUBLIC_LINE',confirmed:true,public:true,source:'mirror'});assert.equal(resident(s).profile.collaboration,'PUBLIC_LINE');assert.equal(visible(s,'lin','an').profile.collaboration,'PUBLIC_LINE');assert.equal(publicPerson(s,'lin','an')?.profile?.collaboration,'PUBLIC_LINE');s=act(s,{type:'cog:publish',text:'HIDDEN_LINE',confirmed:true,public:false});assert.equal(visible(s,'lin','an').cognitionPublication,null);assert.equal(visible(s,'lin','an').profile.collaboration,'');s=act(s,{type:'cog:publish',text:'PUBLIC_LINE',confirmed:true,public:true});s=act(s,{type:'stage',open:false});assert.equal(visible(s,'lin','an').cognitionPublication,null);
});
test('private cognition travels with person; permissions remain village-specific and survive persistence',()=>{
 let s=report(ready());s=act(s,{type:'cog:consent',value:true});s=act(s,{type:'cog:publish',text:'同一份协作介绍',confirmed:true,public:true});s=act(s,{type:'net:switch',id:PUBLIC_VILLAGE});assert.equal(sample(s).id,'grove');assert.ok(!resident(s).cognitionConsent);s=act(s,{type:'net:switch',id:ACTIVITY_VILLAGE});assert.equal(resident(s).cognitionConsent,true);assert.equal(resident(s).public.collaboration,true);const m=new Map(),db={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};persist(s,db);assert.deepEqual(cognition(load(db)),cognition(s));
});
test('light choices alter private recipe only, never imply traits or auto-publish',()=>{
 let s=report(ready());const old=resident(s).profile.collaboration;s=act(s,{type:'cog:light',id:'support',on:false,need:3});assert.equal(cognition(s).lightOn[3],false);assert.match(recipe(s),/倾听/);assert.equal(resident(s).profile.collaboration,old);assert.throws(()=>act(s,{type:'cog:light',id:'support',need:5}));
});
test('lab does not infer authorization from visiting and permits explicitly authored samples only',()=>{
 let s=report(ready());assert.throws(()=>act(s,{type:'cog:lab-start',partner:'an'}));assert.throws(()=>act(s,{type:'cog:lab-start',partner:'lin',sampleConsent:true}));s=lab(s);assert.ok(cognition(s).lab.simulated);assert.equal(labComparison(s).dimensions.length,4);s=act(s,{type:'stage',open:false});assert.throws(()=>act(s,{type:'cog:lab-start',partner:'he',sampleConsent:true}));
});
test('lab is sequential; five visual illustrations never overwrite pair comparison',()=>{
 let s=lab(report(ready()));assert.throws(()=>act(s,{type:'cog:lab-step',step:3}));s=act(s,{type:'cog:lab-step',step:2});const comparison=labComparison(s);assert.equal(REACTIONS.length,5);for(const x of REACTIONS)s=act(s,{type:'cog:lab-focus',id:x[0],illustration:true});assert.deepEqual(labComparison(s),comparison);s=act(s,{type:'cog:lab-step',step:3});assert.ok(cognition(s).seen.lab);
});
test('five practice entries are private self-reports, deduplicated, bounded; no cured success field',()=>{
 let s=lab(report(ready()));s=act(s,{type:'cog:lab-step',step:2});s=act(s,{type:'cog:lab-step',step:3});const a={type:'cog:lab-check',text:'PRIVATE_PRACTICE',outcome:'adjust'};s=act(s,a);s=act(s,a);assert.equal(cognition(s).lab.checks.length,1);for(let i=1;i<5;i++)s=act(s,{...a,text:'PRIVATE_PRACTICE_'+i});assert.throws(()=>act(s,{...a,text:'six'}));assert.ok(!JSON.stringify(cognition(s).lab).includes('cured'));s=act(s,{type:'switch',id:'an'});assert.ok(!JSON.stringify(publicPerson(s,'lin')).includes('PRIVATE_PRACTICE'));
});
test('old states without cognition still load and all seven exploration marks are independent',()=>{
 let s=ready();assert.equal(cognition(s),null);assert.equal(progress(s).length,7);s=report(s);s=act(s,{type:'cog:mix',values:[40,50,60,70]});assert.equal(progress(s).filter(x=>x.done).length,1);
});
