import { journey, STATIONS } from "./journey.js?v=cognition-v2";
import { PLOTS } from "./layout.js";

export function houseStage(r) {
  if(!r || !Number.isInteger(r.plot))return "empty";
  if(!r.built)return "claimed";
  if(r.confirmed)return "ready";
  return journey(r).stations.length>=2 ? "decorating" : "building";
}
export function claimPlot(s,r) {
  if(Number.isInteger(r.plot))return;
  const occupied=new Set(s.residents.map(r=>r.plot).filter(Number.isInteger));
  const free=PLOTS.find(p=>!occupied.has(p.id));
  if(!free)throw new Error("这座村庄的 50 块宅地已领完");
  r.plot=free.id;
}
export function settleSample(s,r,level) {
  if(r.controlled)return;
  if(level<1)return;
  r.arrived=true;claimPlot(s,r);
  r.journey={metMayor:true,key:true,stations:Object.keys(STATIONS).slice(0,Math.max(0,level-2))};
  r.built=level>=2;
  r.confirmed=level>=6;
  r.reviewed=r.confirmed;
}
// Milestones, not fake realtime: fictional classmates progress with the local story.
export function advanceCohort(s,step) {
  s.openingStep=Math.max(s.openingStep||0,step);
  if(s.experience!=="opening" || s.openingStep===0)return;
  const levels=[[0,0,0,0,0],[1,0,0,0,0],[3,1,1,0,0],[4,3,1,1,0],[6,5,4,3,1],[6,6,6,5,1]][s.openingStep];
  s.residents.filter(r=>r.simulated).forEach((r,i)=>{
    const level=i<5?levels[i]:Math.max(0,Math.min(6,s.openingStep+1-(i%4)));
    if(level>0)settleSample(s,r,level);
  });
}
export function villageCounts(s) {
  return {capacity:50,arrived:s.residents.filter(r=>r.arrived).length,
    claimed:s.residents.filter(r=>Number.isInteger(r.plot)).length,
    ready:s.residents.filter(r=>r.confirmed).length};
}
