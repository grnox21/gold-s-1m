import { z } from "zod";

export const barberSchema = z.object({
  name: z.string().trim().min(2, "İsim en az 2 karakter olmalı.").max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Sadece küçük harf, rakam ve tire kullanılabilir."),
  photoUrl: z.string().trim().url("Geçerli bir URL girin.").optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  specialty: z.string().trim().max(120).optional().or(z.literal("")),
  whatsappNumber: z.string().trim().min(8, "Geçerli bir telefon numarası girin."),
  isActive: z.boolean(),
});
export type BarberFormValues = z.infer<typeof barberSchema>;

export const barberLoginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
});
export type BarberLoginFormValues = z.infer<typeof barberLoginSchema>;

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Fiyat 0'dan küçük olamaz."),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(15, "Süre en az 15 dakika olmalı.")
    .refine((v) => v % 15 === 0, "Süre 15'in katları olmalı."),
  isActive: z.boolean(),
});
export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const workingHourSchema = z.object({
  barberId: z.uuid(),
  weekday: z.coerce.number().int().min(0).max(6),
  isClosed: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});
export type WorkingHourFormValues = z.infer<typeof workingHourSchema>;

export const blockedTimeSchema = z.object({
  barberId: z.string().optional(), // "" = tüm berberler
  startAt: z.string().min(1, "Başlangıç zamanı gerekli."),
  endAt: z.string().min(1, "Bitiş zamanı gerekli."),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});
export type BlockedTimeFormValues = z.infer<typeof blockedTimeSchema>;

export const whatsappSettingsSchema = z.object({
  provider: z.enum(["click_to_chat", "meta_cloud", "twilio"]),
  phoneNumberId: z.string().trim().optional().or(z.literal("")),
  businessNumber: z.string().trim().optional().or(z.literal("")),
  isEnabled: z.boolean(),
  sendCustomerConfirmation: z.boolean(),
  sendCustomerReminder: z.boolean(),
});
export type WhatsappSettingsFormValues = z.infer<typeof whatsappSettingsSchema>;

export const siteSettingsSchema = z.object({
  address: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  whatsapp_display_number: z.string().trim().optional().or(z.literal("")),
  instagram_url: z.string().trim().optional().or(z.literal("")),
  google_maps_url: z.string().trim().optional().or(z.literal("")),
  opening_hours_note: z.string().trim().optional().or(z.literal("")),
  owner_notification_email: z.string().trim().email("Geçerli bir e-posta girin.").optional().or(z.literal("")),
  meta_title: z.string().trim().optional().or(z.literal("")),
  meta_description: z.string().trim().optional().or(z.literal("")),
});
export type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;
