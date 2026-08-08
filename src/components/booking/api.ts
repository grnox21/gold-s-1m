import type { AlternativeSlot } from "./types";

export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
  label: string;
}

export interface AvailabilityResponse {
  isOpen: boolean;
  closedReason: "no_barber" | "weekly_off" | "in_past" | null;
  totalDurationMinutes: number;
  slots: AvailabilitySlot[];
}

export async function fetchAvailability(params: {
  barberId: string;
  date: string;
  serviceIds: string[];
}): Promise<AvailabilityResponse> {
  const res = await fetch("/api/availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Uygun saatler alınamadı.");
  return res.json();
}

export interface HoldSuccess {
  appointmentId: string;
  holdExpiresAt: string;
  holdSeconds: number;
  startAt: string;
  endAt: string;
  totalDurationMinutes: number;
  totalPrice: number;
  barber: { id: string; name: string };
  services: { id: string; name: string; price: number; durationMinutes: number }[];
}

export interface HoldConflict {
  error: string;
  alternatives: AlternativeSlot[];
}

export async function createHold(params: {
  barberId: string;
  serviceIds: string[];
  startAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNote?: string;
}): Promise<{ ok: true; data: HoldSuccess } | { ok: false; status: number; data: HoldConflict }> {
  const res = await fetch("/api/booking/hold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, status: res.status, data };
  return { ok: true, data };
}

export interface ConfirmSuccess {
  appointment: {
    id: string;
    startAt: string;
    endAt: string;
    totalDurationMinutes: number;
    totalPrice: number;
    status: string;
    customerName: string;
  };
  barber: { id: string; name: string; whatsappNumber: string } | null;
  services: { name: string; price: number; durationMinutes: number }[];
}

export async function confirmBooking(
  appointmentId: string
): Promise<{ ok: true; data: ConfirmSuccess } | { ok: false; status: number; data: HoldConflict }> {
  const res = await fetch("/api/booking/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, status: res.status, data };
  return { ok: true, data };
}

export function releaseHold(appointmentId: string) {
  const body = JSON.stringify({ appointmentId });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/booking/release", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/booking/release", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(
    () => {}
  );
}
