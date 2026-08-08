export interface NotificationContext {
  barberName: string;
  customerName: string;
  customerPhone: string;
  serviceNames: string[];
  dateLabel: string; // "15 Ağustos 2026"
  timeRangeLabel: string; // "17:30 – 18:30"
  startTimeLabel: string; // "17:30"
  shopName?: string;
}

const SHOP_NAME_DEFAULT = "Yusuf Demir Erkek Kuaförü";

function serviceLine(services: string[]) {
  return services.join(" + ");
}

/** Sent to the selected barber's own WhatsApp number the moment a booking
 * is confirmed. The barber's name always comes from the appointment's
 * actual barber — never hardcoded to any one person. */
export function bookingNotificationToBarber(ctx: NotificationContext): string {
  return [
    `Merhaba ${ctx.barberName},`,
    "",
    "Yeni bir randevunuz var.",
    "",
    `👤 Müşteri: ${ctx.customerName}`,
    `✂️ Hizmet: ${serviceLine(ctx.serviceNames)}`,
    `📅 Tarih: ${ctx.dateLabel}`,
    `⏰ Saat: ${ctx.timeRangeLabel}`,
    `📱 Telefon: ${ctx.customerPhone}`,
    "",
    "Randevu sistemi üzerinden oluşturulmuştur.",
  ].join("\n");
}

export function bookingConfirmationToCustomer(ctx: NotificationContext): string {
  return [
    `Merhaba ${ctx.customerName},`,
    "",
    `${ctx.shopName ?? SHOP_NAME_DEFAULT} randevunuz başarıyla oluşturuldu.`,
    "",
    "✂️ Hizmet:",
    serviceLine(ctx.serviceNames),
    "",
    "💈 Berber:",
    ctx.barberName,
    "",
    "📅 Tarih:",
    ctx.dateLabel,
    "",
    "⏰ Saat:",
    ctx.startTimeLabel,
    "",
    "Görüşmek üzere.",
  ].join("\n");
}

export function reminderToBarber(ctx: NotificationContext): string {
  return [
    `Merhaba ${ctx.barberName},`,
    "",
    "⏰ Hatırlatma",
    "",
    "30 dakika sonra bir randevunuz var.",
    "",
    "👤 Müşteri:",
    ctx.customerName,
    "",
    "✂️ Hizmet:",
    serviceLine(ctx.serviceNames),
    "",
    "⏰ Saat:",
    ctx.startTimeLabel,
  ].join("\n");
}

export function reminderToCustomer(ctx: NotificationContext): string {
  return [
    `Merhaba ${ctx.customerName},`,
    "",
    "⏰ Randevunuza 30 dakika kaldı.",
    "",
    "💈 Berber:",
    ctx.barberName,
    "",
    "✂️ Hizmet:",
    serviceLine(ctx.serviceNames),
    "",
    "⏰ Saat:",
    ctx.startTimeLabel,
    "",
    "Görüşmek üzere.",
  ].join("\n");
}

export function cancellationToCustomer(ctx: NotificationContext): string {
  return [
    `Merhaba ${ctx.customerName},`,
    "",
    `${ctx.dateLabel} tarihli, ${ctx.startTimeLabel} saatindeki randevunuz iptal edilmiştir.`,
    "",
    "Yeni bir randevu oluşturmak için bizimle iletişime geçebilir veya web sitemizi ziyaret edebilirsiniz.",
  ].join("\n");
}
