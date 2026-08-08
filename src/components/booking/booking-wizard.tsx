"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { PublicBarber, PublicService } from "@/lib/booking/public-types";
import { StepIndicator } from "./step-indicator";
import { ServiceStep } from "./steps/service-step";
import { BarberStep } from "./steps/barber-step";
import { DateStep } from "./steps/date-step";
import { TimeStep } from "./steps/time-step";
import { DetailsStep } from "./steps/details-step";
import { ConfirmStep } from "./steps/confirm-step";
import { SuccessStep } from "./steps/success-step";
import { createHold, releaseHold } from "./api";
import { INITIAL_BOOKING_STATE, STORAGE_KEY, type BookingState, type BookingStep } from "./types";
import type { bookingDetailsSchema } from "@/lib/validations/booking";
import type { z } from "zod";

type DetailsFormValues = z.infer<typeof bookingDetailsSchema>;

export function BookingWizard({ barbers, services }: { barbers: PublicBarber[]; services: PublicService[] }) {
  const [state, setState] = useState<BookingState>(INITIAL_BOOKING_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [submittingHold, setSubmittingHold] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Hydrates from sessionStorage after mount, deliberately — the server (and
  // the client's very first render, to match it) always renders
  // INITIAL_BOOKING_STATE, then this effect upgrades to whatever the browser
  // has stored. Doing it any earlier (e.g. a lazy useState initializer)
  // would read sessionStorage during the server render too and either throw
  // (no `sessionStorage` on the server) or, if guarded, produce a
  // server/client markup mismatch on the very first paint.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BookingState;
        if (parsed.step !== "success") {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above this effect
          setState({ ...INITIAL_BOOKING_STATE, ...parsed });
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable (private mode etc.) — booking still works, just won't survive a refresh
    }
  }, [state, hydrated]);

  // Best-effort: release an active hold if the tab is closed mid-flow.
  useEffect(() => {
    function handleUnload() {
      const s = stateRef.current;
      if (s.appointmentId && s.step === "confirm") releaseHold(s.appointmentId);
    }
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, []);

  const patch = useCallback((partial: Partial<BookingState>) => setState((s) => ({ ...s, ...partial })), []);
  const goTo = useCallback((step: BookingStep) => patch({ step }), [patch]);

  const attemptHold = useCallback(
    async (startAt: string, endAt: string, details: { customerName: string; customerPhone: string; customerEmail?: string; customerNote?: string }) => {
      setSubmittingHold(true);
      const result = await createHold({
        barberId: stateRef.current.barberId!,
        serviceIds: stateRef.current.serviceIds,
        startAt,
        ...details,
      });
      setSubmittingHold(false);

      if (!result.ok) {
        toast.error(result.data.error);
        patch({
          step: "time",
          startAt: null,
          endAt: null,
          slotError: result.data.error,
          alternatives: result.data.alternatives ?? [],
        });
        return;
      }

      patch({
        step: "confirm",
        startAt: result.data.startAt,
        endAt: result.data.endAt,
        appointmentId: result.data.appointmentId,
        holdExpiresAt: result.data.holdExpiresAt,
        holdSeconds: result.data.holdSeconds,
        slotError: null,
        alternatives: [],
      });
    },
    [patch]
  );

  function handleTimeNext(startAt: string, endAt: string) {
    // Coming back from a lost-slot conflict (details already collected) —
    // retry immediately instead of asking the customer to re-type everything.
    if (state.customerPhone) {
      patch({ startAt, endAt });
      void attemptHold(startAt, endAt, {
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        customerEmail: state.customerEmail || undefined,
        customerNote: state.customerNote || undefined,
      });
      return;
    }
    patch({ startAt, endAt, step: "details" });
  }

  function handleDetailsSubmit(values: DetailsFormValues) {
    patch({
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      customerEmail: values.customerEmail ?? "",
      customerNote: values.customerNote ?? "",
    });
    void attemptHold(state.startAt!, state.endAt!, values);
  }

  function restart() {
    if (state.appointmentId && state.step === "confirm") releaseHold(state.appointmentId);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setState(INITIAL_BOOKING_STATE);
  }

  function handleBackFromConfirm() {
    if (state.appointmentId) releaseHold(state.appointmentId);
    patch({ appointmentId: null, holdExpiresAt: null, step: "time" });
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-6 lg:px-0">
        <div className="h-64 animate-pulse rounded-md bg-surface" />
      </div>
    );
  }

  const selectedServices = services.filter((s) => state.serviceIds.includes(s.id));
  const selectedBarber = barbers.find((b) => b.id === state.barberId) ?? null;

  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-0">
      {state.step !== "success" && (
        <div className="mb-12">
          <StepIndicator current={state.step} />
        </div>
      )}

      {state.step === "service" && (
        <ServiceStep services={services} selectedIds={state.serviceIds} onNext={(ids) => patch({ serviceIds: ids, step: "barber" })} />
      )}

      {state.step === "barber" && (
        <BarberStep
          barbers={barbers}
          selectedId={state.barberId}
          onBack={() => goTo("service")}
          onNext={(id) => patch({ barberId: id, step: "date" })}
        />
      )}

      {state.step === "date" && (
        <DateStep date={state.date} onBack={() => goTo("barber")} onNext={(date) => patch({ date, step: "time" })} />
      )}

      {state.step === "time" && selectedBarber && state.date && (
        <TimeStep
          key={`${selectedBarber.id}|${state.date}|${state.serviceIds.join(",")}`}
          barberId={selectedBarber.id}
          serviceIds={state.serviceIds}
          date={state.date}
          externalError={state.slotError}
          externalAlternatives={state.alternatives}
          onBack={() => goTo("date")}
          onChangeDate={() => goTo("date")}
          onNext={handleTimeNext}
        />
      )}

      {state.step === "details" && (
        <DetailsStep
          defaultValues={{
            customerName: state.customerName,
            customerPhone: state.customerPhone,
            customerEmail: state.customerEmail,
            customerNote: state.customerNote,
          }}
          submitting={submittingHold}
          onBack={() => goTo("time")}
          onSubmit={handleDetailsSubmit}
        />
      )}

      {state.step === "confirm" && state.appointmentId && state.holdExpiresAt && state.startAt && state.endAt && (
        <ConfirmStep
          appointmentId={state.appointmentId}
          holdExpiresAt={state.holdExpiresAt}
          startAt={state.startAt}
          endAt={state.endAt}
          totalDurationMinutes={selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)}
          totalPrice={selectedServices.reduce((sum, s) => sum + s.price, 0)}
          barber={selectedBarber}
          services={selectedServices}
          customerName={state.customerName}
          onBack={handleBackFromConfirm}
          onExpired={() => {
            toast.error("Randevu için ayrılan süre doldu. Lütfen tekrar seçim yapın.");
            patch({ appointmentId: null, holdExpiresAt: null, step: "time", startAt: null, endAt: null });
          }}
          onError={(message, alternatives) => {
            toast.error(message);
            patch({
              step: "time",
              appointmentId: null,
              holdExpiresAt: null,
              startAt: null,
              endAt: null,
              slotError: message,
              alternatives,
            });
          }}
          onConfirmed={(booking) => patch({ step: "success", confirmed: booking })}
        />
      )}

      {state.step === "success" && state.confirmed && <SuccessStep booking={state.confirmed} onRestart={restart} />}
    </div>
  );
}
