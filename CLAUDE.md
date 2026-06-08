# WordCard — 项目说明

面向中文母语者的英语学习卡片应用。输入英文单词/短语/短句 → AI 生成"看懂、读出、用上"的结构化卡片。
技术栈：Next.js 14 (App Router) + TypeScript + Arco Design + DeepSeek（OpenAI 兼容接口）。

设计规范见根目录上一级的 `DESIGN.md`（Bohrium 主题 + Arco，含 §3 token 清单）。

---

## ⚠️ 设计 Token：唯一源头规则（必读，否则会静默踩坑）

**所有设计 token（`--spacing-*`、`--font-size-*`、`--font-weight-*`、`--shadow-*`、`--color-primary/warning-*` 等）只在一个地方定义：**

👉 [`src/app/globals.css`](src/app/globals.css) 顶部的 `:root {}` 「DESIGN TOKEN LAYER」块。

### 规则
1. **用 token 前，先确认它已在那个 `:root` 块里定义。** 要用新 token，先去那里加定义，再在组件里用。
2. **不要在组件里给 `var(--token)` 写散落的 fallback**（如 `var(--spacing-5, 20px)`）来"绕过"未定义——这会让真正的源头失效、各处数值不一致。要的值不存在就去源头层加。
3. token 数值以 `DESIGN.md §3` 为权威。间距遵循 4px 网格（4/8/12/16/20/24/28/32/36/40）。
4. 颜色 token 用 `rgb(var(--primary-N))` 形式组合 Arco 主题包内置的 raw RGB 变量，**不写裸 hex**。

### 为什么要这么严（这是踩过的坑）
CSS 变量**静默失败**：`padding: var(--spacing-5)` 若 `--spacing-5` 未定义，会变成无效值被忽略 → 等于 `padding: 0`。
- TypeScript 查不出（它只是字符串）
- `npm run build` 照样通过
- ESLint 也不管

结果就是「构建全绿、界面全坏」——曾经因为 token 定义层缺失，全站间距塌成 0、核心区块无背景、字号无层级，肉眼走查才发现。**绿色构建 ≠ 样式正确。** 所以 token 必须有唯一、完整的定义源头。

---

## 版本管理（每次改动都要做）

每次有意义的改动都建立一个版本号，三件套同步：

1. **`package.json` 的 `version`** 按语义化版本递增：
   - 修订号（0.2.**0**→0.2.**1**）：小修小补、bug 修复
   - 次版本（0.**2**.0→0.**3**.0）：新增功能、明显改进
   - 主版本（**0**→**1**）：重大不兼容变更 / 正式发布
2. **`CHANGELOG.md`** 在顶部加一条对应版本的记录（日期 + 修复/新增分类）
3. **git tag**：提交后打 tag，如 `git tag v0.2.0`，连同 commit 一起 push（`git push --tags`）

> 提交信息用一句话中文、不带 emoji、写"做了什么"。

## 环境与运行

- `.env.local` 配 `AI_API_KEY` / `AI_MODEL=deepseek-chat` / `AI_BASE_URL=https://api.deepseek.com/v1`（`.env.local` 已 gitignore，勿提交）
- DeepSeek 走 OpenAI 兼容接口，AI SDK 必须用 `provider.chat(model)`（经典 `/v1/chat/completions`），不能用默认的 `/v1/responses`
- `npm run dev` → http://localhost:3000；结果页用 URL 传参（`/?q=...&type=...`），刷新/分享不丢
- `/test-card`、`/api/mock-card` 仅开发用，上线前删或加 dev 守卫
