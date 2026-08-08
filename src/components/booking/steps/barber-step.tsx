"use client";

import { useState } from "react";

import type { PublicBarber } from "@/lib/booking/public-types";
import { cn } from "@/lib/utils";
import { StepNav } from "../step-nav";

export function BarberStep({
  barbers,
  selectedId,
  onBack,
  onNext,
}: {
  barbers: PublicBarber[];
  selectedId: string | null;
  onBack: () => void;
  onNext: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(selectedId);

  return (
    <div>
      <h1 className="font-display text-2xl text-warm-white sm:text-3xl">Berberinizi seçin</h1>
      <p className="mt-2 text-sm text-ash">Her berberin kendi uzmanlık alanı ve çalışma saatleri vardır.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {barbers.map((barber) => {
          const checked = selected === barber.id;
          return (
            <button
              type="button"
              key={barber.id}
              onClick={() => setSelected(barber.id)}
              className={cn(
                "flex flex-col items-center gap-4 rounded-md border p-6 text-center transition-colors",
                checked ? "border-gold/60 bg-gold/5" : "border-border bg-surface hover:border-border-strong"
              )}
            >
              <div className="flex size-16 items-center justify-center rounded-full bg-surface-raised">
                <span className="font-display text-2xl text-gold">{barber.name.charAt(0)}</span>
              </div>
              <div>
                <p className="font-display text-lg text-warm-white">{barber.name}</p>
                {barber.specialty && <p className="mt-1 text-xs text-gold-bright">{barber.specialty}</p>}
              </div>
            </button>
          );
        })}
      </div>

      <StepNav onBack={onBack} nextDisabled={!selected} onNext={() => selected && onNext(selected)} />
    </div>
  );
}
