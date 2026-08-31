import type { NotificationContext } from "@/lib/whatsapp/templates";

function serviceLine(services: string[]) {
  return services.join(" + ");
}

/** Sent to the shop owner's email the moment a booking is confirmed —
 * every appointment, regardless of which barber it's for. */
export function ownerNewBookingEmail(ctx: NotificationContext): { subject: string; text: string } {
  return {
    subject: `Yeni randevu — ${ctx.customerName}, ${ctx.dateLabel} ${ctx.startTimeLabel}`,
    text: [
      "Yeni bir randevu oluşturuldu.",
      "",
      `👤 Müşteri: ${ctx.customerName}`,
      `📱 Telefon: ${ctx.customerPhone}`,
      `💈 Berber: ${ctx.barberName}`,
      `✂️ Hizmet: ${serviceLine(ctx.serviceNames)}`,
      `📅 Tarih: ${ctx.dateLabel}`,
      `⏰ Saat: ${ctx.timeRangeLabel}`,
    ].join("\n"),
  };
}

/** Sent to the shop owner's email 30 minutes before an appointment — same
 * timing/window as reminder_barber and reminder_customer (see
 * lib/whatsapp/send.ts and the cron route). */
export function ownerReminderEmail(ctx: NotificationContext): { subject: string; text: string } {
  return {
    subject: `Hatırlatma — 30 dakika sonra randevu (${ctx.customerName})`,
    text: [
      "30 dakika sonra bir randevu var.",
      "",
      `👤 Müşteri: ${ctx.customerName}`,
      `📱 Telefon: ${ctx.customerPhone}`,
      `💈 Berber: ${ctx.barberName}`,
      `✂️ Hizmet: ${serviceLine(ctx.serviceNames)}`,
      `⏰ Saat: ${ctx.startTimeLabel}`,
    ].join("\n"),
  };
}
