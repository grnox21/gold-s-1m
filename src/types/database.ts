// Hand-written to match supabase/migrations/*.sql — there is no linked
// Supabase project in this environment to run `supabase gen types` against.
// Keep in sync with the migrations if the schema changes.

export type AppointmentStatus =
  | "held"
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type WhatsAppProviderName = "click_to_chat" | "meta_cloud" | "twilio";

export interface Barber {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  bio: string | null;
  specialty: string | null;
  whatsapp_number: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkingHour {
  id: string;
  barber_id: string;
  weekday: number; // 0 = Pazar .. 6 = Cumartesi (matches Date#getDay())
  is_closed: boolean;
  start_time: string | null; // "HH:MM:SS"
  end_time: string | null;
}

export interface BreakTime {
  id: string;
  barber_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface BlockedTime {
  id: string;
  barber_id: string | null;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  barber_id: string;
  customer_id: string | null;
  start_at: string;
  end_at: string;
  total_duration_minutes: number;
  total_price: number;
  status: AppointmentStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_note: string | null;
  hold_expires_at: string | null;
  cancel_reason: string | null;
  confirmation_sent: boolean;
  barber_reminder_sent: boolean;
  customer_reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppointmentService {
  appointment_id: string;
  service_id: string;
  name_at_booking: string;
  price_at_booking: number;
  duration_at_booking: number;
}

export interface NotificationLog {
  id: string;
  appointment_id: string | null;
  channel: "whatsapp";
  recipient_type: "barber" | "customer";
  recipient_number: string | null;
  template: string;
  status: "sent" | "failed" | "skipped";
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
}

export interface SiteSetting {
  key: string;
  value: string | null;
  updated_at: string;
}

export interface WhatsAppSettings {
  id: 1;
  provider: WhatsAppProviderName;
  phone_number_id: string | null;
  business_number: string | null;
  is_enabled: boolean;
  send_customer_confirmation: boolean;
  send_customer_reminder: boolean;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  auth_user_id: string;
  full_name: string;
  role: "admin" | "owner" | "barber";
  /** Only set when role is 'barber' — scopes that login to a single barbers row. */
  barber_id: string | null;
  created_at: string;
}

/** Shape returned by the create_appointment() RPC. */
export type CreateAppointmentResult = Appointment;

/** A photo or video uploaded from /giris/gorseller. `storage_path` is its
 * object key in the 'gallery' Storage bucket; the show_* flags are
 * per-page placement toggles (an item can be on any combination,
 * including none) — though a video's show_about is always forced false
 * server-side, since Hakkımızda only ever renders a single still photo
 * (see uploadGalleryImage in lib/gallery-storage.ts). */
export interface GalleryImageRow {
  id: string;
  storage_path: string;
  media_type: "image" | "video";
  show_gallery: boolean;
  show_about: boolean;
  created_at: string;
}

/** A "works" photo on a barber's own public profile page
 * (/berberler/[slug]), uploaded from /giris/berberler. Distinct from
 * Barber.photo_url, which is the single headshot on barber cards/the
 * berberler list — a barber can have any number of these. */
export interface BarberPhotoRow {
  id: string;
  barber_id: string;
  storage_path: string;
  created_at: string;
}
