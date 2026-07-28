# KTSA 生产环境部署验证清单

> **适用版本：** KTSA v1.x → To B 正式交付
> **最后更新：** 2026-07-28

---

## 一、数据库验证

### 1.1 PostgreSQL 连接

```bash
# 验证数据库连接
psql "$DATABASE_URL" -c "SELECT version();"

# 预期输出：PostgreSQL 15.x 或 16.x
```

- [ ] PostgreSQL 版本 ≥ 15
- [ ] DATABASE_URL 指向生产数据库（非 SQLite）
- [ ] 数据库连接池配置正确（DATABASE_POOL_MIN=2, DATABASE_POOL_MAX=10）

### 1.2 迁移状态

```bash
# 检查迁移状态
npx prisma migrate status --schema prisma-postgres/schema.prisma

# 执行迁移
npx prisma migrate deploy --schema prisma-postgres/schema.prisma
```

- [ ] 所有迁移已成功应用
- [ ] 迁移历史记录完整
- [ ] 无待处理的迁移

### 1.3 表结构验证

```sql
-- 核心表数量
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- 预期：25+ 张表

-- 检查关键表是否存在
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'EnterpriseTenant', 'AppUser', 'AuthSession',
  'SimulationWorkspace', 'OrganizationProfile',
  'TeamMember', 'DistillationProfile',
  'BusinessEvent', 'StrategyMeeting', 'DecisionOption',
  'SimulationFinale', 'AuditLog', 'LlmCallLog'
);
```

- [ ] 所有核心表已创建
- [ ] 索引已正确创建
- [ ] 外鍵約束已生效

---

## 二、应用验证

### 2.1 健康检查

```bash
curl -s https://ktsa.example.com/api/health | jq .
```

预期响应：
```json
{
  "ok": true,
  "service": "ktsa",
  "checks": {
    "database": true,
    "databaseProvider": "postgresql",
    "llmConfigured": true,
    "model": "deepseek-chat",
    "roleTemplates": { "expected": 30, "actual": 34, "synced": true }
  }
}
```

- [ ] `database` 返回 `true`
- [ ] `databaseProvider` 为 `postgresql`（非 `sqlite`）
- [ ] `llmConfigured` 为 `true`

### 2.2 认证流程

- [ ] 可以注册新企业帐号
- [ ] 可以登入
- [ ] 登入後可訪問企業空間
- [ ] 可以登出

### 2.3 核心业务流

- [ ] 可以创建沙盘工作区
- [ ] 可以添加团队成员
- [ ] 可以上传文件进行资料蒸馏
- [ ] 可以启动 20 轮模拟
- [ ] 可以推进经营周期
- [ ] 模拟结束后可以生成结局报告
- [ ] 可以导出 PDF / Word / PPT / Markdown
- [ ] 可以创建只读分享链接
- [ ] 分享链接可以正常访问

### 2.4 权限验证

- [ ] Admin 可以邀请成员、管理权限、配置 SSO
- [ ] Editor 可以编辑业务数据，但不能管理成员
- [ ] Viewer 可以查看但不能编辑
- [ ] A 企业成员无法访问 B 企业数据
- [ ] 未登入用户无法访问受保护资源

---

## 三、LLM 验证

### 3.1 API 连接

```bash
# 验证 LLM API 可达
curl -s "$LLM_BASE_URL/models" -H "Authorization: Bearer $LLM_API_KEY"
```

- [ ] LLM API Key 有效
- [ ] 模型可正常调用
- [ ] LLM_TIMEOUT_MS 设置合理（生产建议 120000ms）

### 3.2 成本追踪

- [ ] `LlmCallLog` 表正常记录每次调用
- [ ] 成本预估准确（LLM_MODEL_RATES_JSON 配置正确）
- [ ] 后台 LLM Worker 可以处理排队任务

### 3.3 失败恢复

- [ ] 模拟 LLM API 失败 → 系统自动重试
- [ ] 超时后返回用户可理解的错误信息
- [ ] 错误信息出现在 `/enterprise` 的 LLM 调用记录中

---

## 四、安全验证

### 4.1 传输安全

- [ ] HTTPS 强制启用（HSTS）
- [ ] Cookie 设置 `httpOnly` + `secure` + `sameSite`

### 4.2 数据隔离

- [ ] 跨租户数据访问被拒绝（手动测试 A 企业访问 B 企业数据的 API）
- [ ] 分享链接使用 token 哈希验证
- [ ] 分享链接过期/撤销后无法访问

### 4.3 密钥管理

- [ ] 所有 API Key 通过环境变量注入（不硬编码）
- [ ] `.env` 文件不在版本控制中
- [ ] 生产环境不使用默认密码

---

## 五、运维验证

### 5.1 备份

```bash
bash scripts/db/backup.sh production
```

- [ ] 备份脚本可以正常运行
- [ ] 备份文件生成在 `backups/` 目录
- [ ] 备份文件大小合理（非空）

### 5.2 恢复演练

```bash
# 先恢复到 staging 环境验证
bash scripts/db/restore.sh backups/ktsa-production-YYYYMMDD-HHMMSS.sql.gz
```

- [ ] 恢复流程文档完整
- [ ] 最近一次恢复演练在 30 天内完成

### 5.3 监控

- [ ] `/api/health` 纳入监控告警
- [ ] LLM 失败率监控告警阈值设置（建议 > 5% 触发告警）
- [ ] 数据库连接数监控
- [ ] 慢请求日志

### 5.4 日志

- [ ] 结构化日志正常输出（如使用 pino）
- [ ] 错误日志包含 tenantId 和 request 上下文
- [ ] 日志保留策略已配置

---

## 六、文档验证

- [ ] 隐私政策可公开访问（`/docs/privacy`）
- [ ] 服务条款可公开访问（`/docs/terms`）
- [ ] DPA 已签署（如企业客户要求）
- [ ] 私有化部署 Runbook 已交付
- [ ] 安全白皮书已交付
- [ ] 备份恢复说明已交付

---

## 七、Docker 部署验证（如适用）

```bash
# 一键启动
docker compose up -d

# 验证
curl http://localhost:3000/api/health

# 停止
docker compose down
```

- [ ] `docker compose up -d` 可以一键启动所有服务
- [ ] App、Worker、PostgreSQL 三个容器正常运行
- [ ] 健康检查通过
- [ ] `docker compose down` 后数据保留在 volume

---

> **签署确认**
>
> 部署负责人：_______________ 日期：_______________
> 技术负责人：_______________ 日期：_______________
