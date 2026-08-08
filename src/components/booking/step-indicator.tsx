import { cn } from "@/lib/utils";
import { STEP_LABELS, STEP_ORDER, type BookingStep } from "./types";

const VISIBLE_STEPS: BookingStep[] = STEP_ORDER.filter((s) => s !== "success");

export function StepIndicator({ current }: { current: BookingStep }) {
  const currentIndex = VISIBLE_STEPS.indexOf(current);

  return (
    <ol className="flex items-center justify-between gap-1 sm:gap-2">
      {VISIBLE_STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <li key={step} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-2.5">
              <span
                className={cn(
                  "tnum flex size-7 shrink-0 items-center justify-center rounded-full border text-[0.7rem] transition-colors sm:size-8",
                  isActive && "border-gold bg-gold text-ink",
                  isDone && "border-gold/50 bg-transparent text-gold",
                  !isActive && !isDone && "border-border-strong text-ash"
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "label-caps hidden text-[0.6rem] sm:block",
                  isActive ? "text-warm-white" : "text-ash"
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < VISIBLE_STEPS.length - 1 && (
              <span className={cn("h-px flex-1", isDone ? "bg-gold/50" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
