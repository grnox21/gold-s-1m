"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { WorkingHour } from "@/types/database";
import { saveWorkingHours, type WorkingHourRow } from "@/app/giris/(protected)/calisma-saatleri/actions";

const WEEKDAY_LABELS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

function buildRows(existing: WorkingHour[]): WorkingHourRow[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const found = existing.find((w) => w.weekday === weekday);
    return {
      weekday,
      isClosed: found?.is_closed ?? weekday === 0,
      startTime: found?.start_time?.slice(0, 5) ?? "09:00",
      endTime: found?.end_time?.slice(0, 5) ?? "20:00",
    };
  });
}

export function WorkingHoursEditor({ barberId, existing }: { barberId: string; existing: WorkingHour[] }) {
  const [rows, setRows] = useState<WorkingHourRow[]>(() => buildRows(existing));
  const [saving, setSaving] = useState(false);

  function updateRow(weekday: number, patch: Partial<WorkingHourRow>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveWorkingHours(barberId, rows);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error ?? "Kaydedilemedi.");
      return;
    }
    toast.success("Çalışma saatleri kaydedildi.");
  }

  return (
    <div>
      <div className="divide-y divide-border rounded-md border border-border">
        {rows.map((row) => (
          <div key={row.weekday} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className="w-28 shrink-0 text-sm text-warm-white">{WEEKDAY_LABELS[row.weekday]}</span>
            <div className="flex items-center gap-2">
              <Switch checked={!row.isClosed} onCheckedChange={(v) => updateRow(row.weekday, { isClosed: !v })} />
              <span className="label-caps text-[0.6rem] text-ash">{row.isClosed ? "Kapalı" : "Açık"}</span>
            </div>
            {!row.isClosed && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={row.startTime}
                  onChange={(e) => updateRow(row.weekday, { startTime: e.target.value })}
                  className="w-32"
                />
                <span className="text-ash">–</span>
                <Input
                  type="time"
                  value={row.endTime}
                  onChange={(e) => updateRow(row.weekday, { endTime: e.target.value })}
                  className="w-32"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <Button className="mt-6" onClick={handleSave} disabled={saving}>
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </div>
  );
}
