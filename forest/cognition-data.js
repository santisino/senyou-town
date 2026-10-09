// Private cognition belongs to a person, not a village or a public profile.
// Authored samples and one manually checked client report; NOT a validated DISC engine.
import { BESTDISC_CASE_REPORT, BESTDISC_CASE_BOOKS } from './real-report-data.js?v=real-report-v1';
export const DIMS=['D','I','S','C'];
export const REACTIONS=[['stable','稳定反应','差异可以成为分工线索。先说清各自负责什么。'],['resonance','共振反应','起点相近，也要确认是不是理解同一件事。'],['bubble','气泡反应','相近的表面下可能藏着不同标准。把在意点说出来。'],['delay','延迟冒泡','日常和压力下可能不同。先询问触发条件。'],['none','无反应','这一项没有突出线索，不等于不适合合作。']];
export const STYLES=[['D','瞭望与行动','先看方向，愿意推动第一步'],['I','交流与灵感','从交流中找到新的可能'],['S','安稳与陪伴','在清楚的节奏里持续推进'],['C','专注与工艺','用依据与标准把事情做好']];
export const WINDOWS=[['natural','晨光窗 · 自然状态','没有额外要求时，我通常怎样做事？'],['work','工作窗 · 工作状态','面对工作要求时，我做了哪些调整？'],['pressure','风暴窗 · 压力状态','时间、信息或支持不足时，我可能怎样反应？']];
export const LIGHTS=[['stability','稳定之光','清楚的规则、标准与安排','如果安排总在变，我可能需要反复确认下一步。'],['recognition','认可之光','真诚、具体到行为的认可','如果付出没有被看见，我可能不确定该继续什么。'],['autonomy','自主之光','有边界的专业自主权','如果每一步都被代替决定，我可能难以发挥自己的方法。'],['support','支持之光','有人倾听，也有人一起承担','如果困难只能自己扛，我可能更难开口求助。']];
export const BOOKS=[
 ['推动','D','core','讨论迟迟没有下一步时，愿意先提出一个可以行动的方案。'],
 ['决断','D','core','信息不完全时，也会尝试明确一个暂时的决定和风险边界。'],
 ['挑战','D','secondary','遇到难题时，愿意问一问还有没有更直接的突破口。'],
 ['催促','D','shadow','进度变慢时，可能先催结果，而忘了问对方卡在哪里。'],
 ['表达','I','core','用交流把模糊想法说出来，让别人能够参与。'],
 ['联结','I','core','主动把不同的人和线索连接起来。'],
 ['感染','I','secondary','分享愿景时，愿意带动大家一起尝试。'],
 ['分散','I','shadow','新点子很多时，可能同时打开太多事情，难以收尾。'],
 ['倾听','S','core','别人还没有说清楚时，愿意留一点耐心。'],
 ['持续','S','core','在稳定安排下，把一件事持续往前推进。'],
 ['照顾','S','secondary','会留意改变对身边人的影响。'],
 ['退让','S','pressure','紧张时，可能先答应别人，却没有表达自己的真实需要。'],
 ['分析','C','core','做决定前，愿意检查依据和关键条件。'],
 ['精确','C','secondary','对细节和标准有要求，也愿意认真检查。'],
 ['质疑','C','shadow','看到漏洞时，可能直接指出问题，让对方误以为在否定他。'],
 ['反复核对','C','pressure','压力很大时，可能不断补充信息，需要明确什么时候已经足够。'],
].map(([title,dim,kind,text],i)=>({id:'book-'+i,title,dim,kind,text}));
export const SAMPLES={
 'bestdisc-case':BESTDISC_CASE_REPORT,
 grove:{id:'grove',title:'林间工匠 · 虚构报告 A',natural:[48,60,72,82],work:[62,52,65,88],pressure:[76,35,46,94],lights:[3,2,3,2],
  summary:'常用依据与清楚的安排进入协作，也愿意交流新点子。压力下可能更反复核对。',
  meeting:'先发背景和关键材料；会上先说明需要共同决定什么。',
  strength:'把分散信息整理成可以执行的标准。',practice:'给分析设一个截止点，先说当前结论再补充依据。'},
 spark:{id:'spark',title:'林间点灯人 · 虚构报告 B',natural:[75,86,43,38],work:[82,72,50,54],pressure:[92,60,26,70],lights:[2,3,3,2],
  summary:'常从交流和行动中找方向。面对要求会补充检查，压力下可能推进得更急。',
  meeting:'先说目标和第一步，再一起确认风险与检查标准。',
  strength:'把讨论变成一次愿意开始的尝试。',practice:'推动之前，先问对方最担心的一个条件。'},
 harbor:{id:'harbor',title:'湖畔守望者 · 虚构报告 C',natural:[35,64,88,66],work:[49,55,82,76],pressure:[58,35,70,84],lights:[3,2,2,3],
  summary:'常通过倾听与持续推进支持团队。压力下可能更谨慎，也更难表达自己的负担。',
  meeting:'提前说明安排和变化，留一点确认与表达顾虑的时间。',
  strength:'留意彼此的需要，让计划稳定地落地。',practice:'答应新任务前，先表达自己的容量和需要的支持。'},
};
const clone=x=>structuredClone(x),fail=m=>{throw Error(m);};
const text=(v,max=400)=>String(v||'').trim().slice(0,max);
export function cognition(s,id=s.actor){return s.network?.cognition?.[id]||null;}
export function sample(s,id=s.actor){return SAMPLES[cognition(s,id)?.reportId]||null;}
export function books(s,id=s.actor){return sample(s,id)?.real?BESTDISC_CASE_BOOKS:BOOKS;}
export function recipe(s,id=s.actor){const c=cognition(s,id);if(!c)return '';return LIGHTS.filter((_,i)=>c.lightNeeds[i]>=2).map(x=>x[2]).join('；')||'先询问我当下需要什么支持。';}
export function progress(s){const c=cognition(s);return ['exterior','windows','shelf','door','mirror','sun','lab'].map(key=>({key,done:!!c?.seen[key]}));}
function freshCognition(reportId){const r=SAMPLES[reportId];return {version:1,reportId,mix:[...r.natural],seen:{},window:'natural',windowsSeen:[],windowNotes:{},bookMarks:{},stormUnlocked:false,mirror:{answers:['','',''],rating:5,reflection:''},lightNeeds:[...r.lights],lightOn:[true,true,true,true],door:{strength:r.strength,practice:r.practice,suggestion:r.meeting},lab:null};}
export const QUESTIONS=['最近一次感到压力的具体场景是什么？你首先做了什么？','你当时最在意什么？别人可能怎样理解你的反应？','如果再来一次，你希望怎样表达需要，或得到什么支持？'];
export function mirrorQuestions(s){const p=sample(s),id=p?.id;if(p?.real)return p.questions;return id==='spark'?['最近一次想赶快推进、但伙伴还没准备好时，你具体做了什么？','你急着推动的背后最担心什么？伙伴可能怎样理解你的催促？','下次开始前，你可以先问伙伴哪一个条件，让推动更有支持？']:id==='harbor'?['最近一次已经有些吃力、却仍答应了别人时，发生了什么？','你当时没有说出的顾虑是什么？别人可能以为你完全没问题吗？','下一次答应之前，你想怎样说明自己的容量或需要的支持？']:['最近一次反复核对、迟迟难以下决定时，发生了什么？','你最想确认的依据是什么？伙伴可能怎样理解你的检查？','下一次怎样约定“信息已经足够”的标准，再迈出第一步？'];}
export function mirrorFeedback(s){const c=cognition(s);if(!c)return '';const a=c.mirror.answers;return a.every(x=>x.trim())?`你记录了「${a[0].slice(0,70)}」。与其急着给自己下结论，可以把「${a[2].slice(0,90)}」变成下一次提前说出的需要。${sample(s).real?'案例原报告':'示例报告'}提示压力下可能出现${sample(s).id==='spark'?'加快推进':sample(s).id==='harbor'?'更谨慎或退让':'更谨慎地检查细节'}；是否符合，以你的经历为准。`:'先记录一次真实经历；这里不依据空白答案猜测你。';}
export function labComparison(s){const c=cognition(s);if(!c?.lab)return null;const a=sample(s),b=SAMPLES[c.lab.partnerReport];if(!a||!b)return null;const differences=a.natural.map((v,i)=>Math.abs(v-b.natural[i]));const max=differences.indexOf(Math.max(...differences));return {a,b,max,dimensions:DIMS.map((dim,i)=>{let type;if(a.natural[i]<55&&b.natural[i]<55)type='无反应';else if((a.natural[i]<55&&a.pressure[i]>=75)||(b.natural[i]<55&&b.pressure[i]>=75))type='延迟冒泡';else if(a.natural[i]>=55&&b.natural[i]>=55)type=Math.abs(a.work[i]-b.work[i])>20?'气泡反应':'共振反应';else type='稳定反应';return {dim,type,a:a.natural[i],b:b.natural[i]};})};}
export const PRESCRIPTIONS=[
 ['information','信息需求协议','开始前各说清：需要什么信息、多少信息、什么时候足够。','一个人先发关键材料，另一个人确认还差哪一个条件。'],
 ['pace','节奏协议','先约定下一次同步时间，再说清中途需要提醒的变化。','想加速时先询问卡点，想多想一会儿时说明何时给结论。'],
 ['standard','达标线锁定','开始前共同写下“这一次做到什么就够了”。','先区分必须项与以后再做的项，避免事后不断加码。'],
 ['voice','沉默翻译器','暂时不回答时，说清自己正在思考、担心或需要什么。','先说“我在想……”，再约定什么时候回应。'],
];
export function labPrescription(s){const c=cognition(s),l=c?.lab;return l?PRESCRIPTIONS.find(x=>x[0]===l.prescription)||PRESCRIPTIONS[0]:null;}
export function cognitionAction(original,a){const s=clone(original);s.network.cognition||={};let c=cognition(s);const r=s.residents.find(x=>x.id===s.actor);
 if(a.owner&&a.owner!==s.actor)fail('私人认知区只供本人使用。');
 if(!r?.built||!r.journey?.key)fail('先领取钥匙并搭起自己的小屋。');
 if(a.type==='cog:report'){
  if(!SAMPLES[a.id])fail('请选择有明确来源的报告案例或虚构示例。');
  if(!a.confirmed)fail('请确认报告来源，以及这不是你本人的真实测评。');
  if(c&&c.reportId!==a.id&&!a.replace)fail('更换示例会重置私人探索，请先确认。');
  s.network.cognition[s.actor]=c?.reportId===a.id?c:freshCognition(a.id);return s;
 }
 if(!c)fail('先在私人区报告匣中主动载入一份示例报告。');
 if(a.type==='cog:lab-reset'){c.lab=null;return s;}
 if(a.type==='cog:mix'){if(!Array.isArray(a.values)||a.values.length!==4||a.values.some(v=>!Number.isFinite(v)||v<0||v>100))fail('四项外观倾向须在 0–100 之间。');c.mix=[...a.values];c.seen.exterior=true;}
 else if(a.type==='cog:window'){if(!WINDOWS.some(x=>x[0]===a.id))fail('找不到这扇窗。');if(a.id==='pressure'&&!a.confirmed)fail('风暴窗需要本人主动开启。');c.window=a.id;if(a.id==='pressure')c.stormUnlocked=true;if(!c.windowsSeen.includes(a.id))c.windowsSeen.push(a.id);c.seen.windows=c.windowsSeen.length===3;}
 else if(a.type==='cog:window-note'){if(!WINDOWS.some(x=>x[0]===a.id))fail('状态不存在。');c.windowNotes[a.id]=text(a.text);}
 else if(a.type==='cog:book'){const b=books(s).find(x=>x.id===a.id);if(!b)fail('书不存在');if(b.kind==='pressure'&&!c.stormUnlocked)fail('先由本人开启风暴窗，再阅读压力书。');if(!['yes','part','no'].includes(a.match))fail('请选择像不像我。');c.bookMarks[a.id]={match:a.match,example:text(a.text),turned:!!a.turned};c.seen.shelf=true;}
 else if(a.type==='cog:door'){c.door={strength:text(a.strength),practice:text(a.practice),suggestion:text(a.suggestion)};if(!c.door.suggestion)fail('请先留下给同事的一句建议。');c.seen.door=true;}
 else if(a.type==='cog:mirror'){if(!Array.isArray(a.answers)||a.answers.length!==3||a.answers.some(x=>!text(x)))fail('请留下三段反思，或明确写暂不回答。');const rating=Number(a.rating);if(!Number.isInteger(rating)||rating<1||rating>10)fail('自评在 1–10 之间。');c.mirror={answers:a.answers.map(x=>text(x)),rating,reflection:text(a.reflection)};c.seen.mirror=true;}
 else if(a.type==='cog:light'){const i=LIGHTS.findIndex(x=>x[0]===a.id);if(i<0)fail('光源不存在');if(a.on!==undefined)c.lightOn[i]=!!a.on;if(a.need!==undefined){const n=Number(a.need);if(![0,1,2,3].includes(n))fail('选择 0–3 的需要程度。');c.lightNeeds[i]=n;}c.seen.sun=true;}
 else if(a.type==='cog:publish'){
  if(!a.confirmed)fail('私人结论只有本人确认后才能带到公开介绍。');const line=text(a.text,300);if(!line)fail('先选择或写下一句愿意分享的话。');
  r.profile.collaboration=line;r.public.collaboration=!!a.public;
  r.cognitionPublication={text:line,source:a.source==='sun'?'本人确认的光源配方':a.source==='mirror'?'本人确认的反思结论':'本人校准的门牌建议',at:Date.now()};
  // Do not publish raw samples, reflection answers, scores, or other villages' permissions.
 }
 else if(a.type==='cog:consent'){r.cognitionConsent=!!a.value;}
 else if(a.type==='cog:lab-start'){
  const partner=s.residents.find(x=>x.id===a.partner);if(!partner||partner.id===s.actor)fail('请选择一位其他居民。');
  const membership=s.network.villages[s.network.active].members[partner.id];
  if(!partner.confirmed||membership?.membership!=='joined'||s.stage!=='open')fail('开放串门后，选择已入驻的同村伙伴。');
  const real=cognition(s,partner.id);let partnerReport;
  if(real&&membership.cognitionConsent)partnerReport=real.reportId;
  else if(partner.simulated&&a.sampleConsent&&!SAMPLES[real?.reportId]?.real){partnerReport=partner.id==='lin'?'spark':partner.id==='an'?'harbor':'grove';}
  else fail('对方尚未授权；可明确选择虚构居民的授权示例，不读取私人报告。');
  if(c.lab?.partner===partner.id&&c.lab.partnerReport===partnerReport)return s;
  c.lab={partner:partner.id,partnerReport,simulated:!!partner.simulated,step:1,prescription:'information',checks:[]};
  c.lab.prescription=['pace','voice','pace','information'][labComparison(s).max];
 }
 else if(a.type==='cog:lab-step'){if(!c.lab)fail('先选择伙伴');const step=Number(a.step);if(![1,2,3].includes(step)||step>c.lab.step+1)fail('请依次对照、混合，再留下协作处方。');c.lab.step=step;if(step===2&&!c.lab.focus)c.lab.focus=REACTIONS.find(x=>x[1]===labComparison(s).dimensions[labComparison(s).max].type)[0];if(step===3)c.seen.lab=true;}
 else if(a.type==='cog:lab-focus'){if(!c.lab||c.lab.step<2)fail('先让配方进入反应皿');if(!REACTIONS.some(x=>x[0]===a.id))fail('反应示例不存在');c.lab.focus=a.id;c.lab.illustration=!!a.illustration;}
 else if(a.type==='cog:lab-prescription'){if(!c.lab||c.lab.step<3)fail('先完成实验');if(!PRESCRIPTIONS.some(x=>x[0]===a.id))fail('处方不存在');if(c.lab.prescription!==a.id){c.lab.prescription=a.id;c.lab.checks=[];}}
 else if(a.type==='cog:lab-check'){if(!c.lab||c.lab.step<3)fail('先留下协作处方');const content=text(a.text);if(!content)fail('写下这次发生了什么，不用证明关系已经改善。');if(!['helpful','adjust','not-yet'].includes(a.outcome))fail('请选择这次感受');if(c.lab.checks.at(-1)?.text===content&&c.lab.checks.at(-1)?.outcome===a.outcome)return s;if(c.lab.checks.length>=5)fail('本轮已记录五次，可以回看或换一个协作尝试。');c.lab.checks.push({text:content,outcome:a.outcome,at:Date.now()});}
 else fail('未知认知操作');return s;
}
