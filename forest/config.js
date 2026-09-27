// A compact, public village invitation. Never includes resident profiles or local state.
export async function encodeVillage(village) {
  const bytes = new TextEncoder().encode(JSON.stringify(village));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  const packed = new Uint8Array(await new Response(stream).arrayBuffer());
  return btoa(String.fromCharCode(...packed)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
export async function decodeVillage(encoded) {
  if (!/^[\w-]{1,4096}$/.test(encoded)) throw new Error("村庄邀请格式不正确");
  const bytes = Uint8Array.from(atob(encoded.replaceAll("-", "+").replaceAll("_", "/")), c => c.charCodeAt(0));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate")).getReader();
  let length=0, chunks=[];
  while (true) {
    const {done,value}=await reader.read(); if (done) break;
    length+=value.length;
    if(length>8192){await reader.cancel();throw new Error("村庄邀请内容过长");}
    chunks.push(value);
  }
  const raw=JSON.parse(await new Blob(chunks).text()), result={};
  for(const key of ["name","mayor","tone","appearance","welcome","goal"])
    if(typeof raw[key]==="string") result[key]=raw[key].slice(0,["welcome","goal"].includes(key)?300:30);
  return result;
}
