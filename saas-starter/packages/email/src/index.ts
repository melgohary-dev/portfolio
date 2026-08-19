import 'dotenv/config';
import { Resend } from 'resend';

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult = { id: string };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function devPrint(message: EmailMessage): void {
  console.log(
    `[email:dev] to=${message.to} subject=${message.subject}${message.html ? ' (html)' : ''}`,
  );
  console.log(message.text);
}

export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    devPrint(message);
    return { id: `dev-${Date.now()}` };
  }
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? 'SaaS Starter <noreply@example.com>',
    to: message.to,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
  });
  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }
  return { id: data?.id ?? 'sent' };
}

export function renderResetPasswordEmail(opts: { name?: string; resetUrl: string }) {
  const safeName = opts.name ? escapeHtml(opts.name) : '';
  const safeUrl = escapeAttribute(opts.resetUrl);
  const text = [
    `Hi${opts.name ? ` ${opts.name}` : ''},`,
    '',
    'You asked to reset your password for SaaS Starter.',
    'Click the link below to choose a new one. This link expires in 30 minutes.',
    '',
    opts.resetUrl,
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');
  const html = [
    '<div style="font-family:sans-serif;line-height:1.5">',
    `<p>Hi${safeName ? ` ${safeName}` : ''},</p>`,
    '<p>You asked to reset your password for SaaS Starter.</p>',
    '<p>Click the link below to choose a new one. It expires in 30 minutes.</p>',
    `<p><a href="${safeUrl}">Reset my password</a></p>`,
    '<p>If you did not request this, you can safely ignore this email.</p>',
    '</div>',
  ].join('');
  return { text, html };
}
