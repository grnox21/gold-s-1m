"use client";

import { useState } from "react";

import type { PublicService } from "@/lib/booking/public-types";
import { formatTL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { StepNav } from "../step-nav";

export function ServiceStep({
  services,
  selectedIds,
  onNext,
}: {
  services: PublicService[];
  selectedIds: string[];
  onNext: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(selectedIds);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectedServices = services.filter((s) => selected.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  return (
    <div>
      <h1 className="font-display text-2xl text-warm-white sm:text-3xl">Hangi hizmetleri istersiniz?</h1>
      <p className="mt-2 text-sm text-ash">Birden fazla hizmet seçebilirsiniz — süre ve ücret otomatik toplanır.</p>

      <div className="mt-8 space-y-3">
        {services.map((service) => {
          const checked = selected.includes(service.id);
          return (
            <label
              key={service.id}
              className={cn(
                "flex cursor-pointer items-start gap-4 rounded-md border p-5 transition-colors",
                checked ? "border-gold/60 bg-gold/5" : "border-border bg-surface hover:border-border-strong"
              )}
            >
              <Checkbox checked={checked} onCheckedChange={() => toggle(service.id)} className="mt-1" />
              <div className="flex flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="font-display text-lg text-warm-white">{service.name}</p>
                  {service.description && <p className="mt-1 text-sm text-ash">{service.description}</p>}
                  <p className="label-caps mt-2 text-[0.6rem] text-ash">{service.durationMinutes} dk</p>
                </div>
                <p className="tnum shrink-0 text-base text-gold-bright">{formatTL(service.price)}</p>
              </div>
            </label>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-md border border-border-strong bg-charcoal px-5 py-4">
          <div>
            <p className="label-caps text-[0.6rem] text-ash">
              {selected.length} hizmet · {totalDuration} dk
            </p>
          </div>
          <p className="tnum font-display text-xl text-gold-bright">{formatTL(totalPrice)}</p>
        </div>
      )}

      <StepNav hideBack nextDisabled={selected.length === 0} onNext={() => onNext(selected)} />
    </div>
  );
}
