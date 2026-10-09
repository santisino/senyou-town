import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, resident, transact as act, persist, load, STORAGE, visible, canVisit } from '../state.js';
import { caseStorage, CASE_STORAGE, freshReportCase, loadReportCase } from '../real-report-case.js';
import { sample, cognition, books, mirrorQuestions, labComparison } from '../cognition-data.js';
import { BESTDISC_CASE_REPORT, BESTDISC_CASE_BOOKS, CASE_PROFILE } from '../real-report-data.js';

test('checked PDF values and deltas are preserved exactly, with independent states', () => {
  const p = BESTDISC_CASE_REPORT;
  assert.deepEqual(p.natural, [37, 71, 48, 88]);
  assert.deepEqual(p.work, [28, 82, 59, 73]);
  assert.deepEqual(p.pressure, [46, 50, 37, 94]);
  assert.deepEqual(p.work.map((v,i)=>v-p.natural[i]), [-9,11,11,-15]);
  assert.deepEqual(p.pressure.map((v,i)=>v-p.work[i]), [18,-32,-22,21]);
  assert.equal(p.type, 'CI 型');
  assert.ok(p.real && p.provenance.length === 7);
  assert.match(p.lightSource, /不是原报告/);
});
test('case starts ready but never fabricates reflection, self-rating confirmation or publication', () => {
  const s = freshReportCase(), r = resident(s);
  assert.equal(r.name, '知微（化名）');
  assert.equal(s.entry.mode, 'case');
  assert.equal(s.stage, 'open');
  assert.equal(sample(s).id, 'bestdisc-case');
  assert.deepEqual(cognition(s).mix, BESTDISC_CASE_REPORT.natural);
  assert.deepEqual(cognition(s).mirror.answers, ['','','']);
  assert.equal(cognition(s).seen.mirror, undefined);
  assert.equal(cognition(s).stormUnlocked, false);
  assert.equal(r.cognitionPublication, undefined);
  assert.ok(canVisit(s, 'lin'));
  assert.equal(new Set(s.residents.map(x=>x.plot)).size, s.residents.length);
});
test('actual 16 terms and tailored interview prompts replace generic sample books/questions', () => {
  let s = freshReportCase();
  assert.deepEqual(books(s).map(b=>b.title), ['逻辑清晰','完美主义者','准确','精确','按部就班','细致','顺从','有说服力','有表达力','健谈','宽容','优柔寡断','随和','积极','灵活敏锐','躁动不安']);
  assert.deepEqual(mirrorQuestions(s), BESTDISC_CASE_REPORT.questions);
  for (const b of BESTDISC_CASE_BOOKS) s=act(s,{type:'cog:book',id:b.id,match:'part',text:'CASE_PRIVATE_NOTE'});
  assert.equal(Object.keys(cognition(s).bookMarks).length, 16);
  assert.ok(!JSON.stringify(visible(s,'me','lin')).includes('CASE_PRIVATE_NOTE'));
});
test('exterior adjustment never changes actual report, or silently changes public manual', () => {
  let s = freshReportCase();
  const p = JSON.stringify(sample(s)), line = resident(s).profile.collaboration;
  s=act(s,{type:'cog:mix',values:[10,20,30,40]});
  s=act(s,{type:'cog:light',id:'autonomy',need:3});
  assert.equal(JSON.stringify(sample(s)), p);
  assert.equal(resident(s).profile.collaboration, line);
});
test('case storage is independent; reset and reload do not replace normal user records', () => {
  const db = new Map(), storage = {getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)};
  const normal = fresh(); normal.residents[0].name='NORMAL_SENTINEL'; persist(normal, storage);
  const before = db.get(STORAGE), isolated = caseStorage(storage);
  let s = loadReportCase(isolated);
  s=act(s,{type:'cog:window-note',id:'natural',text:'CASE_DRAFT'}); persist(s, isolated);
  assert.equal(cognition(loadReportCase(isolated)).windowNotes.natural, 'CASE_DRAFT');
  persist(freshReportCase(), isolated);
  assert.equal(db.get(STORAGE), before);
  assert.equal(resident(load(storage)).name, 'NORMAL_SENTINEL');
  assert.ok(db.has(CASE_STORAGE));
});
test('real report source stays private, public drafts label living information as demo additions', () => {
  const s=freshReportCase(), v=visible(s,'me','lin');
  assert.ok(v.cognitionPublication == null);
  assert.ok(!JSON.stringify(v).includes('bestdisc-case'));
  for(const key of ['interests','story','learning','wish']) assert.match(CASE_PROFILE[key], /演示补写/);
  for(const key of ['help','collaboration']) assert.match(CASE_PROFILE[key], /协作草稿/);
  const published = JSON.stringify(BESTDISC_CASE_REPORT);
  assert.ok(!/https?:|\b1[3-9]\d{9}\b|pcode|numbers\//.test(published));
});
test('lab uses real own values and explicitly simulated partner; no unrelated pair report is asserted', () => {
  let s=freshReportCase();
  assert.throws(()=>act(s,{type:'cog:lab-start',partner:'an'}));
  s=act(s,{type:'cog:lab-start',partner:'an',sampleConsent:true});
  const result=labComparison(s);
  assert.deepEqual(result.a.natural,[37,71,48,88]);
  assert.equal(result.b.id,'harbor');
  assert.equal(result.b.real,undefined);
  s=act(s,{type:'switch',id:'an'});
  s=act(s,{type:'cog:report',id:'harbor',confirmed:true});
  assert.throws(()=>act(s,{type:'cog:lab-start',partner:'me',sampleConsent:true}));
});
