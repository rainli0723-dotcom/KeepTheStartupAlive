# KTSA - Keep The Startup Alive

## 项目简介
AI 创业数字孪生平 — 20 轮经营沙盘模拟，面向 To B 的商业决策训练平台。

## 技术栈
- 前端: Next.js 16 + React 19 + TailwindCSS 4
- 后端: Next.js API Routes
- 数据库: SQLite (本地开发) / Neon PostgreSQL (线上)
- AI: DeepSeek Chat API
- ORM: Prisma (本地用 prisma/schema.prisma，线上用 prisma-postgres/schema.prisma)

## 线上部署
- 地址: https://ktsa-delta.vercel.app
- 平台: Vercel (手动部署，CLI: `npx vercel --yes --prod`)
- 数据库: Neon PostgreSQL (通过 Vercel 集成，自动连接)
- 环境变量: 已在 Vercel 上配置完毕 (DATABASE_URL, LLM_API_KEY 等)
- 迁移: 首次请求时自动执行 (src/lib/bootstrap-db.ts)

## 本地开发
```bash
git clone https://github.com/rainli0723-dotcom/KeepTheStartupAlive.git
cd KeepTheStartupAlive
npm install
cp .env.example .env
# 编辑 .env 填入 DeepSeek API Key
npm run db:push
npm run dev
# 打开 http://localhost:3000
```

## 项目结构
```
src/
├── app/api/         # API 路由 (auth, team, workspace, simulation, finale...)
├── app/dashboard/   # 主仪表盘
├── app/simulation/  # 模拟运行
├── app/team/        # 团队管理
├── components/      # React 组件
└── lib/             # 业务逻辑
    ├── db.ts        # Prisma 客户端
    ├── llm.ts       # LLM 调用封装
    ├── bootstrap-db.ts  # 数据库初始化 + 自动迁移
    ├── finale.ts    # 结局生成
    └── simulation-run.ts  # 模拟核心
prisma/              # SQLite 本地 Schema
prisma-postgres/     # PostgreSQL 线上 Schema + 迁移
docs/                # 文档
```

## 关键注意事项
- 本地开发用 SQLite，线上用 PostgreSQL
- src/lib/bootstrap-db.ts 在首次请求时自动跑 PostgreSQL 迁移
- prisma CLI 已移到 dependencies (生产需要)
- 部署前先 `npm run prisma:generate:prod` 生成 PostgreSQL 客户端
- 环境变量在 Vercel 上管理，不提交 .env

## 部署命令
```bash
npx vercel --yes --prod    # 手动部署到 Vercel
```

## 待办 (todo.md)
- [ ] 让角色列表可以折叠/展开显示
- [ ] 区分数字孪生和默认角色
- [ ] 支持手动新增角色添加到会议
