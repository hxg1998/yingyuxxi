# 真人发音数据源方案调研报告

**项目**：WordCard 英语学习卡片工具  
**调研日期**：2026-06-16  
**目的**：为"真人发音"按钮功能选型数据源，供后续 PRD 需求文档使用  
**范围**：不写代码、不写 PRD，仅梳理事实、对比方案、给出倾向性建议

---

## 一、候选数据源对比总表

> 标注说明：✅ 已核实 | ⚠️ 需进一步确认/实测 | ❌ 明确不可行

| 维度 | Forvo API | Merriam-Webster API | Cambridge Dictionary API | Free Dictionary API (dictionaryapi.dev) | 有道 dictvoice（非官方接口） | 有道智云词典 API（官方） | Oxford Languages API |
|---|---|---|---|---|---|---|---|
| **单词覆盖** | 极高，600 万条录音，430+ 语言 ✅ | 高，111,000+ 英语发音 ✅ | 高，英美两音均有 ✅ | 中等，仅覆盖常见词，音频来自 Google gstatic ✅ | 中等，覆盖常用单词 ⚠️ | 高，含英英/英汉多词典 ✅ | 高，标准英美音 ✅ |
| **短语覆盖** | 有，众包短语录音，但覆盖不稳定 ⚠️ | 低，含 3500+ 习语，但不含任意短语 ✅ | 低，仅词条级别 ⚠️ | 极低或无 ✅ | 极低或无 ⚠️ | 低，词条短语有，任意短语无 ⚠️ | 低，仅词条级别 ⚠️ |
| **句子覆盖** | 几乎无 ✅ | 无 ✅ | 无 ✅ | 无 ✅ | 无 ✅ | 无 ✅ | 无 ✅ |
| **口音** | 多口音（众包多国用户录制） ✅ | 美音为主 ✅ | 英音 + 美音双轨 ✅ | 英音/美音混杂（取决于 Google 数据） ✅ | 美音（type=0）、英音（type=1） ✅ | 美音 + 英音 ✅ | 英音 + 美音 ✅ |
| **音频质量** | 不一致（众包录制，质量参差） ✅ | 高，专业真人录音 ✅ | 高，专业真人录音 ✅ | 中，Google 录音质量尚可但非词典级 ✅ | 中，真人发音但来源不明 ⚠️ | 高，来自词典专业录音 ✅ | 高，专业录音 ✅ |
| **接入方式** | 官方 REST API，需 API Key ✅ | 官方 REST API，需注册 Key，音频需拼 URL ✅ | 官方 REST API，需申请 Access Key ✅ | 免费 REST API，**无需 Key** ✅ | 直接拼 URL，**无需 Key**（非官方） ✅ | 官方 API，需商务洽谈开通 ✅ | 官方 API，需商务洽谈，定制合同 ✅ |
| **音频 URL 格式** | API 返回临时 URL，2 小时过期 ✅ | `https://media.merriam-webster.com/audio/prons/en/us/mp3/{subdir}/{filename}.mp3`，规则：文件名以 bix→bix目录，gg→gg目录，数字/符号→number目录，其余→首字母目录 ✅ | `https://dictionary.cambridge.org/media/english/[uk_pron|us_pron]/.../{word}.mp3`，需通过 API 获取具体路径 ✅ | `//ssl.gstatic.com/dictionary/static/sounds/.../{word}.mp3`（Google CDN） ✅ | `http://dict.youdao.com/dictvoice?audio={word}&type=0`（美音），`type=1`（英音） ✅ | API 返回 ukSpeech / usSpeech 字段，具体 URL 格式未公开 ⚠️ | API 返回 pronunciations 字段含音频链接 ✅ |
| **是否可缓存** | **明确禁止**，音频链接 2 小时有效 ✅ | 条款未明确，但商业使用需联系授权 ⚠️ | **明确禁止**（terms 原文："cannot cache, record, pre-fetch or otherwise make or store copies"） ✅ | 无明确限制，但音频来自 Google 第三方，Google 服务条款另算 ⚠️ | 非官方接口，无明确条款，存在法律风险 ⚠️ | **明确禁止**（官方文档："严禁缓存、再利用与转卖"） ✅ | 条款需查看，大概率禁止 ⚠️ |
| **商业使用** | 商业小企业计划允许（$28.95/月），需署名 Forvo ✅ | 商业用途需联系谈判逐案定价，免费版仅限非商业 ✅ | 商业用途需签 Application Development Agreement，30 天评估期 ✅ | 声明永久免费，但商业条款不明确，音频来自 Google 存在版权不确定性 ⚠️ | **未授权使用**，非官方接口，商业使用存在法律风险 ❌ | 商务合作制，需签合同，定制价格 ✅ | 商业授权起步 £5,000/年/语言 ✅ |
| **费用** | 非营利 $2/月（500次/天），商业 $28.95/月（10,000次/天），企业级需询价 ✅ | 免费 1,000次/天/Key（非商业），商业需付费谈判 ✅ | 免费评估 30 天 3,000次，正式商业价格需申请 ⚠️ | 永久免费，无配额限制 ✅ | 免费（无需 Key，但合规风险高） ⚠️ | 商务定制，价格未公开 ⚠️ | 商业起步 £5,000/年 ✅ |
| **中国大陆可达性** | DNS 解析存在问题（实测工具报错），极可能被 GFW 封锁 ⚠️ | merriam-webster.com 未列入主要封锁名单，但 GFW 状态不稳定，需实测 ⚠️ | dictionary.cambridge.org 未列入主要封锁名单，但音频 CDN 路径需实测 ⚠️ | **音频来自 ssl.gstatic.com（Google CDN），在中国大陆几乎确定无法访问** ❌ | **dict.youdao.com 为国内域名，中国大陆直连无问题** ✅ | **ai.youdao.com 国内平台，直连无问题** ✅ | 未知，需实测 ⚠️ |
| **稳定性/限流** | 付费计划有日配额，有 SLA（企业级），较稳定 ✅ | 付费有 SLA，免费版 1,000次/天 ✅ | 评估版有限额，正式版 SLA 待确认 ⚠️ | 无官方 SLA，第三方项目，稳定性不保证 ⚠️ | **无保证，随时可能失效（非官方）** ⚠️ | 商务级，有 SLA ✅ | 企业级 SLA ✅ |

---

## 二、关键决策问题分析

### 问题 1：短语/短句怎么办——降级策略

**核心事实**：所有主流词典 API 发音数据只面向单词级别，少量覆盖固定习语。本产品涉及短语和短句时，词典真人发音几乎必然查无数据。

**建议策略（三层设计）**：

```
层级 1  输入长度 ≤ 1 个词条  → 查询词典真人发音，成功则显示"真人发音"按钮
层级 2  输入为短语/找不到词条  → 隐藏"真人发音"按钮（不显示找不到的空按钮）
         或：降级展示"AI 朗读"（现有 TTS 按钮），并加 tooltip 说明"短语暂无真人录音"
层级 3  真人发音 API 请求失败  → 静默降级到现有 TTS，用户无感知
```

倾向性建议：**对于短语/短句，隐藏真人发音按钮而非显示错误状态**。理由：对用户来说"没有这个按钮"比"点了没反应"体验更好；同时短语本身可以靠现有 TTS 解决，不是功能缺失。

---

### 问题 2：外链 vs 服务端代理/缓存

**两种方案对比**：

| 维度 | 直接前端外链播放 | 服务端 API Route 代理（+缓存） |
|---|---|---|
| 合规风险 | 更低：音频文件在词典方服务器上，我们只是"链接"，不存储、不分发 | 更高：相当于转存词典的版权音频，Forvo/Cambridge 明确禁止；MW 未明确但有风险 |
| 中国大陆可达性 | 高风险：如果词典服务器被 GFW 封锁，前端直接播放失败 | 可控：代理部署在国内或香港节点，规避 GFW 问题 |
| 实现成本 | 极低：前端直接 `<audio src="...">` | 中等：需要写 API route、处理转发、错误降级 |
| 性能 | 取决于词典服务器的 CDN 在国内的速度 | 可叠加缓存，二次访问快 |
| 可缓存性 | 不需要缓存 | 大多数来源明确禁止缓存，代理+缓存存在违约风险 |

**倾向性建议**：结合合规与可达性，**不建议服务端缓存音频文件**（违反条款风险高）；但**建议走服务端代理转发**（不存储，只转发），理由：
1. 统一解决 GFW 可达性问题（用自己的服务端作跳板）。
2. 可在代理层做错误处理和降级逻辑，前端不需要处理多种 source。
3. 对于有道 dictvoice 这类国内接口，甚至不需要代理，前端直连即可。

---

### 问题 3：是否需要兜底链

**建议的多级降级链**：

```
真人发音（词典 API）
  → 找不到 / 非单词场景  → 隐藏按钮
  → API 请求失败（超时/500）  → 静默切换到 现有 TTS（/api/tts，gpt-4o-mini-tts）
  → TTS 也失败  → 降级到 浏览器 SpeechSynthesis
```

这个三级降级链与现有 TTS 架构兼容，**合理，建议采用**。需要在实现时注意：真人发音失败时不要在 UI 上显示错误，静默降级后 SpeakButton 的状态要反映实际播放的来源（例如 tooltip 区分"真人录音"和"AI 朗读"）。

---

## 三、主推方案 vs 备选方案

### 主推方案：Merriam-Webster Collegiate Dictionary API

**理由**：

1. **合规性最清晰**：官方 API，有明确的免费非商业条款（1,000次/天）；商业版本通过官方联系授权，条款透明。
2. **音频质量高**：专业真人录音，111,000+ 条发音，标准美音，一致性好。
3. **URL 格式已知可控**：音频 URL 构造规则完全文档化，可以在前端或服务端按规则拼接，不需要每次都请求 API 查询。
4. **覆盖度对 WordCard 够用**：产品主打单词学习，词典级别的单词覆盖基本满足需求，短语降级用 TTS 即可。
5. **费用可接受**：初期用免费额度验证，商业化后再签协议。

**接入方式**：注册 API Key → 调用 `https://www.dictionaryapi.com/api/v3/references/collegiate/json/{word}?key=xxx` → 解析 `sound.audio` 字段 → 拼接 URL → 前端或服务端代理播放。

**主要风险**：
- 中国大陆可达性：merriam-webster.com 没有明确被封，但属于境外服务，CDN 速度和稳定性需实测。如果直连有问题，需要走服务端代理转发。
- 商业使用：免费版明确只限非商业。产品上线后如有商业化，需签约授权，授权条款和费用未知。

---

### 备选方案：有道 dictvoice 接口（用于兜底/中国用户优先）

> 注意：这是一个**没有官方授权的非正式接口**，合规风险较高，不建议作为主力方案，仅作为技术可行性备选。

**URL 格式**：
```
美音：http://dict.youdao.com/dictvoice?audio={word}&type=0
英音：http://dict.youdao.com/dictvoice?audio={word}&type=1
```

**优点**：
- 中国大陆直连，无 GFW 问题，速度快。
- 无需 API Key，接入成本极低。
- 返回 MP3，前端直接 `<audio>` 播放。

**缺点**：
- **合规风险高**：没有官方授权，有道声明禁止缓存和商业使用。用于商业产品存在法律风险，随时可能被封禁或要求停止使用。
- 接口稳定性不保证，可能随有道更新失效。
- 短语几乎无覆盖。

**建议使用场景**：仅用于开发阶段内部验证（POC），绝对不建议在正式商业产品中以这种方式使用有道接口。

---

### 方案对比一览

| 对比维度 | 主推：Merriam-Webster API | 备选：有道 dictvoice（非官方） |
|---|---|---|
| 合规 | ✅ 官方授权，有条款 | ❌ 未授权，商业使用违规 |
| 中国大陆可达性 | ⚠️ 境外服务，需实测或代理 | ✅ 国内直连 |
| 音频质量 | ✅ 专业录音，稳定 | ⚠️ 质量尚可，来源不明 |
| 接入成本 | 低（需注册 Key） | 极低（无需任何注册） |
| 稳定性 | ✅ 官方服务，有 SLA | ⚠️ 非官方，无保证 |
| 短语支持 | ❌ 词典范围内，短语降级 TTS | ❌ 同左 |
| 费用 | 免费额度够 MVP，商业需谈判 | 表面免费，实为违规使用 |

---

## 四、未纳入主推的方案说明

| 来源 | 排除原因 |
|---|---|
| **Forvo API** | 音频 URL 2 小时过期，无法正常使用（前端外链会失效）；明确禁止缓存；forvo.com 在大陆可能被封；价格偏高但覆盖质量参差。排除。 |
| **Cambridge Dictionary API** | 明确禁止缓存；商业授权需签协议，流程复杂；API 评估期仅 30 天 3,000 次；音频 URL 格式不固定需通过 API 获取。作为**长期备选**可以研究，但 V1 不优先。 |
| **Free Dictionary API (dictionaryapi.dev)** | 音频来自 ssl.gstatic.com（Google CDN），在中国大陆几乎确定无法访问，直接排除。 |
| **有道智云官方词典 API** | 商务合作制，需线下洽谈，无法自助开通；官方明确禁止缓存。适合大型 B 端项目，不适合当前阶段。 |
| **Oxford Languages API** | 商业授权起步 £5,000/年，对小团队成本过高；接入流程复杂。排除。 |
| **金山词霸 / 欧路词典** | 接口文档混乱，大部分为逆向破解非官方接口，合规性差。无正式商业 API。排除。 |

---

## 五、风险与待确认事项清单

### 高优先级（进入需求文档前必须确认）

1. **Merriam-Webster 中国大陆可达性实测**（最关键）  
   - 需要在国内环境实测 `https://www.dictionaryapi.com` 和 `https://media.merriam-webster.com` 的响应速度与稳定性。  
   - 如果不通，必须走服务端代理，架构设计需要相应调整。  
   - 状态：⚠️ 需实测

2. **Merriam-Webster 商业使用授权路径**  
   - 免费版限非商业，WordCard 如果未来走商业化（付费订阅/广告），需提前了解签约流程和费用。  
   - 建议：发邮件询问 dictionaryapi.com，提前获取商业价格。  
   - 状态：⚠️ 需确认

3. **Merriam-Webster 缓存条款**  
   - 条款页面未明确说明音频是否可以缓存。如果可以，可以复用现有 TTS 缓存机制；如果不行，每次播放都要实时请求。  
   - 状态：⚠️ 需核实条款或邮件询问

### 中优先级（需求文档撰写阶段厘清）

4. **"真人发音"按钮的 UI 位置和视觉区分**  
   - PRD/01-overview.md 将其列为第 6 大模块，但具体放在卡片的哪个位置、如何与现有"AI 朗读"按钮区分，需要产品决策。  
   - 状态：⚠️ 产品决策待定

5. **短语判断逻辑**  
   - 如何判断"当前卡片是单词还是短语"：按空格数？按字符数？按 API 查询结果是否有返回？  
   - 状态：⚠️ 产品决策待定

6. **降级时 UI 提示策略**  
   - 当真人发音找不到、降级到 TTS 时，是否告知用户，如何告知（tooltip、icon 颜色、静默）？  
   - 状态：⚠️ 产品决策待定

### 低优先级（V2 再说）

7. **多口音支持**  
   - Merriam-Webster 主要是美音，V1 够用；如果将来需要英音，需要换 Cambridge 或叠加多来源。  
   - 状态：V2 再议

8. **短语的真人发音解决方案**  
   - 理论上可以通过 Forvo 众包获取部分短语录音，但合规和稳定性问题大，V1 不做。  
   - 状态：V2 再议

---

## 六、信息来源

### 已核实（通过官方文档或直接 fetch 验证）

- Forvo API 定价与条款：[https://api.forvo.com/plans-and-pricing/](https://api.forvo.com/plans-and-pricing/)，[https://api.forvo.com/documentation/general-information/](https://api.forvo.com/documentation/general-information/)
- Forvo 禁止缓存（原文）：API 文档明确 "It is not allowed to cache audio pronunciations. Audio links expire after 2 hours."
- Merriam-Webster API 定价与商业条款：[https://dictionaryapi.com/info/frequently-asked-questions](https://dictionaryapi.com/info/frequently-asked-questions)，[https://dictionaryapi.com/info/terms-of-service](https://dictionaryapi.com/info/terms-of-service)
- Merriam-Webster 音频 URL 构造规则：[https://dictionaryapi.com/products/json](https://dictionaryapi.com/products/json)（bix/gg/number/首字母 目录规则已确认）
- Cambridge Dictionary API 明确禁止缓存：[https://dictionary-api.cambridge.org/api/terms-and-conditions](https://dictionary-api.cambridge.org/api/terms-and-conditions)（原文："cache, record, pre-fetch or otherwise make or store copies of the CDO Content"）
- Cambridge API 评估版限制：30 天，3,000 次
- Free Dictionary API 音频来自 Google gstatic：[https://dictionaryapi.dev/](https://dictionaryapi.dev/)（示例 URL 含 ssl.gstatic.com）
- 有道 dictvoice URL 格式：多篇 CSDN 文章交叉验证，`dict.youdao.com/dictvoice?audio={word}&type=0/1`
- 有道禁止缓存（官方 API 文档原文）：[https://ai.youdao.com/DOCSIRMA/html/dictionary/api/ydcd/index.html](https://ai.youdao.com/DOCSIRMA/html/dictionary/api/ydcd/index.html)（"严禁缓存、再利用与转卖"）
- Oxford Languages 商业价格：[https://developer.oxforddictionaries.com/](https://developer.oxforddictionaries.com/)（£5,000/年起）

### 需进一步确认/实测

- Merriam-Webster 在中国大陆的可达性（实测）
- Merriam-Webster 音频文件是否允许缓存（条款未明确说明）
- Merriam-Webster 商业授权的具体价格（需邮件询问）
- Cambridge Dictionary 正式商业版费用（评估期后需申请）
- Forvo.com 是否被 GFW 封锁（DNS 检测工具报错，疑似封锁，未最终确认）
- 有道 dictvoice 非官方接口在 2026 年是否仍可用（无最新确认，可能已失效）
- 有道智云官方词典 API 具体定价（商务合作制，未公开）

---

## 七、建议下一步（进入需求文档环节前需定的问题）

1. **先做可达性实测**：在国内网络环境下测试 `https://media.merriam-webster.com/audio/prons/en/us/mp3/r/run00001.mp3` 能否直接播放。这决定了是"前端直接外链"还是"服务端代理"的架构路线。

2. **确认是否需要代理架构**：如果 MW 国内不通，需要在需求文档里明确"真人发音音频走服务端代理转发（不缓存）"，这影响后端实现量估算。

3. **确定短语/句子的按钮显示规则**：是完全不显示按钮（当判断到不是单词时），还是显示但置灰（提示"仅支持单词"）？产品 owner 决策。

4. **向 Merriam-Webster 发询问邮件**：两个问题——商业授权价格、音频是否允许在代理场景下转发（不落地存储）。这在正式上线前必须确认。

5. **把上述决策结论输入需求文档**：以上四点全部确认后，即可撰写"真人发音"功能的 PRD 模块。
