import "server-only";

export type EmailSendResult =
  | { status: "sent"; providerMessageId?: string }
  | { status: "failed"; error: string }
  /** No provider is configured — the caller logs this and moves on rather
   * than blocking anything. Same "not a failure" treatment
   * WhatsAppSendResult gives an unconfigured provider (see
   * lib/whatsapp/provider.ts). */
  | { status: "skipped"; reason: string };

/**
 * Sends a plain-text email via Resend's HTTP API (https://resend.com) —
 * one dependency-free POST, same reasoning as TwilioProvider
 * (lib/whatsapp/providers/twilio.ts) using raw fetch instead of pulling in
 * an SDK. Needs RESEND_API_KEY and RESEND_FROM_EMAIL in server env vars
 * (see .env.example); RESEND_FROM_EMAIL must be an address on a domain
 * verified in the Resend dashboard, or every send fails at the API level
 * regardless of the key being valid.
 */
export async function sendEmail(input: { to: string; subject: string; text: string }): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { status: "skipped", reason: "RESEND_API_KEY / RESEND_FROM_EMAIL yapılandırılmamış." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    });

    const json = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!res.ok) {
      return { status: "failed", error: json?.message ?? `HTTP ${res.status}` };
    }
    return { status: "sent", providerMessageId: json?.id };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "Bilinmeyen hata" };
  }
}
