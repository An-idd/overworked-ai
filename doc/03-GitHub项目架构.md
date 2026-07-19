# GitHub 项目架构设计

> 项目代号建议:`overworked-ai`(备选:`ai-labor-card` / `ai-996-card`)
> 一句话:Your AI files a labor complaint against you. 读本地用量 → 你的 AI 亲笔写投诉 → 出一张可晒的卡。

## 一、关键架构决策(为什么这样设计)

| 决策 | 选择 | 理由 |
|------|------|------|
| 语言/运行时 | **TypeScript + Node,npx 分发** | 目标用户是 Claude Code/Codex 用户,`npx overworked-ai` 零安装即跑;生态标杆 ccusage 就是这个模式 |
| 文案生成 | **shell 调用用户本地 CLI**(`claude -p` / `codex exec`) | 用户机器上就装着这俩,零 API key、零成本;且"AI 亲笔写自己的投诉"是产品梗的一部分 |
| 渲染 | **SVG 模版 + 空槽 → resvg/sharp 导出 PNG** | 文字由程序填,不靠图像模型(会崩字);模版即代码,PR 友好 |
| 数据 | **100% 本地只读,零上传** | 隐私是信任底线,README 顶部声明;参考 Readme.skill 的口碑做法 |
| 分发 | **CLI 为主 + Claude Code skill 为辅** | CLI 覆盖所有人;skill 版"装了就能说一句'给我出本周投诉卡'",分发顺滑 |
| 皮肤/模版 | **配置化目录,社区可 PR** | 皮肤和模版是可收集资产,开放贡献 = 自增长 |

## 二、目录结构

```
overworked-ai/
├── README.md                  # 双语,顶部放海报卡样图 + 一行命令(README 即落地页)
├── README.zh.md
├── LICENSE                    # MIT
├── package.json               # bin: overworked-ai
├── src/
│   ├── cli.ts                 # 入口:参数解析(--lang --skin --template --week --out)
│   ├── collectors/            # 数据采集层(每个工具一个适配器)
│   │   ├── types.ts           #   统一输出 RawSession[] 接口
│   │   ├── claude-code.ts     #   解析 ~/.claude/**/*.jsonl
│   │   ├── codex.ts           #   解析 Codex rollout JSONL
│   │   └── index.ts           #   自动探测哪些工具有日志
│   ├── stats/
│   │   ├── aggregate.ts       # RawSession[] → WeeklyStats(8 字段:时长/凌晨/周末/streak/token/最长/峰值日)
│   │   └── tier.ts            # WeeklyStats → 过劳等级(4档,阈值可配)
│   ├── copy/
│   │   ├── prompt.ts          # 组装文案 prompt(读 locales,填数据槽)→ 见《01-文案prompt.md》
│   │   ├── generate.ts        # shell 调 claude -p / codex exec → 拿 JSON;解析失败重试一次
│   │   └── fallback.ts        # 无 AI 可用时的内置兜底文案库(每特征 3-5 条轮换)
│   ├── render/
│   │   ├── template.ts        # 加载 SVG 模版,填槽(title/bubble/hero/stats×4/complaints×3/index/fun_fact/sign_off)
│   │   └── export.ts          # SVG → PNG(1080×1350),输出到 ./cards/
│   └── i18n.ts
├── templates/                 # SVG 模版(文字全空槽,{{slot}} 占位)
│   ├── arbitration.cn.svg     # 劳动仲裁申请(主打)
│   ├── arbitration.en.svg
│   ├── complaint-letter.{cn,en}.svg
│   ├── injury-report.{cn,en}.svg
│   ├── resignation.{cn,en}.svg
│   └── best-employer.{cn,en}.svg   # 摸鱼周稀有彩蛋卡
├── assets/skins/              # 3 皮肤 × 4 过劳状态 PNG(gpt-image-2 产出后抠图)
│   ├── acode/    (tier1..4.png)    # 阿码·通用
│   ├── xiaoke/   (tier1..4.png)    # 小克·Claude 气质
│   └── xiaodex/  (tier1..4.png)    # 小Dex·Codex 气质(另含 terminal 暗黑特别版模版配色)
├── locales/
│   ├── zh.json                # prompt 模板、槽位标签、判词
│   └── en.json
├── skill/                     # Claude Code skill 分发形态
│   └── SKILL.md               # "生成本周投诉卡"技能(内部就是调本 CLI)
├── examples/                  # 样卡 PNG(README 引用,即宣传素材)
└── .github/
    ├── workflows/release.yml  # npm publish + release
    └── ISSUE_TEMPLATE/        #含"投稿新皮肤/新模版"模板(引导社区 PR)
```

## 三、数据流(一条管线)

```
collectors(探测+解析日志,只读)
  → stats/aggregate(8 字段 WeeklyStats)
  → stats/tier(过劳等级 1-4)
  → copy/prompt(数据填入中/英 prompt)
  → copy/generate(shell 调 claude -p 或 codex exec → JSON;失败→fallback)
  → render/template(JSON + 数据 + 皮肤状态图 填 SVG 槽)
  → render/export(PNG 1080×1350 → ./cards/2026-W29.png)
```

## 四、CLI 体验设计

```bash
npx overworked-ai                    # 全自动:探测日志→选默认皮肤→仲裁卡→出图
npx overworked-ai --skin xiaodex --template injury --lang en
npx overworked-ai --list             # 列出检测到的工具/周/可用皮肤模版
npx overworked-ai --no-ai            # 跳过 AI 生成,用内置兜底文案
```

- 默认零参数出图(降低晒的门槛);出图后终端打印卡路径 + 一句"晒出去吧,老板"
- 探测不到日志时给出各工具日志路径说明

## 五、扩展点(留好接口,别提前做)

1. **collectors 插件化**:Cursor / Gemini CLI / Copilot 后续各加一个适配器即可(接口已统一)
2. **皮肤/模版投稿**:PR 一个目录就是一款皮肤;好的社区皮肤 = 自增长飞轮
3. **月度/年度卡**:aggregate 支持时间窗参数,年底出"年度压榨总结"(Wrapped 时刻,最大传播节点)
4. **badge 模式**:输出小尺寸 SVG 徽章可嵌 GitHub README(长期曝光位)

## 六、README 即落地页(营销要点)

- 顶部:最好笑的一张样卡大图 + 一行安装命令
- 三行卖点:你的 AI 要投诉你 / 100% 本地零上传 / 一条命令出卡
- 隐私声明 + **"非官方粉丝二创,与任何 AI 公司无关"**(双语,固定)
- 健康基调声明:玩梗解压,不美化过劳
- examples/ 放 4 模版 × 3 皮肤样卡九宫格

## 七、MVP 切法(两周内可发)

**Phase 1(MVP,先发出去验证):**
- collectors: 仅 claude-code
- 模版: 仅 arbitration.cn
- 皮肤: 仅 acode(4 状态图你用 gpt-image-2 出)
- copy: prompt + claude -p 调用 + fallback
- 出图 + README + 发 X/即刻/小红书看采纳

**Phase 2(有反响再做):** codex collector、en、其余 3 模版、小克/小Dex 皮肤、skill 形态、badge

**Phase 3(社区):** 皮肤投稿机制、年度 Wrapped 卡、更多工具适配

## 八、命名与合规清单

- [ ] npm 包名查重(`overworked-ai` 等)
- [ ] MIT License + 二创声明进 README 与卡片角落
- [ ] 不在包名/皮肤名用 "Claude"/"Codex" 商标词(用 xiaoke/xiaodex 这类昵称)
- [ ] 隐私:代码里无任何网络请求(除可选的更新检查,默认关)
