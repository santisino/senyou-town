// Private drafting prompts. Only user-confirmed profile text becomes public.
export const QUESTIONS = {
  interest: [
    ['free', '突然多出半天，不用交代成果，你最想做什么？', '先选一件真正想做的事，不需要擅长。', ['带相机散步', '窝着读书', '做点手工', '运动一下'], true],
    ['detail', '这件事里，最让你着迷的是哪个小细节？', '比如摄影：寻找画面、研究器材、修照片，还是和人一起出门？', [], true],
    ['moment', '最近一次觉得“今天真不错”，当时发生了什么？', '写一个具体画面，比给自己一个标签更动人。', [], true],
    ['company', '做这件事，你喜欢什么样的陪伴？', '独处和结伴都很好，也可以说“要看情况”。', ['自己沉进去', '边做边交流', '各自探索，再交换发现', '看当天的状态'], false],
    ['invite', '带一个完全不懂的新朋友入门，你会先做什么？', '一段路线、一首歌、一个小步骤，都可以成为邀请。', [], false],
    ['curious', '一直想试、还没开始的事是什么？差的是什么？', '时间、方法、勇气，还是一个搭子？', [], false],
  ],
  table: [
    ['start', '拿到一个还不清楚的任务，你通常先做什么？', '可以先选，再补充：什么情况下你会换一种做法？', ['先问清目标和边界', '找一个参考案例', '先试一小步', '先和伙伴聊聊'], true],
    ['ideas', '想法还没成熟时，你希望怎样讨论？', '不是测你外向还是内向，只是告诉伙伴怎么配合。', ['边聊边想', '先整理，再一起讨论', '先写下来给大家看'], false],
    ['disagree', '别人不同意你的方案时，怎样说你更愿意听？', '可以写一句希望对方说的话。', ['先说明担心，再提建议', '拿具体例子一起看', '先让我讲完理由'], true],
    ['change', '做到一半突然变了，你最希望先知道什么？', '想想一次真实的临时变化。', ['为什么变、目标还是什么', '哪些要重做，时间是否调整', '优先级和各自分工'], true],
    ['stuck', '卡住时，你希望伙伴怎样帮你？', '是一起拆问题、直接示范，还是先给点空间？', ['主动问我卡在哪里', '陪我试一次', '让我先自己想一会儿'], false],
    ['help', '最近别人来找你帮忙，具体为了什么？', '写一个你愿意再帮一次的小事；没有也可以坦诚说。', [], true],
    ['boundary', '怎样联系你更舒服？什么沟通方式容易有压力？', '例如紧急事直接说，普通问题先发背景；不必暴露私人安排。', [], false],
  ],
};
export function draftProfile(group, answers, current) {
  const a = answers || {}, result = {};
  const join = pairs => pairs.filter(([k])=>a[k]?.trim()).map(([k,label])=>`${label}${a[k].trim().replace(/[。；;]+$/u,'')}`).join('；');
  if(group === 'interest') {
    result.interests=join([['free','我喜欢'],['detail','尤其喜欢'],['company','一起时希望']]);
    result.story=join([['moment','一个小片段：'],['invite','带朋友入门，我会']]);
    result.learning=a.curious?.trim() || current.learning || '暂时没有新的探索，先享受已经喜欢的事。';
  } else {
    result.collaboration=join([['start','开始任务：'],['ideas','讨论想法：'],['disagree','意见不同：'],['change','临时变化：'],['stuck','卡住时：'],['boundary','沟通边界：']]);
    result.help=a.help?.trim() || current.help || '暂时还在发现自己愿意搭把手的事。';
  }
  return result;
}
