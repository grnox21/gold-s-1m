"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { todayIstanbul } from "@/lib/booking/time";
import { StepNav } from "../step-nav";

const WEEKDAY_LABELS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const MAX_DAYS_AHEAD = 60;

function toDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00+03:00`);
}
function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function DateStep({
  date,
  onBack,
  onNext,
}: {
  date: string | null;
  onBack: () => void;
  onNext: (date: string) => void;
}) {
  const today = todayIstanbul();
  const [selected, setSelected] = useState<string | null>(date);
  const [monthCursor, setMonthCursor] = useState(() => {
    const base = toDate(date ?? today);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const maxDate = useMemo(() => {
    const d = toDate(today);
    d.setDate(d.getDate() + MAX_DAYS_AHEAD);
    return d;
  }, [today]);

  const days = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    // JS getDay(): 0=Sun..6=Sat. We want a Monday-first grid.
    const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [monthCursor]);

  const monthLabel = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(monthCursor);

  return (
    <div>
      <h1 className="font-display text-2xl text-warm-white sm:text-3xl">Tarih seçin</h1>
      <p className="mt-2 text-sm text-ash">Seçtiğiniz tarihte uygun saatleri bir sonraki adımda göreceksiniz.</p>

      <div className="mt-8 rounded-md border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Önceki ay"
            onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            disabled={monthCursor.getFullYear() === toDate(today).getFullYear() && monthCursor.getMonth() === toDate(today).getMonth()}
            className="flex size-8 items-center justify-center rounded-full text-ash transition-colors hover:text-gold disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="label-caps text-[0.68rem] text-warm-white">{monthLabel}</p>
          <button
            type="button"
            aria-label="Sonraki ay"
            onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            disabled={monthCursor.getFullYear() === maxDate.getFullYear() && monthCursor.getMonth() === maxDate.getMonth()}
            className="flex size-8 items-center justify-center rounded-full text-ash transition-colors hover:text-gold disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="label-caps py-2 text-[0.58rem] text-ash">
              {w}
            </span>
          ))}
          {days.map((day, i) => {
            if (!day) return <span key={`blank-${i}`} />;
            const dateStr = toDateStr(day);
            const isPast = dateStr < today;
            const isTooFar = dateStr > toDateStr(maxDate);
            const disabled = isPast || isTooFar;
            const isSelected = dateStr === selected;
            const isToday = dateStr === today;
            return (
              <button
                key={dateStr}
                type="button"
                disabled={disabled}
                onClick={() => setSelected(dateStr)}
                className={cn(
                  "tnum flex aspect-square items-center justify-center rounded-sm text-sm transition-colors",
                  disabled && "text-ash/30",
                  !disabled && !isSelected && "text-warm-white hover:bg-surface-raised",
                  isSelected && "bg-gold text-ink",
                  isToday && !isSelected && "border border-gold/50 text-gold"
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <StepNav onBack={onBack} nextDisabled={!selected} onNext={() => selected && onNext(selected)} />
    </div>
  );
}
