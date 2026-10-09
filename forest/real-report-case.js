import { fresh, transact, persist, load, STORAGE } from './state.js?v=real-report-v1';
import { checkpoint } from './villages.js?v=cognition-v2';
import { STATIONS } from './journey.js?v=cognition-v2';
import { CASE_PROFILE } from './real-report-data.js?v=real-report-v1';

export const CASE_STORAGE = 'senyou-bestdisc-case-v1';
export function caseStorage(storage) {
  return {
    getItem: key => storage.getItem(key === STORAGE ? CASE_STORAGE : CASE_STORAGE + '-' + key),
    setItem: (key, value) => storage.setItem(key === STORAGE ? CASE_STORAGE : CASE_STORAGE + '-' + key, value),
  };
}
export function freshReportCase() {
  let s = fresh();
  const r = s.residents.find(x => x.id === 'me');
  Object.assign(r, {
    name: '知微（化名）', group: '真实报告融合案例', profile: { ...r.profile, ...CASE_PROFILE },
    simulated: true, controlled: true, arrived: true, plot: 5, built: true,
    confirmed: true, reviewed: true, membership: 'joined', origin: '脱敏报告案例',
    journey: { metMayor: true, key: true, stations: Object.keys(STATIONS) },
    decor: ['fern'], signature: { ...r.signature, name: '一页小小的清单' },
  });
  s = transact(s, { type: 'prepareDemo' });
  s = transact(s, { type: 'stage', open: true });
  s = transact(s, { type: 'cog:report', id: 'bestdisc-case', confirmed: true });
  s.entry = { version: 1, role: 'employee', mode: 'case', employeeActor: 'me', preview: null };
  s.realReportCase = { version: 1, person: 'me', report: 'bestdisc-case' };
  s.welcomeSeen = true;
  s.village.goal = '代入一位脱敏案例居民，探索真实报告如何进入小屋。生活故事与公开介绍是演示草稿，不代表报告主人的实际表达。';
  return checkpoint(s);
}
export function loadReportCase(storage) {
  const s = load(storage);
  if (s.realReportCase?.version === 1) return s;
  const initial = freshReportCase();
  persist(initial, storage);
  return initial;
}
