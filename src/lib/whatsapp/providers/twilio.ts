import type { WhatsAppProvider, WhatsAppSendResult } from "../provider";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /** Twilio WhatsApp-enabled sender, e.g. "whatsapp:+14155238886". */
  fromWhatsAppNumber: string;
}

/** Twilio's WhatsApp API. Same production caveat as Meta Cloud applies:
 * business-initiated messages outside a 24h session window need an
 * approved Content Template (Twilio's equivalent of Meta's Message
 * Templates) rather than free-form Body text. */
export class TwilioProvider implements WhatsAppProvider {
  constructor(private config: TwilioConfig) {}

  async sendMessage(toE164Phone: string, text: string): Promise<WhatsAppSendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString(
      "base64"
    );

    const body = new URLSearchParams({
      From: this.config.fromWhatsAppNumber,
      To: `whatsapp:${toE164Phone}`,
      Body: text,
    });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      const json = (await res.json().catch(() => null)) as
        | { sid?: string; message?: string }
        | null;

      if (!res.ok) {
        return { status: "failed", error: json?.message ?? `HTTP ${res.status}` };
      }

      return { status: "sent", providerMessageId: json?.sid };
    } catch (err) {
      return { status: "failed", error: err instanceof Error ? err.message : "Bilinmeyen hata" };
    }
  }
}
