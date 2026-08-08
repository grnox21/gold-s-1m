export type WhatsAppSendResult =
  | { status: "sent"; providerMessageId?: string }
  | { status: "failed"; error: string }
  /** No real API is configured — the caller falls back to a wa.me
   * click-to-chat link instead of an automated send. Not a failure. */
  | { status: "skipped"; waLink: string };

export interface WhatsAppProvider {
  sendMessage(toE164Phone: string, text: string): Promise<WhatsAppSendResult>;
}
