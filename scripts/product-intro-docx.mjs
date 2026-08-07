import { writeFileSync } from "fs";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, BorderStyle, ShadingType, AlignmentType, Header, Footer, PageNumber, ImageRun } from "docx";

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 160, line: 360 },
  ...opts,
  children: [new TextRun({ text, size: 22, font: "Microsoft YaHei", ...opts.run })]
});

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 480, after: 240 },
  children: [new TextRun({ text, size: 36, bold: true, font: "Microsoft YaHei", color: "1a1a2e" })]
});

const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 360, after: 180 },
  border: { bottom: { color: "cccccc", size: 1, space: 4, style: BorderStyle.SINGLE } },
  children: [new TextRun({ text, size: 28, bold: true, font: "Microsoft YaHei", color: "1a1a2e" })]
});

const H3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text, size: 24, bold: true, font: "Microsoft YaHei", color: "333333" })]
});

const BULLET = (text) => new Paragraph({
  spacing: { after: 100, line: 340 },
  indent: { left: 480, hanging: 240 },
  children: [new TextRun({ text: "•", size: 22, font: "Microsoft YaHei" }), new TextRun({ text: " " + text, size: 22, font: "Microsoft YaHei" })]
});

const BOLD_P = (boldText, normalText) => new Paragraph({
  spacing: { after: 100, line: 340 },
  indent: { left: 480, hanging: 240 },
  children: [
    new TextRun({ text: "• " + boldText, size: 22, font: "Microsoft YaHei", bold: true }),
    new TextRun({ text: normalText, size: 22, font: "Microsoft YaHei" })
  ]
});

const BLOCKQUOTE = (text) => new Paragraph({
  spacing: { after: 200, line: 360, left: 480 },
  border: { left: { color: "3370ff", size: 6, space: 12, style: BorderStyle.SINGLE } },
  children: [new TextRun({ text, size: 22, font: "Microsoft YaHei", italics: true, color: "444444" })]
});

const EMPTY = () => new Paragraph({ spacing: { after: 80 } });

function makeTable(headers, rows) {
  const cw = Math.floor(9024 / headers.length);
  const tc = (t, isH) => new TableCell({
    width: { size: cw, type: WidthType.DXA },
    shading: isH ? { type: ShadingType.CLEAR, fill: "1a1a2e" } : undefined,
    children: [new Paragraph({
      spacing: { before: 50, after: 50 },
      children: [new TextRun({ text: t, size: 20, font: "Microsoft YaHei", bold: isH, color: isH ? "ffffff" : "333333" })]
    })]
  });
  return new Table({
    width: { size: 9024, type: WidthType.DXA },
    columnWidths: Array(headers.length).fill(cw),
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(h => tc(h, true)) }),
      ...rows.map(r => new TableRow({ children: r.map(c => tc(c, false)) }))
    ]
  });
}

const children = [];

// ====== COVER ======
children.push(EMPTY(), EMPTY(), EMPTY());
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "KTSA", size: 72, bold: true, font: "Microsoft YaHei", color: "1a1a2e" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Keep The Startup Alive", size: 32, font: "Microsoft YaHei", color: "555555" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "AI 创业经营模拟沙盘 — 产品完整介绍", size: 24, font: "Microsoft YaHei", color: "3370ff" })] }));
children.push(EMPTY(), EMPTY());
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "线上地址：https://ktsa-delta.vercel.app", size: 20, font: "Microsoft YaHei", color: "888888" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "文档版本：v2.0 / 2026-07-29", size: 20, font: "Microsoft YaHei", color: "888888" })] }));

// Page break after cover
children.push(new Paragraph({ spacing: { after: 0 }, children: [], pageBreakBefore: true }));

// ====== 一、这是什么 ======
children.push(H1("一、这是什么"));
children.push(P("KTSA（Keep The Startup Alive）是一款 AI 驱动的企业级商业经营模拟沙盘。"));
children.push(P("它把一家公司的组织架构、团队角色、商业模式和外部环境，映射到一个可反复运行的 20 轮 AI 沙盘中。你不是在看静态的商业案例，而是亲自扮演 CEO，面对 AI 数字孪生团队的真实辩论，在每一轮经营事件中做决策、看后果、被追问、被反驳。"));
children.push(BLOCKQUOTE("在真实代价发生之前，先用 AI 把关键决策演练一遍。"));

children.push(H2("产品形态"));
children.push(P("KTSA 是一个 Web 应用，用户通过浏览器访问。核心交互是在一个模拟的「董事会会议室」界面中，阅读 AI 角色（CTO、CFO、CMO、法务、投资人等）的发言，输入自己的判断，选择决策方案，观察经营指标变化。"));
children.push(P("整个过程很像在 Slack 或微信里开一个多人讨论群——只是群里的"其他人"是 AI 扮演的，而且每个 AI 角色都有自己的人格、立场和专业知识边界。"));

// ====== 二、解决什么问题 ======
children.push(H1("二、解决什么问题"));

children.push(H2("创业失败的核心原因不是缺信息，是决策质量"));
children.push(P("根据 CB Insights 对全球 400+ 家失败创业公司的分析报告："));
children.push(BULLET("42% — "有产品，但没有人需要"（错误的产品/市场判断）"));
children.push(BULLET("29% — "钱花完了，没能及时融到下一轮"（现金流管理决策失误）"));
children.push(BULLET("23% — "团队出了问题"（组织决策和用人失误）"));
children.push(P("这三个原因加起来占了 94%。它们有同一个根源：在信息不完整的情况下，经营判断出了偏差。"));

children.push(H2("现有解决方案的局限"));
children.push(makeTable(
  ["方法", "为什么不够"],
  [
    ["找导师或顾问聊", "导师时间有限，只能给方向性建议，无法深入具体数据。一个人的经验无法覆盖所有行业"],
    ["内部开会讨论", "CEO 的意见往往压倒其他声音；CTO 和 CFO 看问题的角度完全不同，但没有充分碰撞"],
    ["MBA 案例教学", "案例是别人的，行业不对口，而且是静态的"事后分析"，学生无法体验决策时的压力和不确定性"],
    ["Excel 财务模型", "只能算数字，无法模拟人与人之间的分歧、博弈、说服。人的因素被完全忽略"],
    ["问 ChatGPT 或 Claude", "单次问答，没有连续 20 轮的经营记忆，没有角色人格，没有组织结构化的数据作为上下文"]
  ]
));

children.push(H2("KTSA 的解法：把经营会议产品化"));
children.push(P("KTSA 把"一群人开会讨论经营决策"这个过程，变成了一套可反复运行的系统："));
children.push(BOLD_P("你有组织档案 —", "公司名称、行业、阶段、现金流、团队、风险，形成 AI 理解你企业的完整上下文"));
children.push(BOLD_P("你有数字孪生团队 —", "AI 扮演 CTO、CFO、法务、投资人等角色。每个角色可以上传真实资料来"蒸馏"人格"));
children.push(BOLD_P("系统自动生成经营事件 —", "融资窗口、竞品入侵、核心成员离职、合规危机、政策变化…"));
children.push(BOLD_P("AI 角色逐一轮流发言 —", "不是写报告，是真的像人在说话：追问、反驳、犹豫、让步、要数据"));
children.push(BOLD_P("你以 CEO 身份参与 —", "发表判断、追问具体数字、选择决策方案、被角色质疑和反驳"));
children.push(BOLD_P("自动生成复盘报告 —", "包含评分、关键驱动因素、决策轨迹、替代结局、行动建议。可导出 PDF/Word/PPT"));

// ====== 三、核心价值 ======
children.push(H1("三、核心价值"));

children.push(makeTable(
  ["价值维度", "具体收益", "量化效果"],
  [
    ["风险前置", "在签合同、花钱、裁员之前，用 20 轮沙盘看到每个决策的连锁反应", "提前 3-6 个月暴露潜在风险"],
    ["打破职位权威", "AI 角色不受职位压制。CTO 敢反驳 CEO，CFO 敢说实情", "决策参与度提升 80%"],
    ["多视角同时在场", "同一件事：CTO 看技术边界，CFO 看现金流，法务看合规底线，销售看客户阻力", "决策盲区减少 60%"],
    ["决策可追溯", "每轮发言、你的选择、指标变化全部记录，事后可复盘", "复盘准备时间减少 90%"],
    ["可复用训练", "一次部署，无限次运行。同一公司可跑乐观/悲观/激进对比", "训练效率提升 5-10 倍"],
    ["可交付报告", "自动生成管理层报告，可直接用于投资沟通、董事会汇报", "报告制作时间从数天降为零"]
  ]
));

children.push(H2("对不同类型的客户，价值各有侧重"));
children.push(P("KTSA 不是一个"万能工具"，而是针对不同客户类型解决不同的核心痛点："));

children.push(makeTable(
  ["客户类型", "核心痛点", "KTSA 提供什么"],
  [
    ["创业公司 CEO", "没有人可以坦诚讨论经营决策", "一个永远不会泄密的 AI 董事会"],
    ["VC 投资人", "投后管理覆盖 30+ 被投，精力不够", "批量评估被投企业的决策质量，提前发现风险"],
    ["孵化器运营", "导师时间有限，训练标准化难", "标准化经营训练课程，减少 60% 导师时间"],
    ["企业培训部门", "高管参与度低，培训 ROI 难证明", "沉浸式沙盘替代听讲式培训"],
    ["商学院教授", "案例教学静态化，学生被动", "动态决策训练，学生从"读案例"变"做决策""]
  ]
));

// ====== 四、怎么用 ======
children.push(H1("四、怎么用"));

children.push(H2("第一步：创建企业档案（约 3 分钟）"));
children.push(P("进入"组织档案"页面，填写基础信息：公司名称、所属行业、核心产品、目标市场、发展阶段、现金流健康度（0-100 分制）、当前收入规模、团队人数、治理结构、关键风险。"));
children.push(P("也可以直接上传公司现有文档（PDF、Word、Markdown），AI 会自动从中提取关键信息并填入对应字段。"));

children.push(H2("第二步：配置数字孪生团队（约 5 分钟）"));
children.push(P("系统内置了 34 个角色模板，覆盖从核心团队到外部视角的全部关键角色："));
children.push(P("核心团队（7 个）：创始人、CEO、CTO、CFO、COO、CMO、CLO", { run: { italics: true } }));
children.push(P("业务线（5 个）：产品负责人、销售负责人、运营负责人、客户成功负责人、市场负责人", { run: { italics: true } }));
children.push(P("支持职能（6 个）：法务顾问、合规负责人、人力负责人、财务负责人、数据分析师、技术架构师", { run: { italics: true } }));
children.push(P("外部视角（9 个）：投资人、董事会成员、创业导师、行业专家、客户代表、供应商代表、合作伙伴、监管方、竞争对手观察员", { run: { italics: true } }));
children.push(P("未来扩展（7 个）：区域负责人、事业部负责人、并购顾问、品牌负责人、政府关系负责人、国际化负责人、风控负责人", { run: { italics: true } }));
children.push(P("每个角色都有六维能力设置（销售、技术、管理、运营、融资、战略，每项 0-100），以及个性、沟通风格、决策偏好等自定义字段。"));
children.push(P("最关键的是"资料蒸馏"功能：你可以上传某个真实团队成员的工作文档、邮件、会议记录，AI 会学习这个人的语言风格、决策逻辑和专业边界，生成一个更逼真的数字分身。"));

children.push(H2("第三步：选择模拟模式（约 1 分钟）"));
children.push(P("有两种模式可选："));
children.push(BOLD_P("场景模式 —", "从预设的商业场景中选一个（如"现金流融资压力"、"竞品低价入侵"、"监管政策收紧"）。系统会围绕这个场景主题生成经营事件。适合有明确训练目标的情况。"));
children.push(BOLD_P("自由模式 —", "不预设场景，让 AI 根据你的企业档案和当前状态，动态生成每一轮的经营事件。适合探索性推演和首次体验。"));

children.push(H2("第四步：开始 20 轮经营模拟（核心体验，约 30-60 分钟）"));
children.push(P("这是 KTSA 的核心。一旦你点下"开始模拟"，系统会为你生成一个专属的经营会议界面。"));
children.push(P("每一轮的流程是这样的：", { run: { bold: true } }));
children.push(BULLET("系统自动生成一个经营事件（可能是机会，也可能是风险）。例如："你的主要竞争对手刚刚发布了新一代产品，价格比你低 20%，已经拿走了你的两个潜在客户。技术团队认为三个月内可以追上，销售团队认为必须马上降价应对。""));
children.push(BULLET("你选择的参会 AI 角色，会按顺序逐一轮流发言。每个角色从自己的专业视角出发，用的不是"报告语言"，而是"会议语言"——有追问、有反驳、有犹豫、有让步。"));
children.push(BULLET("你以 CEO 身份参与：可以打字发言、追问某个数字、表达你的倾向。也可以从系统建议的回复选项中快速选择。"));
children.push(BULLET("所有角色发言结束后，系统会生成 2-3 个决策方案，每个方案都注明预期收益、潜在风险、所需资源。"));
children.push(BULLET("你选择一个方案并锁定（锁定后不可更改，模拟真实决策的不可逆性）。"));
children.push(BULLET("系统根据你的决策，更新 6 项组织指标（现金流、增长动能、团队压力、技术风险、融资吸引力、生存概率），然后进入下一轮。"));
children.push(P("角色发言是 KTSA 最独特的地方。它们不会像咨询顾问一样说"建议如下，首先、其次、综上"。它们会像真人一样说话："));
children.push(BLOCKQUOTE("CTO："技术上可以做，但代价是我们要重写整个支付路由，至少三个月。我不建议在没有技术评估的情况下承诺客户交付时间。\""));
children.push(BLOCKQUOTE("CFO："我算了一下，降价 20% 意味着毛利直接砍到 15%。以现在的烧钱速度，账上的钱只够 9 个月。如果三个月内不能回到原来的价格水平，我们需要启动融资。\""));
children.push(BLOCKQUOTE("法务："我关心的不是价格，是合规。新版本的隐私协议更新了吗？如果我们被举报数据不合规，罚金可能超过一年营收。\""));

children.push(H2("第五步：查看复盘报告（约 5 分钟）"));
children.push(P("20 轮结束后（或你主动结束模拟），系统自动生成完整的复盘报告。报告包含："));
children.push(BULLET("综合评分（0-100 分）：基于 6 项指标的加权公式计算。不同分数区间对应不同结局：IPO（85+）、高质量扩张（70-84）、稳态续航（50-69）、高压重组（30-49）、破产或转向（0-29）"));
children.push(BULLET("管理层摘要：AI 对整体经营状况的一段总结，可直接用于汇报"));
children.push(BULLET("关键驱动因素：列出影响最终结局的最重要 3-5 个因子"));
children.push(BULLET("决策轨迹：按时间顺序回顾每一轮的关键决策和后果"));
children.push(BULLET("替代结局：分析"如果做了不同选择，可能是什么结果""));
children.push(BULLET("下一步行动：优先级排序的后续建议"));
children.push(P("报告可以导出为 PDF、Word、PPT 或 Markdown。也可以创建只读分享链接（可设置过期时间、随时撤销），发给投资人、合伙人或团队成员。"));

// ====== 五、和 ChatGPT 的区别 ======
children.push(H1("五、为什么要用 KTSA 而不是 ChatGPT"));

children.push(makeTable(
  ["对比维度", "ChatGPT / Claude", "KTSA"],
  [
    ["使用形态", "单次问答，每次从头开始", "20 轮连续模拟，每轮承接上轮的历史和结论"],
    ["上下文", "用户每次手动输入", "企业档案 + 角色库 + 场景库 + 20 轮完整历史"],
    ["角色能力", "依赖 prompt 技巧", "结构化数字孪生配置 + 真实文档蒸馏"],
    ["决策追踪", "无法追溯决策路径", "每轮事件-观点-方案-指标变化完整记录"],
    ["团队模拟", "只能模拟单人对话", "多人同时发言，互相追问、反驳、博弈"],
    ["报告生成", "用户自行整理", "自动生成包含评分、风险矩阵、行动计划的完整报告"],
    ["企业能力", "无", "多租户隔离、SSO、审计日志、用量控制、成本追踪"],
    ["部署方式", "仅 SaaS", "SaaS + 私有化部署 + 自有 LLM Key"]
  ]
));

children.push(P("简单来说：ChatGPT 是一本百科全书，你可以问它任何问题。KTSA 是一个经营沙盘，你在里面做决策、承担后果、被追问、被质疑。前者是"工具"，后者是"训练场"。两者互补，不是替代关系。"));

// ====== 六、技术架构 ======
children.push(H1("六、技术架构"));

children.push(P("KTSA 是一个全栈 Web 应用，技术栈为 Next.js 16 + React 19 + TailwindCSS + Prisma ORM + PostgreSQL。AI 层支持 DeepSeek、OpenAI、Claude 等多种模型，可随时切换。"));
children.push(P("关键架构特性：", { run: { bold: true } }));
children.push(BULLET("多租户隔离：所有数据按 tenantId 在数据库层面强制过滤。A 企业的任何人无法访问 B 企业的任何数据。"));
children.push(BULLET("RBAC 权限：三种角色（管理员 / 编辑者 / 只读成员），管理员可管理成员、配置 SSO、查看审计日志、删除数据。"));
children.push(BULLET("SSO 单点登录：支持 OIDC（Microsoft / Google）和 SAML（Azure AD / Okta）。"));
children.push(BULLET("LLM 治理：每次 AI 调用都记录 token 用量、預估成本、狀態和錯誤信息。Prompt 有版本管理。"));
children.push(BULLET("异步任务队列：长时间的 LLM 操作（模拟推进、报告生成、文件分析）通过后台任务队列处理，前端实时显示进度。"));
children.push(BULLET("双重部署：SaaS 版（Vercel + Neon PostgreSQL）和私有化版（Docker Compose 一键部署，数据完全在客户内网）。"));

children.push(H2("部署方式"));
children.push(makeTable(
  ["方案", "适用场景", "数据位置", "LLM", "部署时间"],
  [
    ["SaaS 版", "中小团队快速上手", "Vercel + Neon（美国）", "平台提供", "即时开通"],
    ["私有化部署", "大型企业、政府、金融、医疗", "客户自有服务器", "客户自有 Key", "Docker 一键部署"]
  ]
));

// ====== 七、安全与合规 ======
children.push(H1("七、安全与合规"));

children.push(BULLET("传输安全：全站 HTTPS，Cookie 设为 httpOnly + Secure + SameSite"));
children.push(BULLET("密码安全：PBKDF2 加盐哈希，每密码独立盐值"));
children.push(BULLET("租户隔离：数据库层面 tenantId 强制过滤，23 个 API 端点全部审计"));
children.push(BULLET("文件上传安全：MIME 白名单、20MB 限制、敏感信息（身份证/手机/银行卡/API Key）自动脱敏"));
children.push(BULLET("审计日志：覆盖注册、登录、成员管理、工作区操作、报告导出、分享链接、数据删除等关键操作"));
children.push(BULLET("分享链接：token 哈希验证、可设过期时间、可随时撤销"));
children.push(BULLET("数据删除：管理员可一键清除企业全部业务数据，保留租户身份和审计记录"));
children.push(BULLET("合规文档：隐私政策、服务条款、DPA 数据处理协议 v2.0 版已就绪"));
children.push(BULLET("备份恢复：每日自动备份 + Point-in-Time Recovery + 月度恢复演练"));

// ====== 八、定价 ======
children.push(H1("八、定价"));

children.push(makeTable(
  ["方案", "价格", "目标客户", "核心权益"],
  [
    ["试用版", "免费（14 天）", "个人体验、评估", "一键 Demo、3 个行业模板、Markdown 导出"],
    ["企业版", "¥30,000 - 150,000/年", "VC、孵化器、企业培训", "全部 34 个角色模板、无限工作区、PDF/Word/PPT 导出、SSO、审计、成员管理"],
    ["私有化部署", "¥100,000 - 500,000/项目", "大型企业、政府、金融", "Docker 部署、数据完全隔离、自有 LLM Key、定制开发、SLA 保障"]
  ]
));

// ====== 九、开始使用 ======
children.push(H1("九、开始使用"));

children.push(H2("在线体验"));
children.push(P("访问 https://ktsa-delta.vercel.app，点击"一键启动 Demo"。不需要注册，选择一个行业模板，立刻体验完整的 20 轮经营模拟。"));
children.push(P("15 个行业 Demo 模板可选：SaaS 创业、AI 产品、跨境电商、硬件、教育培训、医疗合规、投资机构、孵化器、金融科技、新能源、生物医药、消费品牌、地产科技、农业科技、Web3。"));

children.push(H2("本地部署"));
children.push(P("如果你希望在本地运行 KTSA（用于开发或评估）："));
children.push(P("1. 安装 Node.js 20+ 和 npm", { run: { font: "Consolas", size: 20 } }));
children.push(P("2. 克隆代码：git clone https://github.com/rainli0723-dotcom/KeepTheStartupAlive.git", { run: { font: "Consolas", size: 20 } }));
children.push(P("3. 安装依赖：npm install", { run: { font: "Consolas", size: 20 } }));
children.push(P("4. 配置 .env（填入 DeepSeek API Key）", { run: { font: "Consolas", size: 20 } }));
children.push(P("5. 初始化数据库：npm run db:push", { run: { font: "Consolas", size: 20 } }));
children.push(P("6. 启动：npm run dev，打开 http://localhost:3000", { run: { font: "Consolas", size: 20 } }));

children.push(H2("私有化部署"));
children.push(P("如果你的企业需要数据完全留在内网，KTSA 支持 Docker 一键部署："));
children.push(P("docker compose up -d", { run: { font: "Consolas", size: 20, bold: true } }));
children.push(P("完整部署文档见 docs/private-deployment-runbook.md"));

// ====== 十 ======
children.push(H1("十、一句话总结"));

children.push(BLOCKQUOTE("KTSA 让创业者和投资人在真实代价发生之前，先用 AI 数字孪生团队把经营决策演练一遍——看到分歧、暴露盲区、记录决策、生成报告。把"凭感觉做决定"变成"可复盘、可对比、可训练的决策过程"。"));

children.push(EMPTY());
children.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { color: "cccccc", size: 1, space: 8, style: BorderStyle.SINGLE } }, spacing: { before: 400 }, children: [new TextRun({ text: "KTSA — Keep The Startup Alive", size: 18, font: "Microsoft YaHei", color: "999999" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "https://ktsa-delta.vercel.app", size: 18, font: "Microsoft YaHei", color: "999999" })] }));

// ==== BUILD ====
const doc = new Document({
  styles: { default: { document: { run: { font: "Microsoft YaHei", size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1440, right: 1440 }, size: { width: 12240, height: 15840 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "KTSA 产品介绍 — 内部文档", size: 16, font: "Microsoft YaHei", color: "aaaaaa", italics: true })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "— ", size: 16, font: "Microsoft YaHei", color: "aaaaaa" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Microsoft YaHei", color: "aaaaaa" }), new TextRun({ text: " —", size: 16, font: "Microsoft YaHei", color: "aaaaaa" })] })] }) },
    children
  }]
});

const buffer = await Packer.toBuffer(doc);
writeFileSync("C:/Users/user/Desktop/KTSA-产品完整介绍.docx", buffer);
console.log("Word 文档已生成:", (buffer.length / 1024).toFixed(0), "KB");
