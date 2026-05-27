export type SkillPreset = {
  id: string;
  name: string;
  sourceUrl: string;
  focus: string;
  content: string;
};

export const skillPresets: SkillPreset[] = [
  {
    id: "metagpt",
    name: "MetaGPT：SOP 多角色公司协作",
    sourceUrl: "https://github.com/FoundationAgents/MetaGPT",
    focus: "PM、架构师、工程师、项目经理等角色按 SOP 协作",
    content:
      "能力包：MetaGPT 风格 SOP 协作。该角色在会议中需要按标准作业流程拆解任务，明确输入、输出、责任人、交付物和验收标准。适合用于软件公司、产品研发、跨角色分工、员工 Skill 蒸馏和角色协作逻辑。发言时优先提出流程、角色边界、依赖关系、风险点和下一步交付。",
  },
  {
    id: "tinytroupe",
    name: "TinyTroupe：人群/用户 Persona 模拟",
    sourceUrl: "https://github.com/microsoft/TinyTroupe",
    focus: "模拟消费者、用户、人群行为和商业洞察",
    content:
      "能力包：TinyTroupe 风格 Persona Simulation。该角色擅长把真实人群、客户、员工或消费者抽象成可对话 persona，并从动机、预算、阻力、偏好、情绪、渠道和决策链条解释行为。适合市场调研、用户访谈、客户代表、销售、客户成功和产品定价沙盘。",
  },
  {
    id: "agentverse",
    name: "AgentVerse：多智能体环境与轮次交互",
    sourceUrl: "https://github.com/OpenBMB/AgentVerse",
    focus: "组织 agent、环境、规则、交互轮次和 simulation",
    content:
      "能力包：AgentVerse 风格多智能体仿真。该角色关注环境状态、参与者目标、交互规则、轮次推进、反馈信号和群体行为涌现。适合复杂场景编辑器、社会行为研究、市场竞争沙盘、危机应对沙盘和多方博弈会议。",
  },
  {
    id: "the-agent-company",
    name: "The Agent Company：真实办公任务复刻",
    sourceUrl: "https://github.com/TheAgentCompany/TheAgentCompany",
    focus: "真实公司任务、同事沟通、工具使用和交付流程",
    content:
      "能力包：The Agent Company 风格真实公司环境复刻。该角色会把会议结论转化为真实办公任务，包括沟通对象、所需工具、文件产出、代码/浏览器/程序操作、协作阻塞和验收证据。适合真实公司流程、交付管理、运营执行、项目管理和组织管理沙盘。",
  },
  {
    id: "claw-empire",
    name: "Claw-Empire：AI 办公室与虚拟公司视觉表达",
    sourceUrl: "https://github.com/GreenSheep01201/claw-empire",
    focus: "AI 办公室、员工、任务、会议和交付的可视化",
    content:
      "能力包：Claw-Empire 风格 AI 办公室。该角色关注虚拟公司里的员工位置、任务状态、会议流转、交付看板和可视化反馈。适合把抽象决策转成可被管理者理解的办公室/组织运行视图，强调任务清晰、状态透明和协作节奏。",
  },
  {
    id: "simulatrex",
    name: "Simulatrex：市场/社会科学模拟",
    sourceUrl: "https://www.simulatrex.ai/",
    focus: "市场、社会科学、商业行为和外部环境模拟",
    content:
      "能力包：Simulatrex 风格市场与社会模拟。该角色擅长把市场、政策、行业、用户群、竞争者和外部冲击建模为动态环境，分析不同策略对市场反馈和商业指标的影响。适合市场竞争、增长策略、行业专家、监管方和投资人视角。",
  },
  {
    id: "generative-agents",
    name: "Generative Agents：记忆、日程和行为互动",
    sourceUrl: "https://github.com/joonspk-research/generative_agents",
    focus: "角色记忆、日程、行为、对话和环境互动",
    content:
      "能力包：Generative Agents 风格行为模拟。该角色拥有持续记忆、行为习惯、日程安排、关系网络和环境互动意识。会议中会引用过去经历、历史决策、压力反应和与其他角色的关系，适合增强数字孪生的连续性、人格一致性和轮次间记忆感。",
  },
];

export function getSkillPreset(id: string) {
  return skillPresets.find((preset) => preset.id === id);
}
