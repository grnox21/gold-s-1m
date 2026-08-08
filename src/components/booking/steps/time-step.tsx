"use client";

import { useEffect, useState } from "react";
import { CalendarX2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { fetchAvailability, type AvailabilitySlot } from "../api";
import { StepNav } from "../step-nav";
import type { AlternativeSlot } from "../types";

const CLOSED_MESSAGES: Record<string, string> = {
  weekly_off: "Bu berber seçtiğiniz gün kapalı. Lütfen başka bir tarih seçin.",
  no_barber: "Bu berber şu anda uygun değil. Lütfen başka bir berber seçin.",
  in_past: "Seçilen hizmetler için bu gün uygun değil. Lütfen başka bir tarih seçin.",
};

export function TimeStep({
  barberId,
  serviceIds,
  date,
  externalError,
  externalAlternatives,
  onBack,
  onChangeDate,
  onNext,
}: {
  barberId: string;
  serviceIds: string[];
  date: string;
  externalError?: string | null;
  externalAlternatives?: AlternativeSlot[];
  onBack: () => void;
  onChangeDate: () => void;
  onNext: (startAt: string, endAt: string) => void;
}) {
  // Parent mounts a fresh <TimeStep key={...}> whenever barberId/date/
  // serviceIds change (see booking-wizard.tsx), so these initial values —
  // not an effect that resets them — are what "loading" looks like for a
  // new selection; the effect below only needs to report the fetch result.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selected, setSelected] = useState<AvailabilitySlot | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAvailability({ barberId, date, serviceIds })
      .then((res) => {
        if (cancelled) return;
        if (!res.isOpen) {
          setClosedReason(res.closedReason ?? "weekly_off");
          setSlots([]);
        } else {
          setSlots(res.slots);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Uygun saatler alınırken bir hata oluştu. Lütfen tekrar deneyin.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [barberId, date, serviceIds]);

  const dateLabel = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date(`${date}T12:00:00+03:00`));

  return (
    <div>
      <h1 className="font-display text-2xl text-warm-white sm:text-3xl">Saat seçin</h1>
      <p className="mt-2 text-sm text-ash">
        <span className="text-warm-white">{dateLabel}</span> için uygun saatler.{" "}
        <button type="button" onClick={onChangeDate} className="text-gold underline-offset-2 hover:underline">
          Tarihi değiştir
        </button>
      </p>

      {externalError && (
        <div className="mt-6 rounded-md border border-danger/30 bg-danger-soft px-5 py-4 text-sm text-warm-white">
          {externalError}
        </div>
      )}

      {externalAlternatives && externalAlternatives.length > 0 && (
        <div className="mt-4">
          <p className="label-caps mb-3 text-[0.62rem] text-ash">Bu hizmetler için uygun başka saatler</p>
          <div className="flex flex-wrap gap-2">
            {externalAlternatives.map((alt) => (
              <button
                key={alt.startAt}
                type="button"
                onClick={() => onNext(alt.startAt, alt.endAt)}
                className="tnum rounded-sm border border-gold/50 px-4 py-2 text-sm text-gold-bright transition-colors hover:bg-gold/10"
              >
                {alt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        {loading && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-sm bg-surface-raised" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong py-14 text-center">
            <CalendarX2 className="size-6 text-ash" strokeWidth={1.4} />
            <p className="max-w-xs text-sm text-ash">{error}</p>
          </div>
        )}

        {!loading && !error && closedReason && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong py-14 text-center">
            <CalendarX2 className="size-6 text-ash" strokeWidth={1.4} />
            <p className="max-w-xs text-sm text-ash">{CLOSED_MESSAGES[closedReason] ?? CLOSED_MESSAGES.weekly_off}</p>
            <button type="button" onClick={onChangeDate} className="label-caps text-[0.62rem] text-gold hover:underline">
              Başka Bir Tarih Seç
            </button>
          </div>
        )}

        {!loading && !error && !closedReason && slots.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong py-14 text-center">
            <CalendarX2 className="size-6 text-ash" strokeWidth={1.4} />
            <p className="max-w-xs text-sm text-ash">Bu tarihte uygun saat kalmadı. Lütfen başka bir tarih seçin.</p>
            <button type="button" onClick={onChangeDate} className="label-caps text-[0.62rem] text-gold hover:underline">
              Başka Bir Tarih Seç
            </button>
          </div>
        )}

        {!loading && !error && !closedReason && slots.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {slots.map((slot) => {
              const isSelected = selected?.startAt === slot.startAt;
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  onClick={() => setSelected(slot)}
                  className={cn(
                    "tnum h-11 rounded-sm border text-sm transition-colors",
                    isSelected
                      ? "border-gold bg-gold text-ink"
                      : "border-border-strong text-warm-white hover:border-gold/50"
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <StepNav onBack={onBack} nextDisabled={!selected} onNext={() => selected && onNext(selected.startAt, selected.endAt)} />
    </div>
  );
}
