# KTSA 商业模拟沙盘

> Keep The Startup Alive — 全生命周期 AI 创业数字孪生平台

一个面向 To B 风险预演、机会应对和团队决策训练的 AI 商业模拟沙盘。通过 20 轮经营周期，让创业者在虚拟环境中体验真实的商业决策。

## 产品定位

KTSA 是一个 AI 驱动的商业决策模拟平台，适用于：

- **创业者在正式融资前** 进行压力测试和策略演练
- **团队在关键会议前** 通过数字孪生角色预演讨论
- **投资者在投后管理中** 评估被投企业的决策质量
- **企业内部培训中** 模拟高管层的决策场景

## 核心功能

### 1. 组织工作区
创建和管理自己的公司档案，包括行业、产品、市场阶段等基础信息。

### 2. 数字孪生角色
为团队的每个关键角色创建数字分身，通过资料蒸馏让 AI 学习角色的语言风格、决策倾向和个性特征。

### 3. 经营模拟（20 轮沙盘）
- 每轮自动生成经营事件（如融资谈判、竞品入侵、核心成员离职等）
- AI 角色基于数字孪生设定发表观点和辩论
- 用户以 CEO 身份参与讨论和决策
- 每轮结束后系统评估决策对组织状态的影响

### 4. 决策复盘报告
模拟结束后自动生成完整的复盘报告，包含：
- 对话过程回顾（20 轮可展开）
- 决策轨迹分析
- 关键驱动因素
- 替代结局推演
- 后续行动建议

## 快速开始

### 环境要求
- Node.js 20+
- npm 或 pnpm

### 安装步骤

1. **安装依赖**
```bash
npm install
```

2. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：
```env
LLM_BASE_URL="https://api.deepseek.com/v1"
LLM_API_KEY="your-api-key-here"
LLM_MODEL="deepseek-chat"
LLM_TIMEOUT_MS="60000"
```

> 支持 DeepSeek API 或 OpenAI API，只需修改 `LLM_BASE_URL` 为对应的端点地址即可。

3. **初始化数据库**
```bash
npm run db:push
```

本地开发使用 SQLite。应用启动后会自动补齐必要表结构、演示企业空间、角色模板和当前工作区缺失的默认数字孪生角色；如果页面出现空数据，先访问 `/api/health` 查看数据库和角色模板状态。

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问页面**
打开浏览器访问 http://localhost:3000

### 生产环境部署

```bash
npm run build
npm start
```

正式 To B 部署不要使用 `prisma/dev.db`。生产环境必须使用 PostgreSQL、独立 `.env.production`、生产 LLM Key、备份恢复策略和迁移流程。详细步骤见 [docs/production-postgres.md](docs/production-postgres.md)。

## 配置说明

完整配置、操作、排查和交付检查见 [docs/configuration-operation-guide.md](docs/configuration-operation-guide.md)。

### 环境变量（`.env`）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | SQLite 数据库路径 | `file:./dev.db` |
| `LLM_BASE_URL` | LLM API 端点 | `https://api.deepseek.com/v1` |
| `LLM_API_KEY` | 你的 API Key | `sk-xxxxx` |
| `LLM_MODEL` | 使用的模型 | `deepseek-chat` |
| `LLM_TIMEOUT_MS` | API 超时时间（毫秒） | `60000` |
| `LLM_PROXY_URL` | （可选）代理地址 | `http://127.0.0.1:7897` |
| `LLM_RESOLVE_IP` | （可选）DNS 解析 | `api.deepseek.com=3.173.21.63` |

### 健康检查

访问：

```text
/api/health
```

健康检查会返回数据库连接、数据库类型、角色模板同步数量、工作区数量、LLM 是否配置和当前模型。正式部署时应把该接口加入部署后的 smoke test。

### 支持的 LLM API

本项目支持任何兼容 OpenAI API 格式的 LLM 服务商：

- **DeepSeek** — 推荐，性价比高
- **OpenAI** — GPT-4o / GPT-4-turbo
- **阿里通义千问**
- **月之暗面 Kimi**
- **Anthropic Claude**（需 OpenAI 兼容格式）

只需修改 `LLM_BASE_URL` 和 `LLM_MODEL` 即可切换。

## 项目结构

```
ktsa-mvp/
├── prisma/              # 数据库 Schema
├── src/
│   ├── app/              # Next.js App Router 页面
│   │   ├── api/          # API 路由
│   │   ├── dashboard/   # 主仪表盘
│   │   ├── reports/     # 复盘报告列表
│   │   ├── finale/      # 复盘详情页
│   │   ├── meeting/     # 会议详情页
│   │   ├── scenarios/   # 场景库
│   │   ├── simulation/  # 模拟运行
│   │   ├── team/        # 团队管理
│   │   └── roles/       # 角色库
│   ├── components/      # React 组件
│   └── lib/             # 业务逻辑
│       ├── llm.ts       # LLM 调用封装
│       ├── finale.ts    # 结局生成逻辑
│       ├── simulation-run.ts  # 模拟运行核心
│       └── ...
├── public/              # 静态资源
└── package.json
```

## 技术栈

- **前端**: Next.js 16 + React + TailwindCSS + Lucide 图标
- **后端**: Next.js API Routes + SQLite (Prisma)
- **AI**: DeepSeek / OpenAI 兼容 API（结构化输出）

## 使用流程

1. **创建组织** → 填写公司基础信息
2. **创建团队** → 添加关键角色（CEO、CTO、CFO 等）
3. **资料蒸馏** → 为每个角色上传文档或手动编辑，让 AI 学习角色特征
4. **开始模拟** → 选择参会角色，启动 20 轮经营沙盘
5. **参与讨论** → 每轮以 CEO 身份发言，影响 AI 角色的辩论和决策
6. **复盘总结** → 查看完整报告，记录决策教训

## License

MIT
