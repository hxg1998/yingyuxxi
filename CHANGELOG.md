# 更新日志

本项目版本号遵循语义化版本（[SemVer](https://semver.org/lang/zh-CN/)）：`主版本.次版本.修订号`。
每次改动在此记录一条，并打对应的 git tag（如 `v0.2.0`）。

## [0.7.0] - 2026-06-11

### 变更
- 复习库存储从 localStorage 迁移到 Supabase 云端，绑定登录账户，跨设备可用
- 新增 `review_cards` 表（卡片内容 + SM-2 状态合表），RLS 基于 `auth.uid()` 做用户隔离，`(user_id, normalized_text)` 唯一约束去重
- 数据层 `review-store.ts` 改为 supabase-js 直连（异步），DB snake_case ↔ JS camelCase 集中映射；调用方（复习库列表/复习流程/完成页/导航角标）改造为异步加载
- 查词成功 upsert 到云端（已存在未掌握→只更新内容保留 SRS 进度；已掌握→弹窗确认）；复习评分回写 SM-2 状态；导出 JSON 数据源改为云端
- 未登录不读写云端，安全降级不报错；旧 localStorage 数据不迁移

## [0.6.0] - 2026-06-10

### 新增
- 登录与身份认证模块（Login & Auth，PRD/12-login-auth.md）：Supabase Auth + 邮箱 Magic Link 唯一登录方式
- 新增 Zustand `authStore`（`src/stores/authStore.ts`）：管理 `user`、`sessionStatus`，对外暴露 `user.id` 和 `sessionStatus` 供云存储模块后续消费
- 新增 `AuthProvider`（根 Layout Client Component）：挂载 `onAuthStateChange` 监听器，自动同步登录态到 authStore，含 3 秒 session 加载超时静默降级
- 新增 `LoginModal`（`src/components/auth/LoginModal.tsx`）：Magic Link 登录弹窗，三态切换（邮箱输入 / 发送中 / 邮件已发送），含60秒倒计时重发、更换邮箱、前端邮箱校验、行内错误提示
- 新增 `AuthNavArea`（`src/components/auth/AuthNavArea.tsx`）：导航栏右侧区域，根据 sessionStatus 渲染三种态（Skeleton 骨架 / 登录按钮 / 用户菜单）
- 新增 `UserMenu`（`src/components/auth/UserMenu.tsx`）：已登录态用户标识，Desktop 展示邮箱缩略 + 下拉菜单，Mobile 仅显示头像 + 右侧 Drawer
- 新增 `useAuthGate` hook（`src/lib/useAuthGate.ts`）：动作级登录拦截，未登录时弹 LoginModal，登录后自动执行待定操作
- 新增 `/auth/callback` route handler：处理 Magic Link 回调，exchangeCodeForSession 建立 session
- 新增 `/auth/error` 页面：Magic Link 失效时的全页错误状态（Arco Result 组件）
- 新增 Supabase 中间件（`middleware.ts`）：每次请求静默刷新 session cookie
- 按需弹窗拦截：「翻译按钮」和「复习库」入口点击时检查 sessionStatus，未登录则弹 LoginModal（source 对应不同文案）
- 新增 Supabase 依赖：`@supabase/supabase-js`、`@supabase/ssr`
- 更新 `.env.example`，增加 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 占位说明
- 新增 `docs/supabase-setup.md`：Supabase 项目创建 + 环境变量配置傻瓜步骤文档

### 修改
- `AppNav`：集成 AuthNavArea 到桌面端 Header 右侧；复习库按钮点击接入登录拦截
- `layout.tsx`：根 Layout 包裹 AuthProvider
- `page.tsx`（首页）：翻译按钮 onSubmit 接入 useAuthGate 拦截

### 边界说明（本模块不做）
- 复习库的云端存储/同步数据（另一对话单独实现）
- localStorage 老数据迁移（已知取舍，见 PRD/12-login-auth.md）
- 跨标签页自动接续操作（后续打磨项）

## [0.5.0] - 2026-06-09

### 变更
- 上线准备：开发用入口 `/test-card`、`/api/mock-card` 在生产环境返回 404，本地开发不受影响

## [0.4.0] - 2026-06-09

### 新增
- 复习库完整能力（Review Library）：基于 SM-2 间隔重复算法的主动记忆训练系统
- 卡片查词成功后自动保存到 localStorage，Toast 提示「已保存到复习库」
- 去重逻辑：新词直接存入；已存在未掌握词更新内容保留 SRS 状态；已掌握词弹窗询问是否重新加入队列
- localStorage 容量超限友好提示，不静默失败
- 新增路由 `/review`（列表页）、`/review/session`（复习流程）、`/review/done`（完成页）
- 共享导航：桌面端 Header（首页/复习库）+ 移动端吸底 Tab Bar，均含 Badge 显示今日待复习数量
- 复习库列表页：今日队列卡片（立即开始复习）、统计三格（总词数/已掌握/今日到期）、搜索、筛选 Tabs（全部/今日到期/已掌握/需加强）、排序、列表项（复习该词/标记掌握）、导出 JSON 按钮、页脚风险提示
- 复习流程步骤1（正面回忆）：原文大字 + 音标 + TTS 点我听 + 翻开卡片按钮
- 复习流程步骤2（评分）：完整卡片内容（含 readingChinese 高亮 stressedSyllable）+ 三档评分按钮（显示预计下次复习时间）
- SM-2 调度引擎：初始 EF=2.3，下限 1.3，三档 q=0/3/5，答错归零，每次最多 20 条
- 复习完成页：本次统计（复习数/会了/模糊/不会）+ 明后天到期预告 + 查看复习库/再查一个词
- 首次进入复习库的数据风险 Modal（localStorage flag 只弹一次）、标记掌握确认 Modal
- 空状态：无记录引导查词，今日无待复习显示明天到期数

### 修复 / 优化
- 「怎么读」发音准确性修复：prompt 强制先定准音标、再严格按真实发音逐音对应中文字，禁止照字母拼写猜（修复 todo 误读为「透-兜」等问题）
- 清理已废弃的 translit/chinesePinyin 死字段（prompt、类型、校验器、mock 数据），并修正过时注释

## [0.3.0] - 2026-06-08

### 新增
- 接入 OpenAI 兼容 TTS（AiHubMix / gpt-4o-mini-tts），「点我听」升级为高质量真人级发音
- 新增服务端 TTS 接口 `/api/tts`：以 text 的 SHA-256 hash 为 key 做磁盘缓存（`.tts-cache/`），命中缓存直接返回，不再调外部 API，节省成本
- 单词、短语、**短句**三种类型均支持发音（解除短句的 SpeakButton 限制）
- 降级策略：TTS API 不可用时（key 缺失、网络错误、上游故障）自动回退到浏览器内置 SpeechSynthesis，保证始终有声音
- 前端对同一词汇缓存 objectURL，重复点击不重复发请求
- 更新 `.env.example` 补充 TTS_* 变量说明；`.tts-cache/` 加入 `.gitignore`

## [0.2.0] - 2026-06-08

### 修复
- 修复全站 UI 间距塌陷：卡片内边距、模块分隔、初始态/移动端留白等全部恢复
- 修复核心「怎么读」区块无暖色背景、重读音节无高亮、字号无层级等问题
- 短句类型不再渲染「点我听」按钮和英文拆读行（按 DESIGN.md §5）
- 「点我听」按钮改为 outline + 播放图标 + 成功色样式
- 底部「分享链接 / 复制卡片」改为两端分列；示例提示词加 hover 反馈

### 新增 / 改进
- 建立设计 token 源头层（`globals.css` 的 `:root`），统一定义间距/字号/字重/阴影/语义色
- 新增 `CLAUDE.md`：约束 token 唯一源头规则与版本管理流程，防止 CSS 变量静默失效再现

## [0.1.0] - 2026-06-08

### 新增
- WordCard 初版：输入英文单词/短语/短句，AI 生成结构化学习卡片
- 卡片含中文含义、音标、中文谐音发音（含浏览器 TTS「点我听」）、行业例句
- 单页四状态（初始/加载/结果/错误）+ URL 传参（刷新、分享）
- 接入 DeepSeek（OpenAI 兼容接口）
