"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { todayIstanbul } from "@/lib/booking/time";
import { adminCreateAppointment } from "@/app/admin/(protected)/randevular/actions";
import type { Barber, Service } from "@/types/database";

interface Slot {
  startAt: string;
  label: string;
}

export function NewAppointmentDialog({ barbers, services }: { barbers: Barber[]; services: Service[] }) {
  const [open, setOpen] = useState(false);
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(todayIstanbul());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Availability depends on barber/date/service selection that all live in
  // this same dialog and change independently of any single form field, so
  // re-fetching (and resetting the stale slot list while that happens) is
  // synchronizing with the network, not something derivable at render time.
  useEffect(() => {
    if (!open || !barberId || serviceIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlots([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSelected(null);
    fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, date, serviceIds }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setSlots(data.isOpen ? data.slots : []);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, barberId, date, serviceIds.join(",")]);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    const result = await adminCreateAppointment({
      barberId,
      serviceIds,
      startAt: selected,
      customerName,
      customerPhone,
      customerEmail,
      customerNote,
      notify,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error ?? "Randevu oluşturulamadı.");
      return;
    }
    toast.success("Randevu oluşturuldu.");
    setOpen(false);
    setServiceIds([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerNote("");
    setSelected(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" /> Yeni Randevu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Randevu Oluştur</DialogTitle>
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
            <Label>Hizmetler</Label>
            <div className="space-y-2 rounded-sm border border-border-strong p-3">
              {services.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <Checkbox checked={serviceIds.includes(s.id)} onCheckedChange={() => toggleService(s.id)} />
                  {s.name} <span className="text-ash">· {s.duration_minutes} dk</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-appt-date">Tarih</Label>
            <Input id="new-appt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={todayIstanbul()} />
          </div>

          <div className="space-y-2">
            <Label>Saat</Label>
            {serviceIds.length === 0 ? (
              <p className="text-sm text-ash">Önce hizmet seçin.</p>
            ) : loadingSlots ? (
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

          <div className="space-y-2">
            <Label htmlFor="new-appt-name">Ad Soyad</Label>
            <Input id="new-appt-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-appt-phone">Telefon</Label>
            <Input id="new-appt-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-appt-email">E-posta (opsiyonel)</Label>
            <Input id="new-appt-email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-appt-note">Not (opsiyonel)</Label>
            <Textarea id="new-appt-note" value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-sm border border-border-strong px-4 py-3">
            <Label htmlFor="new-appt-notify" className="text-foreground normal-case tracking-normal text-sm">
              WhatsApp bildirimi gönder
            </Label>
            <Switch id="new-appt-notify" checked={notify} onCheckedChange={setNotify} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!selected || !customerName || !customerPhone || submitting}>
            {submitting ? "Oluşturuluyor…" : "Randevu Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
