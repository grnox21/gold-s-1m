"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { dateStringFromInstant } from "@/lib/booking/time";
import { adminRescheduleAppointment } from "@/app/admin/(protected)/randevular/actions";
import type { Appointment, Barber } from "@/types/database";

interface Slot {
  startAt: string;
  label: string;
}

export function RescheduleDialog({
  appointment,
  barbers,
  open,
  onOpenChange,
}: {
  appointment: Appointment;
  barbers: Barber[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [barberId, setBarberId] = useState(appointment.barber_id);
  const [date, setDate] = useState(dateStringFromInstant(new Date(appointment.start_at)));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Radix keeps this component mounted across open/close (no unmount to
  // reset state for free), so re-syncing local state to the row's current
  // appointment each time the dialog reopens is a deliberate sync with
  // that external open/closed lifecycle, not a computation that belongs
  // in render.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBarberId(appointment.barber_id);
    setDate(dateStringFromInstant(new Date(appointment.start_at)));
    setSelected(null);
  }, [open, appointment]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberId,
        date,
        durationMinutes: appointment.total_duration_minutes,
        excludeAppointmentId: appointment.id,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setSlots(data.isOpen ? data.slots : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, barberId, date, appointment.id, appointment.total_duration_minutes]);

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    const result = await adminRescheduleAppointment({
      appointmentId: appointment.id,
      newStartAt: selected,
      newBarberId: barberId !== appointment.barber_id ? barberId : undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error ?? "Yeniden planlanamadı.");
      return;
    }
    toast.success("Randevu yeniden planlandı.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Randevuyu Yeniden Planla</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Berber</Label>
            <Select value={barberId} onValueChange={setBarberId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reschedule-date">Tarih</Label>
            <Input id="reschedule-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Saat</Label>
            {loading ? (
              <p className="text-sm text-ash">Yükleniyor…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-ash">Bu tarihte uygun saat yok.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.startAt}
                    type="button"
                    onClick={() => setSelected(slot.startAt)}
                    className={cn(
                      "tnum h-10 rounded-sm border text-sm transition-colors",
                      selected === slot.startAt ? "border-gold bg-gold text-ink" : "border-border-strong text-warm-white hover:border-gold/50"
                    )}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!selected || submitting}>
            {submitting ? "Kaydediliyor…" : "Yeniden Planla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
