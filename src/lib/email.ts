import nodemailer from "nodemailer";

/**
 * The one place that sends email. The provider sits behind `sendEmail`, so callers never change.
 * Pick ONE provider with environment variables:
 *
 *   SMTP (no domain needed, works with a free mailbox such as a dedicated Gmail account + app password):
 *     SMTP_HOST, SMTP_PORT (587 or 465), SMTP_USER, SMTP_PASS, EMAIL_FROM
 *
 *   Resend HTTP API (needs a verified sending domain to reach anyone but the account owner):
 *     RESEND_API_KEY, EMAIL_FROM
 *
 * SMTP wins when both are set. With neither, development only logs the message to the server console
 * so the flow can be exercised locally; production refuses to continue rather than silently dropping
 * a verification code.
 */
export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email sending is not configured. Please contact the CTE office.");
    this.name = "EmailNotConfiguredError";
  }
}

const smtpConfigured = () => !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
const resendConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

export function isEmailConfigured(): boolean {
  return smtpConfigured() || resendConfigured();
}

export function assertEmailAvailable() {
  if (!isEmailConfigured() && process.env.NODE_ENV === "production") throw new EmailNotConfiguredError();
}

type Message = { to: string; subject: string; text: string };

async function sendViaSmtp(message: Message) {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  } catch (error) {
    console.error("[email] smtp send failed", error);
    throw new Error("We could not send the verification email. Please try again in a moment.");
  }
}

async function sendViaResend(message: Message) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [message.to], subject: message.subject, text: message.text }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[email] send failed", response.status, detail);
    // Resend's shared test sender only delivers to the account owner until a domain is verified.
    if (response.status === 403 && /verify a domain|own email/i.test(detail)) {
      throw new Error(
        "The verification email could not be delivered to this address because the sending domain is not set up yet. Please contact the CTE office.",
      );
    }
    throw new Error("We could not send the verification email. Please try again in a moment.");
  }
}

export async function sendEmail(message: Message) {
  if (smtpConfigured()) return sendViaSmtp(message);
  if (resendConfigured()) return sendViaResend(message);
  if (process.env.NODE_ENV === "production") throw new EmailNotConfiguredError();
  console.log(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
}
