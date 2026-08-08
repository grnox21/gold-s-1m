import type { WhatsAppProvider, WhatsAppSendResult } from "../provider";
import { waLink } from "@/lib/booking/phone";

/**
 * Development / no-credentials fallback. Never fails and never actually
 * sends — it hands back a wa.me deep link so the UI (booking confirmation
 * screen, admin dashboard) can offer "WhatsApp ile Paylaş" instead of an
 * automated message. This is what keeps the booking flow fully working
 * before real WhatsApp Business API credentials exist.
 */
export class ClickToChatProvider implements WhatsAppProvider {
  async sendMessage(toE164Phone: string, text: string): Promise<WhatsAppSendResult> {
    return { status: "skipped", waLink: waLink(toE164Phone, text) };
  }
}
