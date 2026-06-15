# KTSA 企业 SSO 配置说明

## 支持范围

当前已实现 OIDC 登录链路：

- 企业管理员在企业空间保存 OIDC / Microsoft / Google 配置。
- 登录页输入企业邮箱。
- 系统按邮箱域名匹配已启用的企业 SSO 配置。
- 跳转到企业身份提供商。
- 回调后使用 code 交换 token。
- 从 ID Token 或 UserInfo 中读取邮箱。
- 已存在用户直接登录。
- 已邀请成员可自动创建账号并登录。

SAML 当前仍是配置占位，尚未实现 SAML Response 校验和证书信任链。

## 必填配置

在企业空间填写：

- Provider：OIDC、Microsoft 或 Google。
- Issuer：身份提供商 Issuer URL。
- Client ID。
- Client Secret：如身份提供商要求则填写。
- 状态：启用。

回调地址：

```text
https://your-domain.example.com/api/auth/sso/callback
```

本地开发：

```text
http://127.0.0.1:3000/api/auth/sso/callback
```

## 安全规则

- SSO state 使用 httpOnly cookie 保存，并在回调时校验。
- state 会绑定到具体 SSO 配置，避免多个企业配置混淆。
- SSO 不开放任意邮箱自动注册。
- 只有已存在用户，或已被企业邀请的成员邮箱，才能通过 SSO 创建账号。
- SSO 登录会写入审计日志。

## 生产建议

- 生产环境必须设置 `KTSA_APP_URL`，避免回调地址不一致。
- 每个环境使用独立 OIDC Client。
- Client Secret 不要提交到 GitHub。
- 若启用 Microsoft Entra ID，Issuer 通常为租户专属 URL。
- 若启用 Google Workspace，建议限制 Workspace 域名和应用访问权限。
