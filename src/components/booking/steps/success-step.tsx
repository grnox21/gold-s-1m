"use client";

import Link from "next/link";
import { CalendarPlus, CheckCircle2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatIstanbulDateLong, formatIstanbulTime } from "@/lib/booking/time";
import { formatTL } from "@/lib/format";
import { buildIcsDataUrl } from "@/lib/booking/ics";
import { waLink } from "@/lib/booking/phone";
import type { ConfirmedBooking } from "../types";

export function SuccessStep({ booking, onRestart }: { booking: ConfirmedBooking; onRestart: () => void }) {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const serviceLine = booking.serviceNames.join(" + ");

  const shareText = [
    `Merhaba ${booking.customerName},`,
    "",
    "Yusuf Demir Erkek Kuaförü randevunuz başarıyla oluşturuldu.",
    "",
    `✂️ Hizmet: ${serviceLine}`,
    `💈 Berber: ${booking.barberName}`,
    `📅 Tarih: ${formatIstanbulDateLong(start)}`,
    `⏰ Saat: ${formatIstanbulTime(start)}`,
    "",
    "Görüşmek üzere.",
  ].join("\n");

  const icsHref = buildIcsDataUrl({
    title: `Yusuf Demir Erkek Kuaförü — ${serviceLine}`,
    description: `Berber: ${booking.barberName}\nHizmet(ler): ${serviceLine}`,
    location: "Yusuf Demir Erkek Kuaförü",
    startAt: start,
    endAt: end,
  });

  return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto size-12 text-gold" strokeWidth={1.2} />
      <h1 className="mt-6 font-display text-3xl text-warm-white sm:text-4xl">Randevunuz Başarıyla Oluşturuldu</h1>
      <p className="mt-3 text-sm text-ash">Görüşmek üzere, {booking.customerName}.</p>

      <div className="mx-auto mt-10 max-w-md divide-y divide-border rounded-md border border-border bg-surface text-left">
        <Row label="Berber" value={booking.barberName} />
        <Row label="Hizmet(ler)" value={serviceLine} />
        <Row label="Tarih" value={formatIstanbulDateLong(start)} />
        <Row label="Saat" value={`${formatIstanbulTime(start)} – ${formatIstanbulTime(end)}`} />
        <Row label="Süre" value={`${booking.totalDurationMinutes} dakika`} />
        <Row label="Toplam" value={formatTL(booking.totalPrice)} valueClassName="text-gold-bright text-lg" />
      </div>

      <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline" size="lg" className="flex-1">
          <a href={waLink("", shareText)} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" /> WhatsApp ile Paylaş
          </a>
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <a href={icsHref} download="randevu.ics">
            <CalendarPlus className="size-4" /> Takvime Ekle
          </a>
        </Button>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Button asChild size="lg">
          <Link href="/">Ana Sayfaya Dön</Link>
        </Button>
        <button type="button" onClick={onRestart} className="label-caps text-[0.62rem] text-ash hover:text-gold">
          Yeni Bir Randevu Oluştur
        </button>
      </div>
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
