# KTSA 配置与操作文档

本文档用于本地演示、协作开发和 To B 生产部署前检查。不要把真实 API Key、`.env`、本地数据库或构建缓存提交到 GitHub。

## 1. 本地环境要求

- Node.js 20+
- npm
- 可访问 DeepSeek 或 OpenAI 兼容接口的网络
- 本地默认数据库：SQLite

检查 Node 版本：

```bash
node -v
npm -v
```

## 2. 安装项目

```bash
npm install
```

如果依赖安装失败，先删除 `node_modules` 后重新安装：

```bash
rm -rf node_modules
npm install
```

Windows PowerShell 可使用：

```powershell
Remove-Item node_modules -Recurse -Force
npm install
```

## 3. 配置环境变量

复制示例配置：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

本地演示推荐配置：

```env
DATABASE_URL="file:./dev.db"
LLM_BASE_URL="https://api.deepseek.com/v1"
LLM_API_KEY="your-deepseek-api-key"
LLM_MODEL="deepseek-chat"
LLM_TIMEOUT_MS="60000"
LLM_MAX_RETRIES="2"
LLM_TEMPERATURE="0.4"
LLM_PROMPT_VERSION="v1"
```

如果网络需要代理：

```env
LLM_PROXY_URL="http://127.0.0.1:7897"
```

## 4. 初始化数据库

本地使用 SQLite：

```bash
npm run db:push
```

项目启动后会自动补齐：

- 基础数据库表
- 演示企业空间
- 角色模板
- 当前工作区缺失的默认数字孪生角色

如果页面出现空数据，先访问：

```text
http://localhost:3000/api/health
```

## 5. 启动本地产品

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

常用页面：

- `/organization`：公司资料
- `/team`：数字孪生
- `/simulation/start`：开始模拟
- `/simulation/config`：模拟配置
- `/simulation/run`：模拟运行
- `/enterprise`：企业空间
- `/api/health`：健康检查

## 6. 健康检查说明

访问 `/api/health` 会返回：

- 数据库是否可连接
- 数据库类型：`sqlite` 或 `postgresql`
- LLM 是否已配置
- 当前模型
- 角色模板是否同步
- 当前工作区数量

健康状态示例：

```json
{
  "ok": true,
  "checks": {
    "database": true,
    "databaseProvider": "sqlite",
    "llmConfigured": true,
    "model": "deepseek-chat",
    "roleTemplates": {
      "expected": 34,
      "actual": 34,
      "synced": true
    },
    "workspaces": 1
  }
}
```

如果 `roleTemplates.synced` 是 `false`，刷新 `/roles` 或重新访问 `/api/health`，系统会尝试自动补齐角色模板。

## 7. 演示模式操作流程

1. 打开首页。
2. 进入“公司资料”，补充公司基础信息或导入公司情况。
3. 进入“数字孪生”，查看或新增角色。
4. 进入“开始模拟”。
5. 选择场景模式或自由模式。
6. 在“模拟配置”选择参会角色。
7. 开始本局 20 轮模拟。
8. 每轮查看 AI 生成的事件、会议对话、决策方案。
9. 模拟结束后生成复盘报告。

未登录演示模式会使用“演示企业空间”。正式客户使用时应注册企业账号并通过企业空间管理成员权限。

## 8. 账号和权限

当前角色：

- `admin`：企业管理员，可管理企业、成员和数据。
- `editor`：可编辑工作区、角色和模拟配置。
- `viewer`：只读访问。

演示模式允许未登录用户操作演示企业空间，方便产品展示。正式部署时，应明确公开 Demo 和企业客户数据的边界。

## 9. LLM 配置与排查

必须配置：

```env
LLM_BASE_URL="https://api.deepseek.com/v1"
LLM_API_KEY="your-api-key"
LLM_MODEL="deepseek-chat"
```

常见问题：

- `LLM_API_KEY is not configured`：`.env` 缺少 API Key。
- `401` 或 `403`：API Key 无效、过期或没有模型权限。
- 请求超时：调大 `LLM_TIMEOUT_MS`，或配置 `LLM_PROXY_URL`。
- JSON 修复失败：模型返回格式不稳定，可重试或更换模型。

建议配置：

```env
LLM_TIMEOUT_MS="120000"
LLM_MAX_RETRIES="2"
LLM_TEMPERATURE="0.4"
LLM_PROMPT_VERSION="v1"
```

## 10. 数字孪生角色库

角色模板定义在：

```text
src/lib/domain.ts
```

系统会把角色模板同步到数据库。进入数字孪生页或模拟配置页时，系统会自动补齐当前工作区缺失的默认角色。

如果数字孪生只显示少量角色：

1. 访问 `/api/health` 查看角色模板数量。
2. 刷新 `/team`。
3. 确认页面中没有 `???` 乱码。
4. 如仍异常，删除本地 `prisma/dev.db` 后重新执行 `npm run db:push`，再启动产品。

## 11. 公司资料导入

公司资料页支持：

- 手动填写基础信息
- 上传 `.txt`、`.md`、`.pdf`、`.docx`
- 粘贴公司情况说明

导入资料会保存到组织档案，并参与后续 LLM 会议推演。LLM 自动分析失败不会阻断资料保存。

## 12. 生产部署

正式 To B 部署必须使用 PostgreSQL，不要使用 `prisma/dev.db`。

复制生产示例：

```bash
cp .env.production.example .env.production
```

生产关键配置：

```env
DATABASE_URL="postgresql://ktsa_user:change-me@db.example.com:5432/ktsa?schema=public"
NODE_ENV="production"
LLM_BASE_URL="https://api.deepseek.com/v1"
LLM_API_KEY="your-production-llm-api-key"
LLM_MODEL="deepseek-chat"
LLM_TIMEOUT_MS="120000"
LLM_MAX_RETRIES="2"
LLM_WORKER_TOKEN="change-me-worker-token"
```

部署命令：

```bash
npm run prisma:generate:prod
npm run db:prod:migrate
npm run build
npm start
```

部署后检查：

```bash
npm run db:prod:status
```

并访问：

```text
/api/health
```

更详细 PostgreSQL 流程见：

```text
docs/production-postgres.md
```

## 13. 备份和数据保留

生产环境建议：

- 每日完整备份
- 支持 point-in-time recovery
- 每月至少一次恢复演练
- 审计日志至少保留 365 天
- LLM 调用日志至少保留 180 天
- 分享链接默认 30 天过期

不要把本地 SQLite 数据库当作生产备份。

## 14. GitHub 协作规范

提交前检查：

```bash
git status --short
npm run test
npm run build
```

不要提交：

- `.env`
- `prisma/dev.db`
- `node_modules`
- `.next`
- `*.tsbuildinfo`
- 日志文件

推荐提交方式：

```bash
git add <需要提交的文件>
git commit -m "描述本次改动"
git push origin main
```

不要直接使用 `git add .`，除非已经确认没有本地数据库、缓存或密钥文件。

## 15. 常见问题

### 页面显示没有工作区

访问 `/simulation/start` 并点击开始，或访问 `/api/health` 后刷新页面。系统会自动创建演示企业空间和基础工作区。

### 公司资料导入区域不见了

通常是当前没有工作区。先访问 `/api/health`，再刷新 `/organization`。

### 数字孪生角色不完整

刷新 `/team`。系统会自动补齐当前工作区缺失的默认角色。

### 数字孪生出现乱码

不要用非 UTF-8 命令手动写中文数据到数据库。优先从 `src/lib/domain.ts` 的角色模板重新同步。

### 开始模拟提示配置保存失败

先看页面错误详情，再访问 `/api/health`。常见原因是没有工作区、权限不足或数据库未初始化。

### LLM 会议生成失败

检查：

- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- 网络代理
- `/api/health` 中 `llmConfigured`

## 16. 交付前检查清单

- `/api/health` 返回 200。
- 角色模板数量为 `34/34`。
- `/team` 显示完整中文角色。
- `/organization` 可以保存和导入公司资料。
- `/simulation/start` 可以进入模拟配置。
- `/simulation/config` 可以选择角色并启动会议。
- `npm run test` 通过。
- `npm run build` 通过。
- GitHub 不包含 `.env`、`prisma/dev.db` 和构建缓存。
