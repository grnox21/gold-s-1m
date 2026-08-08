export type BookingStep = "service" | "barber" | "date" | "time" | "details" | "confirm" | "success";

export const STEP_ORDER: BookingStep[] = ["service", "barber", "date", "time", "details", "confirm", "success"];

export const STEP_LABELS: Record<BookingStep, string> = {
  service: "Hizmet",
  barber: "Berber",
  date: "Tarih",
  time: "Saat",
  details: "Bilgiler",
  confirm: "Onay",
  success: "Tamamlandı",
};

export interface AlternativeSlot {
  startAt: string;
  endAt: string;
  label: string;
}

export interface ConfirmedBooking {
  appointmentId: string;
  barberName: string;
  serviceNames: string[];
  startAt: string;
  endAt: string;
  totalDurationMinutes: number;
  totalPrice: number;
  customerName: string;
}

export interface BookingState {
  step: BookingStep;
  serviceIds: string[];
  barberId: string | null;
  date: string | null;
  startAt: string | null;
  endAt: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote: string;
  appointmentId: string | null;
  holdExpiresAt: string | null;
  holdSeconds: number | null;
  confirmed: ConfirmedBooking | null;
  /** Set when a hold/confirm attempt loses the race for a slot — surfaced
   * on the time step along with fresh alternatives to pick from. */
  slotError: string | null;
  alternatives: AlternativeSlot[];
}

export const INITIAL_BOOKING_STATE: BookingState = {
  step: "service",
  serviceIds: [],
  barberId: null,
  date: null,
  startAt: null,
  endAt: null,
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerNote: "",
  appointmentId: null,
  holdExpiresAt: null,
  holdSeconds: null,
  confirmed: null,
  slotError: null,
  alternatives: [],
};

export const STORAGE_KEY = "yd-booking-state";
