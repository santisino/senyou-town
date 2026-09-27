import { seedResidents, blankResident, FIELDS, SHOP } from "./data.js";
export const STORAGE = "senyou-forest-demo-v1";
const clone = (x) => structuredClone(x);
const id = () =>
  globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random()}`;
const fail = (message) => {
  throw new Error(message);
};
export function fresh() {
  const residents = [blankResident(), ...seedResidents()];
  return {
    version: 1,
    actor: "me",
    stage: "preparing",
    welcomeSeen: false,
    village: {
      name: "百蚂村",
      mayor: "森森",
      tone: "温暖",
      appearance: "green",
      welcome:
        "欢迎来到百蚂村。今天，我们借一间小屋，慢慢认识自己，也认识身边的人。",
      goal: "把你喜欢的、擅长的、相处起来舒服的方式，放进自己的小屋。",
    },
    residents,
    wallets: Object.fromEntries(
      residents.map((r) => [r.id, { coins: 100, sent: 0 }]),
    ),
    items: residents.flatMap((r) =>
      Array.from({ length: 5 }, () => ({
        id: id(),
        owner: r.id,
        creator: r.id,
        name: r.signature.name,
        color: r.signature.color,
        template: r.signature.template,
        status: "available",
        kind: "signature",
      })),
    ),
    gifts: [],
    requests: [],
    friends: [],
    connections: [],
    ledger: [],
    publicResults: {},
  };
}
export const resident = (s, rid = s.actor) =>
  s.residents.find((r) => r.id === rid);
export function visible(s, rid, viewer = s.actor) {
  const r = resident(s, rid);
  if (!r) return null;
  return {
    ...r,
    profile: Object.fromEntries(
      FIELDS.map(([k]) => [
        k,
        viewer === rid || r.public[k] ? r.profile[k] : "",
      ]),
    ),
    notes: viewer === rid ? r.notes : {},
  };
}
export function canVisit(s, rid) {
  return (
    rid === s.actor ||
    (s.stage === "open" &&
      resident(s)?.confirmed &&
      resident(s, rid)?.confirmed)
  );
}
export function ready(r) {
  return (
    !!r.name.trim() &&
    r.reviewed &&
    FIELDS.every(([k]) => !!r.profile[k]?.trim())
  );
}
export function matches(s, r, query = "", filter = "all") {
  const p = visible(s, r.id).profile;
  const text = [r.name, r.group, ...Object.values(p)].join(" ").toLowerCase();
  return (
    text.includes(query.toLowerCase()) &&
    (filter === "all" ||
      (filter === "wish" && p.wish && !p.wish.includes("暂时没有")) ||
      (filter === "photo" && p.interests.includes("摄影")))
  );
}
export function transact(original, action) {
  const s = clone(original),
    a = action,
    me = resident(s),
    now = Date.now();
  const other = (rid) => {
    if (!resident(s, rid)) fail("没有找到这位居民");
    if (!canVisit(s, rid)) fail("请先完成入驻，并等待村长开放串门");
    if (rid === s.actor) fail("请选一位其他居民");
  };
  switch (a.type) {
    case "welcome":
      s.welcomeSeen = true;
      break;
    case "profile": {
      if (a.name !== undefined) me.name = String(a.name).slice(0, 24);
      for (const [k] of FIELDS) {
        if (a.profile?.[k] !== undefined)
          me.profile[k] = String(a.profile[k]).slice(0, 600);
        if (a.public?.[k] !== undefined) me.public[k] = !!a.public[k];
      }
      if (a.appearance)
        for (const k of ["outfit", "skin", "hair"])
          if (/^#[0-9a-f]{6}$/i.test(a.appearance[k]))
            me.appearance[k] = a.appearance[k];
      if (a.wishMode)
        me.wishMode = ["intent", "recruit"].includes(a.wishMode)
          ? a.wishMode
          : "intent";
      if (a.reviewed !== undefined) me.reviewed = !!a.reviewed;
      if (me.confirmed && !ready(me)) me.confirmed = false;
      break;
    }
    case "confirm":
      if (!ready(me)) fail("请逐项填写，或写下暂不公开，并确认阅读自己的介绍");
      me.confirmed = true;
      break;
    case "switch":
      if (!resident(s, a.id)) fail("无此演示居民");
      s.actor = a.id;
      break;
    case "stage":
      s.stage = a.open ? "open" : "preparing";
      break;
    case "village":
      for (const k of [
        "name",
        "mayor",
        "tone",
        "appearance",
        "welcome",
        "goal",
      ])
        if (a.value[k] !== undefined)
          s.village[k] = String(a.value[k]).slice(
            0,
            k === "welcome" || k === "goal" ? 300 : 30,
          );
      break;
    case "signature":
      me.signature = {
        name: String(a.name || "森林问候").slice(0, 24),
        color: /^#[0-9a-f]{6}$/i.test(a.color) ? a.color : "#829475",
        template: ["leaf", "tea", "photo"].includes(a.template)
          ? a.template
          : "leaf",
        message: String(a.message || "").slice(0, 120),
      };
      s.items
        .filter(
          (i) =>
            i.creator === s.actor &&
            i.owner === s.actor &&
            i.kind === "signature" &&
            i.status === "available",
        )
        .forEach((i) =>
          Object.assign(i, {
            name: me.signature.name,
            color: me.signature.color,
            template: me.signature.template,
          }),
        );
      break;
    case "buy": {
      const product = SHOP.find((p) => p[0] === a.product);
      if (!product) fail("没有这件物品");
      const [key, name, price] = product;
      if (key !== "gift" && me.decor.includes(key)) fail("已经拥有这件装饰");
      if (s.wallets[s.actor].coins < price) fail("森友币不够啦");
      s.wallets[s.actor].coins -= price;
      if (key === "gift")
        s.items.push({
          id: id(),
          owner: s.actor,
          creator: s.actor,
          name,
          status: "available",
          kind: "shop",
        });
      else me.decor.push(key);
      s.ledger.push({
        id: id(),
        actor: s.actor,
        delta: -price,
        reason: name,
        at: now,
      });
      break;
    }
    case "sendGift": {
      other(a.to);
      if (s.wallets[s.actor].sent >= 5) fail("这场的 5 次送礼机会已经用完");
      const item = s.items.find(
        (i) =>
          i.id === a.item && i.owner === s.actor && i.status === "available",
      );
      if (!item) fail("这件礼物已经送出或无法使用");
      item.status = "pending";
      s.wallets[s.actor].sent++;
      s.gifts.push({
        id: id(),
        item: item.id,
        from: s.actor,
        to: a.to,
        status: "pending",
        message: String(a.message || me.signature.message).slice(0, 160),
        at: now,
      });
      break;
    }
    case "giftReply": {
      const g = s.gifts.find((g) => g.id === a.id);
      if (!g || g.status !== "pending") fail("这份礼物已经处理过");
      if (a.reply === "withdraw" ? g.from !== s.actor : g.to !== s.actor)
        fail("不能处理他人的礼物");
      if (!["accept", "reject", "withdraw"].includes(a.reply)) fail("无效操作");
      const item = s.items.find((i) => i.id === g.item);
      g.status = a.reply;
      item.status = "available";
      if (a.reply === "accept") {
        item.owner = g.to;
        item.received = true;
      }
      break;
    }
    case "recycle": {
      const item = s.items.find(
        (i) =>
          i.id === a.item &&
          i.owner === s.actor &&
          i.status === "available" &&
          i.received,
      );
      if (!item) fail("只能回收已经收下的礼物");
      item.status = "recycled";
      s.wallets[s.actor].coins += 8;
      s.ledger.push({
        id: id(),
        actor: s.actor,
        delta: 8,
        reason: "回收礼物",
        at: now,
      });
      break;
    }
    case "request": {
      other(a.to);
      if (
        s.requests.filter(
          (r) =>
            r.from === s.actor &&
            ["pending", "accepted", "interested"].includes(r.status),
        ).length >= 3
      )
        fail("最多同时参与 3 条心愿，先处理已有意向吧");
      const host = resident(s, a.to);
      if (
        !host.public.wish ||
        !host.profile.wish ||
        host.profile.wish.includes("暂时没有")
      )
        fail("对方目前没有公开心愿");
      if (
        s.requests.some(
          (r) =>
            r.from === s.actor &&
            r.to === a.to &&
            ["pending", "accepted", "interested"].includes(r.status),
        )
      )
        fail("已经表达过意向啦");
      if (
        host.wishMode === "recruit" &&
        s.requests.filter((r) => r.to === a.to && r.status === "accepted")
          .length >= host.capacity
      )
        fail("这个心愿已经满员");
      s.requests.push({
        id: id(),
        from: s.actor,
        to: a.to,
        status: host.wishMode === "recruit" ? "pending" : "interested",
        wish: host.profile.wish,
        at: now,
      });
      break;
    }
    case "requestReply": {
      const r = s.requests.find((r) => r.id === a.id);
      if (!r || !["pending", "interested"].includes(r.status))
        fail("这条意向已处理");
      if (a.reply === "withdraw" ? r.from !== s.actor : r.to !== s.actor)
        fail("不能处理他人的意向");
      if (!["accepted", "rejected", "withdraw"].includes(a.reply))
        fail("无效操作");
      if (
        a.reply === "accepted" &&
        s.requests.filter((q) => q.to === r.to && q.status === "accepted")
          .length >= resident(s, r.to).capacity
      )
        fail("已经满员");
      r.status = a.reply;
      break;
    }
    case "connect":
      other(a.to);
      if (
        s.connections.some(
          (c) =>
            ((c.from === s.actor && c.to === a.to) ||
              (c.to === s.actor && c.from === a.to)) &&
            c.status !== "rejected",
        )
      )
        fail("已经发出邀请或建立连接");
      s.connections.push({
        id: id(),
        from: s.actor,
        to: a.to,
        status: "pending",
      });
      break;
    case "connectReply": {
      const c = s.connections.find((c) => c.id === a.id);
      if (!c || c.to !== s.actor || c.status !== "pending") fail("邀请已处理");
      c.status = a.accept ? "accepted" : "rejected";
      if (a.accept) s.friends.push([c.from, c.to]);
      break;
    }
    case "bookmark":
      if (!me.bookmarked.includes(a.key)) me.bookmarked.push(a.key);
      break;
    case "note":
      me.notes[a.key] = String(a.value).slice(0, 1200);
      break;
    case "publicResult":
      s.publicResults[`${s.actor}:${a.key}`] = clone(a.value);
      break;
    default:
      fail("未知操作");
  }
  return s;
}
export function load(storage = globalThis.localStorage) {
  try {
    const s = JSON.parse(storage.getItem(STORAGE));
    if (
      s?.version === 1 &&
      Array.isArray(s.residents) &&
      s.residents.some((r) => r.id === s.actor) &&
      s.wallets?.[s.actor] &&
      ["items", "gifts", "requests", "friends", "connections", "ledger"].every(
        (k) => Array.isArray(s[k]),
      ) &&
      s.village &&
      s.publicResults &&
      s.residents.every(
        (r) =>
          r.profile &&
          r.public &&
          r.appearance &&
          r.notes &&
          Array.isArray(r.decor) &&
          Array.isArray(r.bookmarked) &&
          r.signature,
      )
    )
      return s;
  } catch {}
  return fresh();
}
export function persist(s, storage = globalThis.localStorage) {
  storage.setItem(STORAGE, JSON.stringify(s));
}
