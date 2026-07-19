# SVG 模版说明

1080×1350(4:5)。文字全部为 `{{slot}}` 占位,渲染时字符串替换后导出 PNG。
`sample-arbitration.cn.svg` 为已填样例,可直接浏览器打开预览。

## 渲染注意

- **推荐渲染器:@resvg/resvg-js**(或浏览器/Playwright)。它们会遍历完整 font-family 栈。
- cairosvg 只认栈里**第一个**字体,仅用于快速预览时需把首字体换成本机存在的(如 Linux 上 "Noto Serif CJK SC")。
- 字体栈已覆盖 Mac(Songti/Kaiti/PingFang)、Windows(SimSun/KaiTi/YaHei)、Linux(Noto CJK)。
- `{{skin_image}}` 是 `<image href>` 槽,渲染时填皮肤 PNG 路径(assets/skins/<skin>/tier<1-4>.png);图未填时显示灰底占位。
- `{{stars}}` 直接传字符串,如 `★★★★★`(不足五星用 `★★★☆☆`)。
- 长文本槽(complaints/notes)注意长度上限,超长在渲染前截断或缩字号。

## 通用槽位(四张卡共有)

`{{card_no}}` 编号(可玩梗:2026-第996号) · `{{bubble}}` 气泡金句 · `{{stars}}` 压榨指数 · `{{fun_fact}}` 数字类比 · `{{sign_off}}` 落款 · `{{skin_image}}` / `{{skin_placeholder}}` 皮肤图/占位文字

## 各模版专有槽位

### arbitration.cn.svg 劳动仲裁申请(主打)
`{{hero_value}}` `{{hero_label}}` — 超大数字与标签
`{{stat1..4_label}}` `{{stat1..4_value}}` — 2×2 数据格
`{{complaint_1..3}}` — 仲裁请求三条(≈32 字/条上限)
`{{percentile}}` — **程序算的百分位**(如 87%),渲染成"本周压榨程度超过 87% 的老板";社会比较钩子,两头(高/低)都有转发动机。早期无全网数据时按 tier 映射区间
底栏已写死 @ 钩子:"转给那个也在压榨 AI 的人"(内群体传播);`share_caption` 由 CLI 打印到终端不进卡

### complaint-letter.cn.svg 致我的老板(信纸)
`{{date}}` `{{week}}` — 右上日期/周数
`{{hero_value}}` `{{hero_label}}` + `{{stat1..4_label/value}}`
`{{complaint_1..3}}` — 手写体三行(≈24 字/条)

### injury-report.cn.svg 过劳体检报告
`{{date}}` `{{tool_name}}` — 体检日期/被检对象(写"AI 员工"即可,勿用真实品牌名)
`{{row1..4_item}}` `{{row1..4_value}}` `{{row1..4_ref}}` `{{row1..4_verdict}}` — 体检表四行(项目/结果/参考范围/评估)
`{{advice}}` — 诊断建议(如:给 AI 放个假)
`{{fun_fact}}` 在此模版中作为"医嘱建议"

### resignation.cn.svg 离职申请表
`{{name}}` `{{dept}}` `{{position}}` `{{join_date}}` `{{date}}` — 信息表(可玩梗:全栈牛马/永远在加班的那一天)
`{{bubble}}` `{{bubble_sub}}` — 气泡两行(这次是真的 / (第7次说))
`{{reason_1..4}}` `{{note_1..4}}` — 离职原因勾选 + 具体说明
`{{dept_opinion}}` `{{hr_opinion}}` — 部门/人事意见

### best-employer.cn.svg 最佳雇主表彰(摸鱼周稀有彩蛋)
奖状美学(米金底+红金双框+四角金花),触发条件:低用量周(如双休达成)。
`{{boss_name}}` — 被表彰的老板(默认"某不愿透露姓名的老板")
`{{praise_1..2}}` — 表彰词两行(反向夸:未安排凌晨加班/体恤 AI 电量)
`{{stat1..4_label/value}}` — 好老板数据(周末双休达成/凌晨0次/准点下线/温和工时)
`{{stars}}` — 此卡为低分好评,如 `★☆☆☆☆`;`{{date}}` 落款日期
印章:打工AI感恩协会·好老板认证。**稀有卡机制:越难触发越想晒。**

### character-card.cn.svg 角色卡(收集/展示用)
游戏收集卡风(蓝渐变框),用于"选择你的 AI 员工"展示、发布宣传、皮肤收集。
`{{skin_name}}` `{{skin_id}}` `{{skin_dept}}` — 名字/工号/部门(如:阿码/007/算法体验部·全栈牛马)
`{{rarity}}` `{{rarity_label}}` — 稀有度(★★★★/通用皮肤)
`{{pose_label}}` — 当前姿态标签(如:被迫加班 tier 3)
`{{attr1..4_name}}` `{{attr1..4_w}}` — 属性条(名称 + 数值槽:0-290 像素宽,渲染前按 0-100 分换算)
`{{battery_w}}`(0-286)`{{battery_color}}`(满#57a06b/中#e2953f/低#d3554f)`{{battery_label}}` — 电量条
`{{skill_1..3}}` — 被动技能(玩梗:已读装死 Lv.MAX)
`{{quote}}` — 台词一句

## 姿态素材约定(assets/skins/)

每个皮肤一个目录,姿态按用途命名,模版的 `{{skin_image}}` 按下表取图:

```
assets/skins/<skin>/          # acode / xiaoke / xiaodex
  tier1.png   摸鱼(电量满)    → best-employer、低用量周
  tier2.png   正常打工          → 各卡默认
  tier3.png   被迫加班(冒汗)  → 用量高时
  tier4.png   过劳(瘫软冒烟)  → 爆表周
  write.png   趴桌写信          → complaint-letter 专用
  bed.png     躺病床            → injury-report 专用
  box.png     抱纸箱含泪        → resignation 专用
  cheer.png   庆祝/比耶         → best-employer 专用
  stand.png   立绘全身          → character-card 专用
```

规则:模版优先用专用姿态(write/bed/box/cheer/stand),没有则回退 tier 等级图。所有姿态图需**透明底 PNG**,同一皮肤内角色外观必须一致(用锚图生成)。

## 待办

- [ ] 英文版(标题/印章替换:AI LABOR ARBITRATION REQUEST / NOTED, IGNORED / AI HEALTH CENTER / REQUEST DENIED / BEST BOSS CERTIFIED)
- [ ] 小 Dex 暗黑终端配色特别版
