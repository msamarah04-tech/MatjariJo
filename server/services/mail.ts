import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../env.js';
import { logger } from '../logger.js';

export type MailAttachment = {
  filename: string;
  /** Base64-encoded file content. */
  content: string;
  contentType?: string;
};

export type MailMessage = { to: string; subject: string; html: string; attachments?: MailAttachment[] };

const from = () => env.MAIL_FROM || 'Matjari Jordan <no-reply@matjari.local>';

let smtpTransport: Transporter | null = null;
function getSmtpTransport(): Transporter {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return smtpTransport;
}

async function sendViaResend(message: MailMessage) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: from(),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      ...(message.attachments?.length
        ? { attachments: message.attachments.map((file) => ({ filename: file.filename, content: file.content })) }
        : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
}

async function deliver(message: MailMessage) {
  if (env.RESEND_API_KEY) {
    await sendViaResend(message);
    return;
  }
  if (env.SMTP_HOST) {
    await getSmtpTransport().sendMail({
      from: from(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      attachments: message.attachments?.map((file) => ({
        filename: file.filename,
        content: Buffer.from(file.content, 'base64'),
        contentType: file.contentType,
      })),
    });
    return;
  }
  logger.info({ to: message.to, subject: message.subject }, 'Email skipped — no mail provider configured (set RESEND_API_KEY or SMTP_HOST)');
}

/**
 * Fire-and-forget email send. Never throws and never blocks the caller — a
 * failed notification must not fail an order, approval, or payment.
 */
export function sendMail(message: MailMessage): void {
  if (!message.to) return;
  deliver(message)
    .then(() => {
      if (env.RESEND_API_KEY || env.SMTP_HOST) logger.info({ to: message.to, subject: message.subject }, 'Email sent');
    })
    .catch((error) => logger.error({ err: error, to: message.to, subject: message.subject }, 'Email send failed'));
}
