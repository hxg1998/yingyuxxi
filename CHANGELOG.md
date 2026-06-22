# 更新日志

本项目版本号遵循语义化版本（[SemVer](https://semver.org/lang/zh-CN/)）：`主版本.次版本.修订号`。
每次改动在此记录一条，并打对应的 git tag（如 `v0.2.0`）。

## [0.9.2] - 2026-06-22

### 修复（线上生产故障）
- **修复线上间歇性整站报错**：`middleware.ts` 的 `supabase.auth.getUser()` 裸 await 无容错——Supabase Auth 偶发网络抖动/冷启动时未捕获异常会让中间件崩溃、全站返回 500。改为 try-catch 优雅降级（跳过本次 session 刷新，不阻断请求）
- **修复「点我听」TTS 线上 500**：缓存目录建在 `process.cwd()`（Vercel 上为只读的 `/var/task`），`mkdirSync` 抛 EROFS 导致接口崩溃。改用 `os.tmpdir()`（Vercel 唯一可写路径）；`ensureCacheDir` 改为不抛异常、缓存不可用时自动跳过缓存仍正常发音
- **修复「真人发音」线上 503**：`MW_COLLEGIATE_API_KEY` 此前只在本地 `.env.local`、未加到 Vercel 生产环境，导致 `/api/mw-lookup` 返回未配置。本次补加该变量到 Vercel 生产并重新部署

## [0.9.1] - 2026-06-17

### 修复
- **修复 CSS 颜色 token 全局静默失效的根因**：设计 token 层从 `:root` 移到 `body` 作用域。Arco 主题包把 raw ramp 变量（`--primary-6`、`--success-6` 等）定义在 `body` 上，而 token 层原定义在 `:root`（= html，body 的父级），CSS 变量只向下继承，导致 `rgb(var(--primary-6))` 等所有 `--color-*` token 解析为空——这正是发音按钮蓝绿色一直无法生效的真正原因。同步更新 CLAUDE.md 的 token 规则（`:root` → `body`）
- 修复导航「复习库」红色角标铺满整个文字：`AppNav` 的 Badge 由错误的 `style={{ background }}`（被 Arco 应用到外层 wrapper）改为 Arco Badge 的 `color` prop（正确作用于角标）。该 bug 此前因 `--color-badge-review` token 失效（透明）而被掩盖，token 修复后暴露
- 统一「点我听」和「真人发音」两个按钮的样式，让蓝绿色区分真正落到按钮主体（边框 + 文字 + 图标），而非仅图标
- `globals.css` 新增 `.speak-button:not(:disabled)` 绿色规则和 `.real-pron-button:not(:disabled)` 蓝色规则，覆盖 Arco `type="outline"` 默认主题蓝；hover/active 态同步协调，`:not(:disabled)` 限定范围保留 Arco 原生 disabled 灰样式
- 新增 `.real-pron-button--active` class 供 loading/playing 态（`disabled=true` 但视觉应保蓝色）使用
- `SpeakButton`：简化图标渲染，移除冗余的 `<span className="speak-button-icon">` 包裹层，图标色改由 `.speak-button` 的 `color` 继承
- `RealPronunciationButton`：图标移除内联 `style={{ color }}` 散落写法，改由 `className="real-pron-button"` 统一管理；loading/playing 态额外附 `real-pron-button--active` class
- 复习页 Step1/Step2 的内联「点我听」Button 改为直接复用 `SpeakButton` 组件（消除重复逻辑，获得状态机 + 缓存 + 可停止功能），删除已无调用方的 `speak()` 辅助函数和 `IconPlayCircle` 导入

## [0.9.0] - 2026-06-17

### 新增
- 复习流程页接入真人发音按钮（PRD/13-real-pronunciation.md v1.1）：Step1（正面·回忆态）和 Step2（翻开·评分态）各增加一个 `RealPronunciationButton`，与现有「点我听」TTS 按钮并排展示，降级逻辑与卡片页完全一致
- Step1 两按钮水平居中，`size="large"` 与现有 TTS 按钮对齐，移动端允许折行
- Step2 Header 右侧两按钮横排，`size="small"` 与现有 TTS 按钮对齐；左侧原文区 `flex:1` 支持长词折行，右侧按钮组 `flexShrink:0` 不被压缩
- 翻牌音频停止：Step1 与 Step2 条件渲染（不同时存在 DOM），翻牌时 Step1 整体 unmount，`RealPronunciationButton` 的 cleanup useEffect 自动 pause 音频；换卡时 `key={card.id}` 强制 remount 保证新卡重置状态

## [0.8.1] - 2026-06-17

### 修复
- 登录弹窗：发送频率超限的报错文案由"发送太频繁，请等待一分钟后再试"改为"发送太频繁，请稍后再试"（不写死具体等待时间，与实际限流策略更一致）

## [0.8.0] - 2026-06-16

### 新增
- 真人发音模块（PRD/13-real-pronunciation.md）：在「怎么读」区块新增「真人发音」按钮，播放 Merriam-Webster 词典真人录音，与现有「点我听（TTS）」按钮并排展示
- 新增服务端路由 `/api/mw-lookup`：接收 `GET ?word=xxx`，携带 `MW_COLLEGIATE_API_KEY` 调用 MW Collegiate API，解析音频文件名并按 MW 子目录规则拼接 URL，返回 JSON；API Key 不透传到前端
- 新增 `RealPronunciationButton` 组件（`src/components/shared/RealPronunciationButton.tsx`）：完整实现 6 态状态机（idle / loading / playing / disabled-type / disabled-no-audio / error）；disabled 态通过 span 包裹触发 Arco Tooltip（"仅支持单词" / "该词暂无真人录音" / "发音加载失败，请稍后重试"）；图标 IconUserGroup（蓝色 --color-primary-6）与 SpeakButton 绿色区分
- 更新 `PronunciationModule`：新增可选 `originalText` prop，传入时渲染两个按钮（SpeakButton + RealPronunciationButton），不传时仍只渲染 SpeakButton（复习流程页自动保持原样）
- 更新 `.env.example` 和 `.env.local` 新增 `MW_COLLEGIATE_API_KEY` 占位配置及 `MW_SCHOOL_API_KEY` 预留注释

### 边界说明（本版本不做）
- SD4 学校词典兜底、多来源降级链、音频服务端缓存（划到 V2）
- 复习流程页不渲染真人发音按钮（通过 `PronunciationModule` 的可选 `originalText` prop 控制）

## [0.7.1] - 2026-06-16

### 修复
- 登录发信触发频率限制（Supabase 429）时的提示文案：由「发送太频繁，请等待一分钟后再试」改为「发送太频繁，请稍后再试」——原文案写死「一分钟」，与每小时发信上限的实际等待不符，易误导

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
