import test from "node:test";
import assert from "node:assert/strict";
import {
  fresh,
  transact,
  resident,
  visible,
  canVisit,
  ready,
  matches,
  load,
  persist,
  STORAGE,
} from "../state.js";
import { FIELDS } from "../data.js";
import { STATIONS, findPath } from "../journey.js";
import { encodeVillage, decodeVillage } from "../config.js";
test("village invitation roundtrips Chinese and special characters", async () => {
  const v={...fresh().village,name:"百蚂 & <摄影村> 🌿",welcome:"你好，森林！"};
  assert.deepEqual(await decodeVillage(await encodeVillage(v)),v);
});
test("maximum village prose fits an invitation without employee data", async () => {
  const text=Array.from({length:300},(_,i)=>String.fromCharCode(0x4e00+i)).join("");
  const v={...fresh().village,welcome:text,goal:text.split("").reverse().join("")};
  const packed=await encodeVillage(v);
  assert.ok(packed.length<2200);assert.deepEqual(await decodeVillage(packed),v);
});
test("village invitation rejects invalid encoding and strips unrelated keys",async()=>{
  await assert.rejects(()=>decodeVillage("<script>"));
  const decoded=await decodeVillage(await encodeVillage({name:"测试",residents:["private"]}));
  assert.deepEqual(decoded,{name:"测试"});
});
const act = (s, a) => transact(s, a),
  open = () =>
    act(act(fresh(), { type: "switch", id: "he" }), {
      type: "stage",
      open: true,
    });
test("empty resident cannot finish decoration-only", () => {
  const s = fresh();
  assert.equal(ready(resident(s)), false);
  assert.throws(() => act(s, { type: "confirm" }));
});
test("filled form alone cannot bypass mayor and physical station completion",()=>{
 let s=act(fresh(),{type:'profile',name:'小岚',profile:Object.fromEntries(FIELDS.map(([k])=>[k,'我的表达'])),reviewed:true});
 assert.throws(()=>act(s,{type:'confirm'}));assert.throws(()=>act(s,{type:'finishStation',key:'door'}));
 s=act(s,{type:'meetMayor'});assert.ok(canVisit(s,'me'));assert.throws(()=>act(s,{type:'confirm'}));
 for(const key of Object.keys(STATIONS))s=act(s,{type:'finishStation',key});
 assert.ok(act(s,{type:'confirm'}).residents[0].confirmed);
});
test("legacy confirmed residents keep keys when a field becomes incomplete",()=>{
 let s=act(fresh(),{type:'switch',id:'lin'});s=act(s,{type:'profile',profile:{headline:''}});
 assert.equal(resident(s).confirmed,false);assert.ok(canVisit(s,'lin'));assert.ok(resident(s).journey.key);
});
test("home pathfinding reaches every station without crossing furniture",()=>{
 const walk=(x,z)=> x>=-3.3&&x<=3.5&&z>=-2.7&&z<=3.15&&!(x< -2.1&&z<1.65)&&!(x< -1.4&&z< -2.15)&&!(x>2.55&&z>2.5)&&Math.hypot(x-.5,z+.3)>=1.37&&!(x>2.45&&z<-.9&&z>-1.8);
 const points=[[1.75,2.75],[-1,2.75],[-1.75,-1.75],[2,-.25],[2.25,-1.5],[-1,.75],[2.25,2.75],[1,3]];
 for(const a of points)for(const b of points){if(a===b)continue;const path=findPath(a,b,walk,true);assert.ok(path.length,`${a} to ${b}`);assert.ok(path.every(p=>walk(...p)));assert.deepEqual(path.at(-1),b);}
});
test("no-report path confirms all fields with explicit private choices", () => {
  let s = fresh();
  s = act(s, {
    type: "profile",
    name: "林 & <测试>",
    profile: Object.fromEntries(FIELDS.map(([k]) => [k, "暂时不想公开"])),
    public: Object.fromEntries(FIELDS.map(([k]) => [k, false])),
    reviewed: true,
  });
  s = act(s, { type: "meetMayor" });
  for(const key of Object.keys(STATIONS)) s=act(s,{type:"finishStation",key});
  s = act(s, { type: "confirm" });
  assert.ok(resident(s).confirmed);
  assert.ok(
    Object.values(visible(s, "me", "lin").profile).every((v) => v === ""),
  );
});
test("privacy projection and search never include private facts", () => {
  let s = open();
  s = act(s, {
    type: "profile",
    profile: { interests: "秘密火星" },
    public: { interests: false },
  });
  assert.equal(visible(s, "he", "lin").profile.interests, "");
  s = act(s, { type: "switch", id: "lin" });
  assert.equal(matches(s, resident(s, "he"), "秘密火星"), false);
});
test("stage cannot be bypassed by alternate resident entrance", () => {
  let s = fresh();
  assert.equal(canVisit(s, "me"),false);
  assert.equal(canVisit(s, "lin"), false);
  s = act(s, { type: "stage", open: true });
  assert.equal(canVisit(s, "lin"), false);
  s = act(s, { type: "switch", id: "he" });
  assert.ok(canVisit(s, "lin"));
});
test("source update propagates to every projection and preserves other fields", () => {
  let s = open();
  s = act(s, { type: "profile", profile: { collaboration: "需要先给背景" } });
  assert.equal(resident(s).profile.collaboration, "需要先给背景");
  assert.equal(visible(s, "he", "lin").profile.collaboration, "需要先给背景");
  assert.equal(resident(s).profile.interests, "读书、手机摄影、咖啡");
});
test("transactions immutable and failed buys do not alter state", () => {
  const s = open();
  const n = act(s, { type: "buy", product: "fern" });
  assert.equal(s.wallets.he.coins, 100);
  assert.equal(n.wallets.he.coins, 90);
  assert.throws(() => act(n, { type: "buy", product: "fern" }));
  assert.equal(n.wallets.he.coins, 90);
});
test("shop rejects insufficient money and unknown products", () => {
  let s = open();
  for (let i = 0; i < 5; i++) s = act(s, { type: "buy", product: "gift" });
  assert.equal(s.wallets.he.coins, 0);
  assert.throws(() => act(s, { type: "buy", product: "gift" }));
  assert.throws(() => act(s, { type: "buy", product: "x" }));
});
test("gift double send is idempotently rejected", () => {
  let s = open();
  const item = s.items.find((i) => i.owner === "he");
  s = act(s, { type: "sendGift", to: "lin", item: item.id });
  assert.throws(() => act(s, { type: "sendGift", to: "lin", item: item.id }));
  assert.equal(s.wallets.he.sent, 1);
  assert.equal(s.gifts.length, 1);
});
test("gift accept transfer and recycle exactly once", () => {
  let s = open();
  const item = s.items.find((i) => i.owner === "he");
  s = act(s, { type: "sendGift", to: "lin", item: item.id });
  const g = s.gifts[0];
  assert.throws(() => act(s, { type: "giftReply", id: g.id, reply: "accept" }));
  s = act(s, { type: "switch", id: "lin" });
  s = act(s, { type: "giftReply", id: g.id, reply: "accept" });
  assert.equal(s.items.find((i) => i.id === item.id).owner, "lin");
  assert.throws(() => act(s, { type: "giftReply", id: g.id, reply: "accept" }));
  s = act(s, { type: "recycle", item: item.id });
  assert.equal(s.wallets.lin.coins, 108);
  assert.throws(() => act(s, { type: "recycle", item: item.id }));
});
test("reject and withdraw return item but not quota", () => {
  for (const reply of ["reject", "withdraw"]) {
    let s = open();
    const item = s.items.find((i) => i.owner === "he");
    s = act(s, { type: "sendGift", to: "lin", item: item.id });
    if (reply === "reject") s = act(s, { type: "switch", id: "lin" });
    s = act(s, { type: "giftReply", id: s.gifts[0].id, reply });
    assert.equal(s.items.find((i) => i.id === item.id).owner, "he");
    assert.equal(s.items.find((i) => i.id === item.id).status, "available");
    assert.equal(s.wallets.he.sent, 1);
  }
});
test("buying gifts does not bypass session cap", () => {
  let s = open();
  for (let i = 0; i < 5; i++) {
    const item = s.items.find(
      (i) => i.owner === "he" && i.status === "available",
    );
    s = act(s, { type: "sendGift", to: "lin", item: item.id });
  }
  s = act(s, { type: "buy", product: "gift" });
  assert.throws(() =>
    act(s, {
      type: "sendGift",
      to: "lin",
      item: s.items.find((i) => i.owner === "he" && i.status === "available")
        .id,
    }),
  );
});
test("unreceived starter gift cannot be recycled for profit", () => {
  const s = open();
  assert.throws(() =>
    act(s, { type: "recycle", item: s.items.find((i) => i.owner === "he").id }),
  );
});
test("signature changes neither count nor already sent name", () => {
  let s = open();
  const item = s.items.find((i) => i.owner === "he");
  s = act(s, { type: "sendGift", to: "lin", item: item.id });
  const count = s.items.length,
    old = s.items.find((i) => i.id === item.id).name;
  s = act(s, {
    type: "signature",
    name: "我的新礼物",
    color: "#abcdef",
    template: "tea",
    message: "你好",
  });
  assert.equal(s.items.length, count);
  assert.equal(s.items.find((i) => i.id === item.id).name, old);
});
test("wish requests duplicate and unauthorized reply rejected", () => {
  let s = open();
  s = act(s, { type: "request", to: "lin" });
  assert.throws(() => act(s, { type: "request", to: "lin" }));
  assert.throws(() =>
    act(s, { type: "requestReply", id: s.requests[0].id, reply: "accepted" }),
  );
});
test("capacity enforced on acceptance and further applications", () => {
  let s = open();
  for (const actor of ["he", "ze"]) {
    s = act(s, { type: "switch", id: actor });
    s = act(s, { type: "request", to: "lin" });
  }
  s = act(s, { type: "switch", id: "lin" });
  for (const q of s.requests)
    s = act(s, { type: "requestReply", id: q.id, reply: "accepted" });
  s = act(s, { type: "switch", id: "an" });
  assert.throws(() => act(s, { type: "request", to: "lin" }));
});
test("intent wish does not pretend to be accepted", () => {
  let s = open();
  s = act(s, { type: "request", to: "an" });
  assert.equal(s.requests[0].status, "interested");
});
test("gift does not establish friendship; explicit bilateral action does", () => {
  let s = open();
  const item = s.items.find((i) => i.owner === "he");
  s = act(s, { type: "sendGift", to: "lin", item: item.id });
  s = act(s, { type: "switch", id: "lin" });
  s = act(s, { type: "giftReply", id: s.gifts[0].id, reply: "accept" });
  assert.deepEqual(s.friends, []);
  s = act(s, { type: "connect", to: "he" });
  s = act(s, { type: "switch", id: "he" });
  s = act(s, { type: "connectReply", id: s.connections[0].id, accept: true });
  assert.equal(s.friends.length, 1);
});
test("private reflection does not automatically rewrite profile", () => {
  let s = open();
  const old = resident(s).profile.collaboration;
  s = act(s, { type: "note", key: "reflection", value: "我的秘密" });
  assert.equal(resident(s).profile.collaboration, old);
  assert.deepEqual(visible(s, "he", "lin").notes, {});
});
test("bookmarks/class and public contributions persist once", () => {
  let s = open();
  s = act(s, { type: "bookmark", key: "light-note" });
  s = act(s, { type: "bookmark", key: "light-note" });
  assert.equal(resident(s).bookmarked.length, 1);
  s = act(s, {
    type: "publicResult",
    key: "workshop",
    value: { contribution: "标一条小路" },
  });
  assert.equal(s.publicResults["he:workshop"].contribution, "标一条小路");
});
test("roundtrip and legacy storage untouched", () => {
  const bag = new Map([["old-demo", "keep"]]),
    storage = { getItem: (k) => bag.get(k), setItem: (k, v) => bag.set(k, v) };
  const s = open();
  persist(s, storage);
  assert.deepEqual(load(storage), s);
  assert.equal(bag.get("old-demo"), "keep");
  bag.set(STORAGE, "broken");
  assert.equal(load(storage).actor, "me");
});
test("100 residents search bounded and complete", () => {
  const s = open(),
    base = resident(s, "lin");
  for (let i = 0; i < 94; i++)
    s.residents.push({
      ...structuredClone(base),
      id: `load-${i}`,
      name: `虚构森友${i}`,
    });
  assert.equal(s.residents.length, 100);
  assert.equal(s.residents.filter((r) => matches(s, r, "虚构森友")).length, 94);
});
