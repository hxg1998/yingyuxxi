# Supabase 项目创建 + 环境变量配置傻瓜步骤

完成这份指南后，你可以在本地用 `npm run dev` 跑通 Magic Link 登录。

---

## 第一步：创建 Supabase 项目

1. 打开 [https://supabase.com](https://supabase.com)，注册/登录账号（GitHub 登录最方便）。

2. 点击「New Project」。
   - Organization：选你的个人账户
   - Project name：随意，如 `wordcard`
   - Database Password：设一个强密码（**保存好，后面用不到，但万一需要直接连数据库时要用**）
   - Region：选 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`，就近选

3. 点「Create new project」，等待大约 1-2 分钟初始化完成。

---

## 第二步：获取 API 密钥

1. 进入刚创建的项目，点左侧菜单「Settings」→「API」。

2. 找到以下两个值，复制备用：
   - **Project URL**：格式为 `https://xxxxxxxxxxxx.supabase.co`
   - **anon public**（在 Project API keys 下面）：格式为 `eyJhbGc...` 开头的长字符串

---

## 第三步：配置本地环境变量

1. 在 `wordcard/` 项目根目录下，新建文件 `.env.local`（注意不是 `.env`）。

2. 填入以下内容（替换成你刚复制的真实值）：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...你的 anon key...
```

3. **不要把 `.env.local` 提交到 git**（已在 `.gitignore` 中排除）。

---

## 第四步：配置 Magic Link 回调 URL

1. 在 Supabase 控制台，点「Authentication」→「URL Configuration」。

2. 在「Site URL」填入：
   ```
   http://localhost:3000
   ```

3. 在「Redirect URLs」点「Add URL」，填入：
   ```
   http://localhost:3000/auth/callback
   ```

4. 如果你部署到 Vercel，还需要再加上你的生产域名，例如：
   ```
   https://your-app.vercel.app/auth/callback
   ```

5. 点「Save」。

---

## 第五步：（推荐）关闭邮件确认，避免 Magic Link 被误分类

1. 进入「Authentication」→「Providers」→「Email」。

2. 确认「Enable Email Signup」已开启。

3. 开发阶段可以暂时关闭「Confirm email」（即注册后无需确认邮箱），但 Magic Link 本身的邮件验证不受影响。

---

## 第六步：本地测试

```bash
cd wordcard
npm run dev
# 浏览器打开 http://localhost:3000
```

1. 点击「翻译」按钮 → 会弹出登录弹窗
2. 输入你的邮箱 → 点「发送登录链接」
3. 去邮箱找 Supabase 发来的邮件（可能在垃圾邮件箱）
4. 点击邮件里的链接 → 跳转到 `/auth/callback` → 登录成功，显示「登录成功」提示

---

## 生产环境额外配置（部署到 Vercel 时）

### 配置环境变量

1. 在 Vercel 项目设置（Settings → Environment Variables）中添加：
   - `NEXT_PUBLIC_SUPABASE_URL` = 你的 Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 你的 anon public key

### 配置自定义 SMTP（解决邮件送达率问题）

Supabase 默认使用内置 SMTP，开发环境每天只能发 4 封邮件。生产环境建议接 [Resend](https://resend.com)：

1. 注册 Resend 账号（免费额度：每月 3,000 封）
2. 创建 API Key
3. 在 Supabase 控制台「Authentication」→「SMTP Settings」填入 Resend 的 SMTP 配置：
   - Host：`smtp.resend.com`
   - Port：`465`
   - Username：`resend`
   - Password：你的 Resend API Key
   - Sender email：需要在 Resend 里验证的域名邮箱

---

## 常见问题

**Q：发了邮件但收不到？**
A：1）检查垃圾邮件箱；2）Supabase 免费版开发环境每天限 4 封；3）生产环境必须配自定义 SMTP。

**Q：点链接跳到 `/auth/error` 页面？**
A：Magic Link 只能点一次，15 分钟内有效。重新在 WordCard 发一封新链接。

**Q：本地 `npm run dev` 提示 `NEXT_PUBLIC_SUPABASE_URL is missing`？**
A：检查 `.env.local` 文件是否存在、变量名是否拼写正确、是否有多余空格。

**Q：Vercel 部署后登录成功但马上退出了？**
A：确认 Vercel 环境变量已经设置，并且 Supabase「Redirect URLs」包含了你的生产域名 `/auth/callback`。
