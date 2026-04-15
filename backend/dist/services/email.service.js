import nodemailer from "nodemailer";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
let transporter = null;
function getTransporter() {
    if (!env.sendRealEmails || !env.smtpHost)
        return null;
    if (transporter)
        return transporter;
    transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
    return transporter;
}
export async function queueEmail(input) {
    const outbox = await prisma.emailOutbox.create({
        data: {
            toEmail: input.toEmail.toLowerCase().trim(),
            subject: input.subject,
            templateKey: input.templateKey,
            payloadJson: input.payload ? JSON.stringify(input.payload) : null,
            status: "PENDING",
        },
    });
    const transport = getTransporter();
    if (!transport)
        return outbox;
    try {
        const html = `<pre>${JSON.stringify(input.payload || {}, null, 2)}</pre>`;
        await transport.sendMail({
            from: env.smtpFrom,
            to: outbox.toEmail,
            subject: outbox.subject,
            text: input.payload ? JSON.stringify(input.payload, null, 2) : outbox.subject,
            html,
        });
        return prisma.emailOutbox.update({ where: { id: outbox.id }, data: { status: "SENT" } });
    }
    catch (error) {
        return prisma.emailOutbox.update({ where: { id: outbox.id }, data: { status: `FAILED:${String(error)}` } });
    }
}
export async function listEmailOutbox(limit = 25) {
    return prisma.emailOutbox.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
    });
}
