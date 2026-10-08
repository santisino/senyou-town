import { PHOTO_SPOTS } from './space-guides.js?v=neighbors-v1';
import { shareLink } from './villages.js?v=cognition-v2';
// Export only an explicit, public-field whitelist. Never pass raw reports/notes to the compositor.
export const CARD_TYPES = {
  house: { name: '小屋明信片', title: '在森林里，安了一个家。', fields: ['headline', 'traits'] },
  profile: { name: '森林个人名片', title: '从这几件小事，认识我。', fields: ['interests', 'help', 'collaboration'] },
  wish: { name: '心愿邀请卡', title: '这个念头，想和你一起。', fields: ['wish'] },
  pair: { name: '双人同行卡', title: '很高兴，我们决定同行。', fields: ['collaboration', 'wish'] },
  work: { name: '共创成果卡', title: '把一个人的点子，接着往下做。', fields: [] },
};
export const LABELS = { headline: '我想这样介绍自己', traits: '认识我的线索', interests: '我喜欢', help: '我愿意搭把手', collaboration: '和我一起做事', wish: '最近的心愿' };
const person = (s, id) => s.residents.find(r => r.id === id);
const check = (ok, message) => { if (!ok) throw new Error(message); };
export function partners(s) {
  return s.residents.filter(r => r.id !== s.actor && r.confirmed &&
    [...s.requests, ...s.connections].some(q => q.status === 'accepted' &&
      ((q.from === s.actor && q.to === r.id) || (q.to === s.actor && q.from === r.id))));
}
export function sharePerson(r, fields) {
  return { id: r.id, name: r.name, appearance: { ...r.appearance }, decor: [...r.decor],
    fields: Object.fromEntries(fields.filter(k => r.public[k] && r.profile[k]?.trim()).map(k => [k, r.profile[k]])) };
}
export function cardData(s, kind, options = {}) {
  const spec = CARD_TYPES[kind], r = person(s, s.actor);
  check(spec && r?.confirmed, '请先在册子里确认自己的介绍，再制作明信片。');
  const fields = spec.fields.filter(k => (options.fields || spec.fields).includes(k));
  const people = [sharePerson(r, fields)];
  if (kind === 'pair') {
    const other = partners(s).find(p => p.id === options.partner);
    check(s.stage === 'open' && other, '先获得对方同意，建立同行约定或森友连接。');
    people.push(sharePerson(other, fields));
  }
  if (kind === 'wish') check(people[0].fields.wish && !people[0].fields.wish.includes('暂时没有'), '请先写下愿意公开的心愿，再制作邀请。');
  const contribution=kind==='work' ? s.publicResults[`${r.id}:workshop`] : null;
  const place=PHOTO_SPOTS.find(p=>p[0]===contribution?.location)?.[1];
  const work = contribution?.contribution ? (place?place+'：':'')+contribution.contribution : '';
  if (kind === 'work') check(work?.trim(), '先在共创工坊提交一份贡献，再制作成果卡。');
  const accepted = s.requests.filter(q => q.to === r.id && q.status === 'accepted').length;
  const agreed = kind==='pair' ? s.requests.find(q=>q.status==='accepted' &&
    ((q.from===r.id&&q.to===options.partner)||(q.to===r.id&&q.from===options.partner))) : null;
  const wishOwner=agreed && person(s,agreed.to);
  const common=fields.includes('wish') && wishOwner?.public.wish && agreed.wish===wishOwner.profile.wish ? agreed.wish : '';
  return { kind, village: s.village.name, people, caption: String(options.caption || '').trim().slice(0, 80),
    fields, angle: ['front', 'side'].includes(options.angle) ? options.angle : 'front',
    created: options.created || new Date().toISOString(),
    wish: kind === 'wish' ? { mode: r.wishMode, capacity: r.capacity, accepted } : null,
    common, work: work || '', demo: true, entryUrl:shareLink(s,kind) };
}
export function makePairCard(s, options) {
  const data = cardData(s, 'pair', options);
  const record = { id: crypto.randomUUID(), owner: s.actor, data, approved: [s.actor], status: 'pending' };
  const next = structuredClone(s);
  next.shareCards = [...(next.shareCards || []), record];
  return { next, record };
}
export function pairCardValid(s, record) {
  try {
    const asOwner = { ...s, actor: record.owner };
    const current = cardData(asOwner, 'pair', { ...record.data, partner: record.data.people[1].id });
    return JSON.stringify(current) === JSON.stringify(record.data);
  } catch { return false; }
}
export function respondCard(s, id, accept) {
  const next = structuredClone(s), card = next.shareCards?.find(c => c.id === id);
  check(card && card.data.people.some(p => p.id === s.actor), '这不是你的分享邀请。');
  check(card.status === 'pending' && pairCardValid(s, card), '这张卡已失效，请用最新资料重新制作。');
  check(!card.approved.includes(s.actor), '你已经确认过这张卡。');
  if (!accept) card.status = 'declined';
  else { card.approved.push(s.actor); card.status = 'approved'; }
  return next;
}
export function canExportPair(s, card) {
  return !!card && card.status === 'approved' && pairCardValid(s, card) &&
    card.data.people.every(p => card.approved.includes(p.id)) && card.data.people.some(p => p.id === s.actor);
}
