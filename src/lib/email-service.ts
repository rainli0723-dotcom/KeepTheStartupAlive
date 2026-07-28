/**
 * Email notification service.
 * In production, integrate with SendGrid/Mailgun/AWS SES.
 * Currently logs to console + audit trail.
 */

import { getDb } from "./db";
import { writeAuditLog } from "./tenant";

export async function sendInviteEmail(input: {
  email: string; tenantName: string; inviteUrl: string; inviterName: string;
}) {
  const subject = `${input.inviterName} 邀请你加入 ${input.tenantName} — KTSA`;
  const body = `${input.inviterName} 邀请你加入 ${input.tenantName} 的企业空间。\n点击链接接受邀请：${input.inviteUrl}\n\n链接 7 天内有效。`;
  return sendEmail({ to: input.email, subject, body, type: "invite" });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const subject = "KTSA 密码重置";
  const body = `你请求了密码重置。\n点击链接设置新密码（1 小时内有效）：${resetUrl}\n\n如果你没有请求重置，请忽略此邮件。`;
  return sendEmail({ to: email, subject, body, type: "password_reset" });
}

export async function sendTrialExpiryEmail(email: string, daysLeft: number) {
  const subject = daysLeft > 0 ? `KTSA 试用期还有 ${daysLeft} 天` : "KTSA 试用期已到期";
  const body = daysLeft > 0
    ? `你的 KTSA 试用期还有 ${daysLeft} 天到期。升级为企业版以继续使用全部功能。`
    : "你的 KTSA 试用期已到期。部分功能已暂停。升级为企业版以恢复使用。";
  return sendEmail({ to: email, subject, body, type: "trial_expiry" });
}

export async function sendDecisionApprovedEmail(email: string, decisionTitle: string) {
  const subject = `决策已审批：${decisionTitle}`;
  const body = `你的决策「${decisionTitle}」已被管理员审批通过。`;
  return sendEmail({ to: email, subject, body, type: "decision_approved" });
}

async function sendEmail(input: { to: string; subject: string; body: string; type: string }) {
  const db = getDb();

  // Log to audit trail
  await db.auditLog.create({
    data: {
      action: `email.${input.type}`,
      entityType: "EmailNotification",
      actor: "system",
      metadata: JSON.stringify({ to: input.to, subject: input.subject }),
    },
  });

  // In production: integrate with email provider
  if (process.env.EMAIL_PROVIDER === "sendgrid") {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: input.to }] }],
        from: { email: process.env.EMAIL_FROM || "noreply@ktsa.dev" },
        subject: input.subject,
        content: [{ type: "text/plain", value: input.body }],
      }),
    });
  } else {
    console.log(`[email] ${input.type} → ${input.to}: ${input.subject}`);
  }
}
