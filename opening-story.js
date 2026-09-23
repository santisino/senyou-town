// Local editorial templates, not a personality classifier. Raw answers never leave the device.
import {QUESTIONS} from './opening-content.js?v=grove3';
export const STORY_FIELDS=[['headline','档案袋 · 一句话记住我',60],['about','档案袋 · 关于我的短介绍',160],['practice','这次想试试',100],['inviteTitle','第一张便签标题',30],['invite','第一张便签 · 找我合作',160],['quietTitle','第二张便签标题',30],['quiet','第二张便签 · 讨论的时候',160],['talkTitle','第三张便签标题',30],['talk','第三张便签 · 有不同意见',160],['question','留给访客的聊天问题',120]];
const sources=p=>JSON.stringify(['habits','communication','growth'].map(k=>p[k]||''));
const sentences=t=>String(t||'').split(/\n+/).map(t=>t.trim()).filter(Boolean);
const short=(t,n=100)=>t.length>n?t.slice(0,n-1)+'…':t;
const index=(p,id,field)=>QUESTIONS.find(q=>q.id===id).options.findIndex(o=>sentences(p[field]).includes(o.note));
const pick=(p,id,field,variants,fallback='')=>variants[index(p,id,field)]??fallback;
export function storyIsCurrent(p){return p?.story?.version===1&&p.story.basis===sources(p);}
export function buildStory(p){
 const habits=sentences(p.habits),communication=sentences(p.communication);
 const opening=pick(p,'arrival','habits',['我喜欢先定好方向，再出发。','新邻居来了，我想先打个招呼。','给我一点熟悉这里的时间。','出发前，我习惯先看看地图。'],short(habits[0]||'关于我，慢慢认识就好。',60));
 const action=pick(p,'arrival','habits',['做新事情，我喜欢先明确结果。','到了新环境，我愿意先和大家聊聊。','到了新环境，我喜欢先熟悉一下。','做新事情，我喜欢先弄清背景和要求。'],short(habits[0]||'',60));
 const rhythm=pick(p,'rhythm','habits',['几件事一起到来，我会先抓最重要的。','安排里有些变化和交流，我更容易投入。','我喜欢按稳定的节奏逐件完成。','我习惯把事情拆成几步，中途检查一下。']);
 const division=pick(p,'division','habits',['分工明确后，希望留给我自主推进的空间。','有需要沟通、连接伙伴的部分，我愿意考虑。','分工明确、配合稳定，我会更自在。','认领任务前，我想先看看要求是否适合自己的经验。']);
 const brief=pick(p,'brief','communication',['先聊目标和期限，也说说哪些事我可以自己决定。','先聊聊这件事有什么意思，谁会一起参加。','说清我负责什么，以及需要时可以找谁帮忙。','做什么、做到什么程度，有哪些限制？先说清楚，我更好参与。'],short(communication[0]||'你愿意怎样开始？我们可以当面聊聊。',100));
 const info=pick(p,'information','communication',['关键问题明确，就可以先开始。','方向聊出来后，资料可以一起补。','分工和支持方式明确，我会更踏实。','依据和主要风险，也请一起告诉我。']);
 const meeting=pick(p,'meeting','communication',['我常会先提一个方向，希望尽快一起作决定。','我有时边说边想，讨论会帮我形成想法。','我习惯先听一轮，再补充自己的看法。','我会先确认问题和依据，再往下聊。']);
 const silence=pick(p,'silence','communication',['安静时，可能在想下一步最值得做什么。','安静时，可能在找接上话的机会。','安静时，可能还在听；可以邀请我说说。','暂时没开口，可能还在整理想法。']);
 const disagree=pick(p,'disagree','communication',['有分歧，就回到目标，找个能推进的办法。','想法不同，可以聊开看看能否组合。','先听听彼此的顾虑，别落下谁的感受。','把不同意见列出来，带上依据一起聊。']);
 const feedback=pick(p,'feedback','communication',['给我建议，可以直接说问题和希望改变的结果。','给我建议时，留点一起找办法的空间。','建议私下温和地说，也给我一点回应时间。','给我建议时，有个例子更好。']);
 const quietTitle=pick(p,'silence','communication',['安静时，我在想下一步','给我一个接话的机会','也可以问问我的想法','我安静时，也在想事情'],'听听我的习惯');
 return {version:1,basis:sources(p),headline:opening,about:short([action,rhythm,division].filter(Boolean).join(''),160),practice:pick(p,'growth','growth',['作决定前，多听一个人的想法。','把好点子写成清楚的下一步。','早点说出自己的需要和不同意见。','约好做到什么程度，就开始动手。'],short(p.growth||'',100)),inviteTitle:pick(p,'brief','communication',['先告诉我想做到什么','有意思的事，叫上我','先约好怎样配合','带上说明来找我'],'找我合作时'),invite:short(brief+info,160),quietTitle,quiet:short(meeting+silence||communication[1]||'讨论时，你可以问问我现在的想法。',160),talkTitle:'有分歧，我们摊开聊',talk:short(disagree+feedback||communication[2]||'一起说说各自的想法，再约定下一步。',160),question:pick(p,'brief','communication',['这次共建，你希望先推进哪一步？','这件事里，哪一部分最让你想参与？','这次你想认领哪部分，需要怎样的配合？','这次共建，我们先约好哪几件事，你就愿意开始动手？'],'这次一起做事，你最希望我先了解什么？')};
}
export function confirmedStory(p){return storyIsCurrent(p)?p.story:null;}
export function cleanStory(s,p){if(!s||s.version!==1||s.basis!==sources(p))return undefined;const out={version:1,basis:sources(p)};for(const [k,,n] of STORY_FIELDS)out[k]=typeof s[k]==='string'?s[k].trim().slice(0,n):'';return out;}
export function archiveDetails(p){return [['决定之前',['arrival','route','unknown','decision']],['做起来以后',['space','rhythm']],['找伙伴时',['division']]].map(([title,ids])=>({title,text:ids.map(id=>{const q=QUESTIONS.find(q=>q.id===id);return q.options.find(o=>sentences(p.habits).includes(o.note))?.note||'';}).filter(Boolean).join('')})).filter(x=>x.text);}
export function extraNotes(p){return [['welcome','刚认识的时候'],['checkin','碰头的时间，提前约好'],['thanks','想谢谢我时'],['mistake','发现漏了什么']].map(([id,title])=>{const q=QUESTIONS.find(q=>q.id===id);return {title,text:q.options.find(o=>sentences(p.communication).includes(o.note))?.note||''};}).filter(x=>x.text);}
export function supportNote(p){
 // No inference from private answers; only text deliberately included in this profile.
 const replacements=new Map(QUESTIONS.filter(q=>['change','stuck','support','recharge'].includes(q.id)).flatMap(q=>q.options.map(o=>[o.note,o.note])));
 replacements.set('事情堆积时，我可能反复检查，希望减少遗漏。','忙乱时，我可能会反复检查，放不下没确认的细节。');
 replacements.set('遇到困难时，帮我确认必要标准和停止检查的条件会有帮助。','陪我约好“检查到这里就可以”，会很有帮助。');
 return sentences(p.support).map(t=>replacements.get(t)||t).join('\n');
}
