/**
 * The one place that sends email. The provider sits behind `sendEmail` so it can be
 * swapped without touching callers. It uses Resend's HTTP API (no extra dependency):
 *   RESEND_API_KEY  - API key
 *   EMAIL_FROM      - verified sender, e.g. "CTE PracTrack <no-reply@yourdomain.edu.ph>"
 *
 * With no key configured, development only logs the message to the server console so the
 * flow can be exercised locally. Production refuses to continue rather than silently
 * dropping a verification code.
 */
export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email sending is not configured. Please contact the CTE office.");
    this.name = "EmailNotConfiguredError";
  }
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export function assertEmailAvailable() {
  if (!isEmailConfigured() && process.env.NODE_ENV === "production") throw new EmailNotConfiguredError();
}

export async function sendEmail(message: { to: string; subject: string; text: string }) {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new EmailNotConfiguredError();
    console.log(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return;
  }

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
