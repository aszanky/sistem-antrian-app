import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function transport() {
  const url = process.env.SMTP_URL;
  if (!url) return null;
  transporter ??= nodemailer.createTransport(url);
  return transporter;
}

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function sendMail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const mailer = transport();
  if (!mailer) {
    console.log(`[mail:dev] to=${to} subject=${subject}\n${text}`);
    return;
  }
  await mailer.sendMail({
    from: process.env.MAIL_FROM ?? "Antrian <no-reply@example.test>",
    to,
    subject,
    text,
  });
}
