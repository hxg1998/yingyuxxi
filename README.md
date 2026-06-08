# WordCard

为中文互联网人设计的英语学习卡片工具。输入一个英文单词、短语或短句，立刻得到一张帮你"听懂、读出、用上"的结构化学习卡片。

核心差异点：**中英文混合拟音**（如 `呃-LINE-门特`）+ **行业场景例句**（互联网/AI/产品/创业语境）。

## 安装依赖

```bash
cd wordcard
npm install
```

## 配置 API Key

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 Anthropic API Key：

```
AI_API_KEY=sk-ant-xxxxxx
```

其他配置项有默认值，通常不需要改动。

## 本地启动

```bash
npm run dev
```

打开 http://localhost:3000

## 生产构建

```bash
npm run build
npm start
```

## 预览卡片效果（无需 API Key）

访问 http://localhost:3000/test-card 可以用 mock 数据预览完整卡片渲染效果，不需要配置 API Key。

## 部署到 Vercel

1. 把项目推到 GitHub
2. 在 Vercel 导入项目
3. 在 Vercel 项目设置 → Environment Variables 中添加 `AI_API_KEY`
4. 部署

## 目录结构

```
src/
├── app/
│   ├── page.tsx                    # 单页主界面（4 种状态）
│   ├── globals.css                 # Arco + Bohrium 主题 CSS
│   ├── layout.tsx                  # 根布局
│   └── api/
│       ├── generate-card/route.ts  # AI 调用 API Route（服务端，保护 Key）
│       └── mock-card/route.ts      # 开发用 mock 数据
├── components/
│   ├── InputPanel.tsx              # 输入面板
│   ├── CardResult.tsx              # 卡片结果容器
│   ├── card-modules/               # 6 个卡片模块组件
│   └── shared/                     # 骨架屏、错误状态、复制按钮
├── lib/
│   ├── ai.ts                       # Prompt 构建 + JSON 解析
│   ├── input-classifier.ts         # 输入类型判断（word/phrase/sentence）
│   └── card-validator.ts           # AI 输出结构校验
├── stores/cardStore.ts             # Zustand 全局状态
└── types/card.ts                   # TypeScript 类型定义
```

## 技术栈

- Next.js 14 App Router + TypeScript
- Arco Design + Bohrium 主题（@arco-themes/react-abcd2）
- Zustand 状态管理
- Vercel AI SDK + @ai-sdk/anthropic（Claude）
- Tailwind CSS（仅布局辅助）

## 已知限制

- V1 无账号体系，刷新页面不保留历史（URL 参数可恢复当前卡片）
- 真人发音链接（audio.url）由 AI 生成，可能返回 null 或失效链接；V2 改用词典 URL 模板
- 无速率限制，上线前建议加 IP 级限流（Upstash Redis）
