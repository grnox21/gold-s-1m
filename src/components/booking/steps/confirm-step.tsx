"use client";

import { useEffect, useState } from "react";

import type { PublicBarber, PublicService } from "@/lib/booking/public-types";
import { formatIstanbulDateLong, formatIstanbulTime } from "@/lib/booking/time";
import { formatTL } from "@/lib/format";
import { confirmBooking } from "../api";
import { StepNav } from "../step-nav";
import type { ConfirmedBooking } from "../types";

function useCountdown(targetIso: string | null) {
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    targetIso ? new Date(targetIso).getTime() - Date.now() : 0
  );

  useEffect(() => {
    if (!targetIso) return;
    const id = setInterval(() => {
      setRemainingMs(new Date(targetIso).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return remainingMs;
}

export function ConfirmStep({
  appointmentId,
  holdExpiresAt,
  startAt,
  endAt,
  totalDurationMinutes,
  totalPrice,
  barber,
  services,
  customerName,
  onBack,
  onExpired,
  onConfirmed,
  onError,
}: {
  appointmentId: string;
  holdExpiresAt: string;
  startAt: string;
  endAt: string;
  totalDurationMinutes: number;
  totalPrice: number;
  barber: PublicBarber | null;
  services: PublicService[];
  customerName: string;
  onBack: () => void;
  onExpired: () => void;
  onConfirmed: (booking: ConfirmedBooking) => void;
  onError: (message: string, alternatives: { startAt: string; endAt: string; label: string }[]) => void;
}) {
  const remainingMs = useCountdown(holdExpiresAt);
  const [submitting, setSubmitting] = useState(false);
  const expired = remainingMs <= 0;

  useEffect(() => {
    if (expired) onExpired();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  const minutes = Math.max(0, Math.floor(remainingMs / 60000));
  const seconds = Math.max(0, Math.floor((remainingMs % 60000) / 1000));

  async function handleConfirm() {
    setSubmitting(true);
    const result = await confirmBooking(appointmentId);
    setSubmitting(false);

    if (!result.ok) {
      onError(result.data.error, result.data.alternatives ?? []);
      return;
    }

    onConfirmed({
      appointmentId: result.data.appointment.id,
      barberName: result.data.barber?.name ?? barber?.name ?? "",
      serviceNames: result.data.services.map((s) => s.name),
      startAt: result.data.appointment.startAt,
      endAt: result.data.appointment.endAt,
      totalDurationMinutes: result.data.appointment.totalDurationMinutes,
      totalPrice: result.data.appointment.totalPrice,
      customerName: result.data.appointment.customerName,
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-warm-white sm:text-3xl">Randevunuzu onaylayın</h1>
        {!expired && (
          <p className="tnum label-caps rounded-full border border-gold/40 px-4 py-1.5 text-[0.68rem] text-gold-bright">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")} — randevunuz sizin için tutuluyor
          </p>
        )}
      </div>

      <div className="mt-8 divide-y divide-border rounded-md border border-border bg-surface">
        <Row label="Berber" value={barber?.name ?? "—"} />
        <Row label="Hizmet(ler)" value={services.map((s) => s.name).join(" + ")} />
        <Row label="Tarih" value={formatIstanbulDateLong(new Date(startAt))} />
        <Row label="Saat" value={`${formatIstanbulTime(new Date(startAt))} – ${formatIstanbulTime(new Date(endAt))}`} />
        <Row label="Süre" value={`${totalDurationMinutes} dakika`} />
        <Row label="Ad Soyad" value={customerName} />
        <Row label="Toplam" value={formatTL(totalPrice)} valueClassName="text-gold-bright text-lg" />
      </div>

      <StepNav onBack={onBack} nextLabel="Randevuyu Onayla" nextLoading={submitting} nextDisabled={expired} onNext={handleConfirm} />
    </div>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="label-caps text-[0.62rem] text-ash">{label}</span>
      <span className={`text-right text-sm text-warm-white ${valueClassName ?? ""}`}>{value}</span>
    </div>
  );
}
