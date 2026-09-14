# 蚂蚁森友小镇

北辰青年 × 蚂蚁集团员工社区概念体验。把想法种下，找到搭子，一起做成。

这是直接部署到 GitHub Pages 的纯静态版本，保留三维小镇、男女/中性造型与独立发型、树屋成长、想法广场、搭子推荐演示、认领分工、行动与协作复盘。

## 访问与更新

站点：https://santisino.github.io/senyou-town/

GitHub Pages 使用 `main` 分支的根目录，`.nojekyll` 保留原始静态文件。提交更新后由 GitHub 自动发布，无需构建。

所有脚本、模型、图片与依赖使用相对路径，支持项目子目录。可从本目录启动任意静态 HTTP 服务进行本地预览；不能直接双击 HTML 使用 ES modules。

## 演示边界

- 不接入真实员工、真实 DISC、真实 AI 服务或多人后台。
- 搭子助手使用明确标注的本地规则；邀请、接受与他人认领均为演示。
- 居民资料、装扮、事情和复盘只存在当前浏览器的 localStorage，不会上传到 GitHub。
- 新域名与旧域名的浏览器进度相互独立。
- 图册和 PDF 是早期视觉方案，互动页面包含后续迭代。

## 素材和依赖

- 三维模型来自本项目的 Blender 场景。
- 木纹：Poly Haven `wood_planks`，CC0，https://polyhaven.com/a/wood_planks 。
- Three.js：MIT；Draco：Apache 2.0。相应许可证保留在 `vendor/`。

本仓库仅含已经公开展示的网站文件，不含会议纪要、登录凭据、本机配置或开发历史。
