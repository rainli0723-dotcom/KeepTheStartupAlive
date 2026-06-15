# KTSA 私有化部署操作文档

## 1. 这份文档解决什么问题

这份 Runbook 面向企业客户、交付团队和运维团队，用于把 KTSA 从本地演示版本部署到企业可试用、可验收的环境。

KTSA 正式 To B 交付至少需要：

- 独立的生产数据库，不使用本地 SQLite。
- 独立的 LLM API Key，不和开发环境共用。
- 独立的 Web 进程和 LLM Worker 进程。
- HTTPS、访问控制、日志、备份和恢复流程。
- 企业账号、成员权限、审计日志和数据删除能力。

## 2. 推荐架构

```mermaid
flowchart LR
  U["企业用户"] --> WAF["HTTPS / 反向代理"]
  WAF --> APP["KTSA Web 应用"]
  APP --> DB["PostgreSQL"]
  APP --> JOB["LLM 任务表"]
  WORKER["LLM Worker"] --> JOB
  WORKER --> LLM["DeepSeek / OpenAI-compatible LLM"]
  APP --> LOG["日志与监控"]
  DB --> BAK["备份与恢复"]
```

## 3. 环境变量

生产环境示例：

```env
NODE_ENV="production"
DATABASE_URL="postgresql://ktsa_user:change-me@db.example.com:5432/ktsa?schema=public"
LLM_BASE_URL="https://api.deepseek.com/v1"
LLM_API_KEY="customer-production-key"
LLM_MODEL="deepseek-chat"
LLM_TIMEOUT_MS="120000"
LLM_MAX_RETRIES="2"
LLM_WORKER_TOKEN="change-me-worker-token"
KTSA_APP_URL="https://ktsa.example.com"
```

注意：

- 不要把 API Key、GitHub Token、数据库密码提交到 GitHub。
- staging、production、local 必须使用不同数据库、不同 LLM Key、不同 Worker Token。
- 本地可以继续使用 SQLite，但正式客户环境必须使用 PostgreSQL。

## 4. 部署步骤

1. 安装依赖：

```bash
npm install
```

2. 生成 PostgreSQL Prisma Client：

```bash
npm run prisma:generate:prod
```

3. 执行生产迁移：

```bash
npm run db:prod:migrate
```

4. 构建应用：

```bash
npm run build
```

5. 启动 Web 应用：

```bash
npm start
```

6. 启动 LLM Worker：

```bash
npm run worker:llm
```

7. 健康检查：

```bash
curl https://ktsa.example.com/api/health
```

## 5. 验收清单

上线前至少验证：

- 可以注册企业账号并登录。
- 管理员可以邀请成员。
- 编辑者可以编辑业务数据，但不能管理企业成员。
- 只读成员不能导入、删除、编辑或导出受保护数据。
- A 企业不能看到 B 企业的工作区、角色、会议、报告、文件和分享链接。
- 报告分享链接支持过期和撤销。
- 公司资料上传后不会卡住页面，后台任务能处理分析。
- LLM Worker 可以独立处理排队任务。
- LLM 失败时能重试，并能在后台看到失败原因。
- PDF、Word、PPT、Markdown 报告都能导出。
- 审计日志能看到成员、导出、分享、删除、密码修改等关键操作。
- `/api/health` 返回数据库、队列、LLM 配置和角色库状态。

## 6. 备份恢复

推荐最低标准：

- 每天完整备份。
- 开启 Point-in-Time Recovery。
- 每月至少做一次恢复演练。
- 试用客户数据至少保留 30 天。
- 合同客户数据保留周期以 DPA 和合同为准。

恢复演练建议：

1. 从生产备份恢复到 staging 数据库。
2. 使用 staging 环境变量启动 KTSA。
3. 验证登录、工作区、报告导出、分享链接、审计日志。
4. 记录恢复耗时和失败点。

## 7. 数据删除和导出

导出单个企业数据：

```bash
npm run tenant:export -- --tenant=<tenantId> --out=tenant-export.json
```

删除企业数据前必须确认：

- 操作人是管理员。
- 删除范围只包含当前 tenant。
- 删除后审计日志仍能保留删除记录。
- 不误删其他企业账号、工作区或报告。

## 8. 安全要求

- 必须启用 HTTPS。
- Cookie 使用 httpOnly。
- 生产环境不要暴露 `.env`。
- 文件上传限制类型和大小。
- 企业文件只能由所属企业访问。
- LLM 日志不要保存完整敏感原文，优先保存 hash、token、模型、耗时、状态和错误摘要。
- API Key 只能放在环境变量或密钥管理系统中。

## 9. 运维监控

建议监控：

- Web 进程是否存活。
- LLM Worker 是否存活。
- PostgreSQL 连接数。
- 慢请求。
- LLM 失败率。
- LLM 成本。
- 排队任务数量。
- dead 任务数量。
- 分享链接数量和撤销数量。
- 审计日志写入是否正常。

## 10. 交付材料

正式 To B 交付建议附带：

- 产品介绍文档。
- 私有化部署文档。
- 生产 PostgreSQL 部署文档。
- 隐私政策草案。
- 服务条款草案。
- DPA 数据处理协议草案。
- 安全白皮书。
- API Key 管理说明。
- 数据删除说明。
- 备份恢复说明。
