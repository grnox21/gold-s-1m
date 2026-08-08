import "server-only";

import type { WhatsAppSettings } from "@/types/database";
import type { WhatsAppProvider } from "./provider";
import { ClickToChatProvider } from "./providers/click-to-chat";
import { MetaCloudProvider } from "./providers/meta-cloud";
import { TwilioProvider } from "./providers/twilio";

/**
 * Resolves the configured WhatsApp provider. Credentials live only in
 * server env vars (never in the database, never sent to the browser); the
 * `whatsapp_settings` row just says which provider the admin picked and
 * carries the non-secret phone_number_id / business_number. If the chosen
 * provider is missing its credentials, this falls back to the
 * click-to-chat provider instead of throwing — a booking must never fail
 * because WhatsApp isn't fully wired up yet.
 */
export function createWhatsAppProvider(settings: Pick<WhatsAppSettings, "provider" | "phone_number_id">): WhatsAppProvider {
  if (settings.provider === "meta_cloud") {
    const accessToken = process.env.WHATSAPP_META_ACCESS_TOKEN;
    const phoneNumberId = settings.phone_number_id || process.env.WHATSAPP_META_PHONE_NUMBER_ID;
    if (accessToken && phoneNumberId) {
      return new MetaCloudProvider({
        accessToken,
        phoneNumberId,
        apiVersion: process.env.WHATSAPP_META_API_VERSION,
      });
    }
    console.warn(
      "[whatsapp] provider=meta_cloud seçili ama WHATSAPP_META_ACCESS_TOKEN / phone_number_id eksik — click-to-chat'e düşülüyor."
    );
  }

  if (settings.provider === "twilio") {
    const accountSid = process.env.WHATSAPP_TWILIO_ACCOUNT_SID;
    const authToken = process.env.WHATSAPP_TWILIO_AUTH_TOKEN;
    const fromWhatsAppNumber = process.env.WHATSAPP_TWILIO_FROM_NUMBER;
    if (accountSid && authToken && fromWhatsAppNumber) {
      return new TwilioProvider({ accountSid, authToken, fromWhatsAppNumber });
    }
    console.warn(
      "[whatsapp] provider=twilio seçili ama Twilio kimlik bilgileri eksik — click-to-chat'e düşülüyor."
    );
  }

  return new ClickToChatProvider();
}
