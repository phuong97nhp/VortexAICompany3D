import nodemailer from 'nodemailer';

export async function sendEmailSmtp(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; dryRun?: boolean; error?: string }> {
  if (process.env.DRY_RUN !== 'false') {
    console.log(`[DRY_RUN SMTP -> ${opts.to}] ${opts.subject}`);
    return { ok: true, dryRun: true };
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return { ok: false, error: 'Thiếu cấu hình SMTP_HOST / SMTP_USER / SMTP_PASS' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'SMTP error' };
  }
}

export async function sendTelegramFallback(text: string): Promise<{ ok: boolean; dryRun?: boolean; error?: string }> {
  if (process.env.DRY_RUN !== 'false') {
    console.log(`[DRY_RUN Telegram]: ${text}`);
    return { ok: true, dryRun: true };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CEO_CHAT_ID;
  if (!token || !chatId) {
    return { ok: false, error: 'Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CEO_CHAT_ID' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) return { ok: false, error: `Telegram HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Telegram error' };
  }
}
