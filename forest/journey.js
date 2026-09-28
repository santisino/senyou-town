export const STATIONS = {
  door: { title: "挂上我的门牌", fields: ["headline", "traits"], result: "门牌挂好了", hint: "先让来访的人认识你。" },
  interest: { title: "摆好我的兴趣角", fields: ["interests", "story", "learning"], result: "兴趣角布置好了", hint: "喜欢的事、背后的故事，以及最近的探索。" },
  table: { title: "布置我的会客桌", fields: ["help", "collaboration"], result: "会客桌准备好了", hint: "一起做事时，你愿意怎样搭把手？" },
  wish: { title: "把心愿放进瓶子", fields: ["wish"], result: "心愿瓶安放好了", hint: "可以邀请伙伴，也可以暂时没有心愿。" },
};
export function journey(r) {
  return r.journey || { metMayor: !!r.confirmed, key: !!r.confirmed, stations: r.confirmed ? Object.keys(STATIONS) : [] };
}
export function nextStation(r) { return Object.keys(STATIONS).find(k => !journey(r).stations.includes(k)); }
// Grid pathfinding: movement follows a walkable route, not a teleport to the UI target.
export function findPath(start, end, walkable, home=false) {
  const step=home?0.25:0.5, bound=home?4:25;
  const cell=p=>[Math.round(p[0]/step),Math.round(p[1]/step)];
  const from=cell(start), to=cell(end), key=p=>p.join(",");
  const open=[from], came=new Map(), cost=new Map([[key(from),0]]), closed=new Set();
  const valid=(x,z)=>Math.abs(x*step)<=bound && Math.abs(z*step)<=bound && walkable(x*step,z*step);
  let found=null;
  for(let tries=0;open.length && tries<12000;tries++) {
    open.sort((a,b)=>(cost.get(key(b))+Math.hypot(b[0]-to[0],b[1]-to[1]))-(cost.get(key(a))+Math.hypot(a[0]-to[0],a[1]-to[1])));
    const p=open.pop(), pk=key(p); if(closed.has(pk))continue;closed.add(pk);
    if(Math.hypot(p[0]-to[0],p[1]-to[1])<0.8){found=p;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const n=[p[0]+dx,p[1]+dz], nk=key(n);
      if(!valid(...n) || (dx && dz && (!valid(p[0]+dx,p[1]) || !valid(p[0],p[1]+dz))))continue;
      const c=cost.get(pk)+Math.hypot(dx,dz);if(c>=(cost.get(nk)??Infinity))continue;
      cost.set(nk,c);came.set(nk,p);open.push(n);
    }
  }
  if(!found)return [];
  const result=[];let at=found;
  while(key(at)!==key(from)){result.push([at[0]*step,at[1]*step]);at=came.get(key(at));}
  return result.reverse();
}
