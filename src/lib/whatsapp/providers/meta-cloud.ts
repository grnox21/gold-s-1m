import type { WhatsAppProvider, WhatsAppSendResult } from "../provider";

interface MetaCloudConfig {
  phoneNumberId: string;
  accessToken: string;
  /** Graph API version, e.g. "v21.0". */
  apiVersion?: string;
}

/**
 * Meta WhatsApp Cloud API.
 *
 * IMPORTANT (production note, not a code TODO): Meta only allows free-form
 * text messages like the one sent below inside a 24-hour window after the
 * customer last messaged the business. Business-initiated notifications —
 * exactly what booking confirmations and reminders are — normally require
 * a pre-approved Message Template outside that window. This class sends
 * plain text, which is correct for testing (and works if the customer has
 * an open session), but before relying on this in production, register
 * "randevu_onay" / "randevu_hatirlatma" style templates in Meta Business
 * Manager and switch the request body to the `template` message type.
 */
export class MetaCloudProvider implements WhatsAppProvider {
  constructor(private config: MetaCloudConfig) {}

  async sendMessage(toE164Phone: string, text: string): Promise<WhatsAppSendResult> {
    const version = this.config.apiVersion ?? "v21.0";
    const url = `https://graph.facebook.com/${version}/${this.config.phoneNumberId}/messages`;
    const to = toE164Phone.replace(/^\+/, "");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text, preview_url: false },
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { messages?: { id: string }[]; error?: { message: string } }
        | null;

      if (!res.ok) {
        return { status: "failed", error: json?.error?.message ?? `HTTP ${res.status}` };
      }

      return { status: "sent", providerMessageId: json?.messages?.[0]?.id };
    } catch (err) {
      return { status: "failed", error: err instanceof Error ? err.message : "Bilinmeyen hata" };
    }
  }
}
