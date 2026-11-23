import { resolve4, resolveMx } from "node:dns/promises";
import { FieldValidationError } from "@/lib/session";

/**
 * A free, key-less address check run before registering: the domain must be able to receive mail
 * (it has MX records) and must not be a throwaway-mailbox service. This catches typos such as
 * "gmial.com" and fake addresses. It cannot prove the mailbox exists; the emailed code does that.
 */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "10minutemail.net", "tempmail.com",
  "temp-mail.org", "throwawaymail.com", "yopmail.com", "sharklasers.com", "getnada.com", "trashmail.com",
  "maildrop.cc", "dispostable.com", "fakeinbox.com", "mintemail.com", "mohmal.com", "emailondeck.com",
]);

const LOOKUP_TIMEOUT_MS = 3_000;

export async function assertEmailDeliverable(email: string, field = "email") {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) throw new FieldValidationError({ [field]: ["Enter a valid email"] });
  if (DISPOSABLE_DOMAINS.has(domain)) {
    throw new FieldValidationError({ [field]: ["Temporary email addresses are not accepted. Use your own email."] });
  }
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), LOOKUP_TIMEOUT_MS)),
    ]);
    if (!records.length) throw Object.assign(new Error("no mx"), { code: "ENODATA" });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // Only a definite "this domain has no mail server" blocks registration; a slow or failing
    // DNS lookup must not stop real users from signing up.
    if (code === "ENOTFOUND" || code === "ENODATA") {
      // RFC 5321: a domain with no MX record but an address record still accepts mail.
      const hasAddress = await resolve4(domain).then((addresses) => addresses.length > 0, () => false);
      if (hasAddress) return;
      throw new FieldValidationError({ [field]: [`We can't find a mail server for "${domain}". Check the spelling of your email.`] });
    }
  }
}
