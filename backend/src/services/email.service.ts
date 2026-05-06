import nodemailer from "nodemailer";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!env.sendRealEmails || !env.smtpHost) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  });
  return transporter;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeOutboxPayload(templateKey: string, payload?: Record<string, unknown>) {
  if (!payload) return undefined;
  if (templateKey === "password-reset") {
    return { type: "password_reset", resetLink: "[REDACTED]" };
  }
  if (templateKey === "org-invite") {
    return {
      type: "organization_invite",
      organizationId: payload.organizationId,
      organizationName: payload.organizationName,
      role: payload.role,
      inviteToken: "[REDACTED]",
      inviteLink: "[REDACTED]",
    };
  }
  return payload;
}

function renderEmail(input: { subject: string; templateKey: string; payload?: Record<string, unknown> }) {
  if (input.templateKey === "password-reset") {
    const resetUrl = String(input.payload?.resetUrl || "");
    const appName = "SubnetOps";
    const text = [
      `Reset your ${appName} password`,
      "",
      "Use the link below to set a new password. This link expires in 30 minutes.",
      resetUrl,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n");
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px">Reset your ${appName} password</h2>
        <p>Use the button below to set a new password. This link expires in 30 minutes.</p>
        <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Reset password</a></p>
        <p style="font-size:13px;color:#4b5563">If the button does not work, copy and paste this URL into your browser:</p>
        <p style="font-size:13px;word-break:break-all;color:#4b5563">${escapeHtml(resetUrl)}</p>
        <p style="font-size:13px;color:#4b5563">If you did not request this, you can ignore this email.</p>
      </div>`;
    return { text, html };
  }

  if (input.templateKey === "org-invite") {
    const organizationName = String(input.payload?.organizationName || "an organization");
    const role = String(input.payload?.role || "MEMBER");
    const token = String(input.payload?.token || "");
    const inviteUrl = `${env.frontendAppUrl}/dashboard?inviteToken=${encodeURIComponent(token)}`;
    const text = [
      `You were invited to ${organizationName} on SubnetOps`,
      "",
      `Role: ${role}`,
      "",
      "Open SubnetOps and accept the pending invitation for your account:",
      inviteUrl,
      "",
      "If the invitation is not shown automatically, sign in with the invited email address.",
    ].join("\n");
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px">Organization invitation</h2>
        <p>You were invited to <strong>${escapeHtml(organizationName)}</strong> on SubnetOps as <strong>${escapeHtml(role)}</strong>.</p>
        <p><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Open SubnetOps</a></p>
        <p style="font-size:13px;color:#4b5563">Sign in with the invited email address to accept the invitation.</p>
      </div>`;
    return { text, html };
  }

  const text = input.payload ? JSON.stringify(input.payload, null, 2) : input.subject;
  return { text, html: `<pre>${escapeHtml(text)}</pre>` };
}

export async function queueEmail(input: { toEmail: string; subject: string; templateKey: string; payload?: Record<string, unknown>; }) {
  const outboxPayload = safeOutboxPayload(input.templateKey, input.payload);
  const outbox = await prisma.emailOutbox.create({
    data: {
      toEmail: input.toEmail.toLowerCase().trim(),
      subject: input.subject,
      templateKey: input.templateKey,
      payloadJson: outboxPayload ? JSON.stringify(outboxPayload) : null,
      status: "PENDING",
    },
  });

  const transport = getTransporter();
  if (!transport) return outbox;

  try {
    const rendered = renderEmail({ subject: input.subject, templateKey: input.templateKey, payload: input.payload });
    await transport.sendMail({ from: env.smtpFrom, to: outbox.toEmail, subject: outbox.subject, text: rendered.text, html: rendered.html });
    return prisma.emailOutbox.update({ where: { id: outbox.id }, data: { status: "SENT" } });
  } catch (error) {
    return prisma.emailOutbox.update({ where: { id: outbox.id }, data: { status: `FAILED:${String(error)}` } });
  }
}

export async function listEmailOutbox(limit = 25) {
  return prisma.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
