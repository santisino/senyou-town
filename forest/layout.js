// World coordinates: x east, z south. Shared by navigation, plots and tests.
export const DISTRICTS = ["溪边里", "松果坡", "晴光小径", "花园巷", "月亮湾"];
export const PLOTS = Array.from({length:50}, (_,i)=>({
  id:i, district:DISTRICTS[Math.floor(i/10)], number:i%10+1,
  x:-8-(i%5)*8, z:28-Math.floor(i/5)*7,
}));
export const ENTRY = [9,35];
export const MAYOR = [5,29];
export const BRIDGES = [32,11,-17];
export const SPACE_POS = {
  park:[20,24], shop:[34,24], library:[14,8], class:[29,8],
  growth:[14,-10], play:[31,-10], workshop:[24,-25],
};
export function address(r) {
  const p=PLOTS[r?.plot];
  return p ? `${p.district} ${p.number} 号` : "尚未领取宅地";
}
export function outdoorWalkable(x,z) {
  if(x*x/56**2+z*z/47**2>1)return false;
  if(Math.abs(x-2)<1.9 && !BRIDGES.some(b=>Math.abs(z-b)<1.65))return false;
  if(Math.hypot(x-20,z-20)<1.35)return false;
  if(Object.values(SPACE_POS).some(([px,pz])=>Math.abs(x-px)<1.9&&Math.abs(z-pz)<1.3))return false;
  return !PLOTS.some(p=>Math.abs(x-p.x)<2.3&&Math.abs(z-p.z)<2.7);
}
