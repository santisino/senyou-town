# 蚂蚁森友会 Forest Demo

独立路由 `/forest/`，旧版页面与存储不变。Blender 是场景几何源；Three.js 负责显示、移动与点选；原生 DOM 负责可读内容。

## 已锁定设计

- 暖木 D7AF78 / 奶油纸 F9EED7 / 苔绿 57814C / 陶土 C78160；开放式全屏世界，轻量纸感面板。
- 首页只强调「准备我的小屋」。村长解释为什么表达自己、为什么串门。
- 地图找人 → 小屋逐层认识 → 物理册子连贯阅读。同一 `Resident` 资料源，访客统一经过投影。
- 真实本地功能：填写、编辑、走动、筛选、库存、申请、公共活动结果和刷新保存。
- 显式模拟：其他居民、跨角色响应、DISC 建议、合拍建议、线下活动完成；不包含真实登录、后台权限或跨设备同步。
- 核心完整度由本人确认而非隐私披露量衡量。隐藏资料不减少装饰资格。

## 源与构建

`source/build_forest.py` 使用旧版构建器的几何函数生成新资产，不运行旧版导出流程。命令：

```
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python forest/source/build_forest.py
python3 -m http.server 8777
node --test forest/tests/state.test.mjs
```

Blender 工程保存于工作区 `ant-town-visuals/forest/forest.blend`，网页模型 `forest/assets/forest.glb`。

## 本地数据接口

`data.js`：示例居民及公共空间；`state.js`：统一资料/展示投影、经济及社交事务；`world.js`：Blender GLB 加载、场景、移动和语义物件；`app.js`：界面与演示编排。

唯一存储键 `senyou-forest-demo-v1`。身份切换只用于本地模拟，不能作为生产权限实现。隐私选项只控制演示展示，不构成浏览器本地数据安全隔离。

## 验收路径

无报告入驻 → 确认册子 → 开放村庄 → 小禾拜访小林 → 阅读兴趣/桌子/册子 → 申请摄影 → 小林接受 → 送礼/收礼 → 公共空间回顾 → 修改介绍 → 多处同步 → 刷新恢复。

阶段记录与真实截图保存在工作区 `output/森友会-新版交付/`，验收未完成前不得标注全部通过。
