"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { uploadGalleryImage } from "@/app/giris/(protected)/gorseller/actions";
import { MAX_GALLERY_IMAGE_BYTES } from "@/lib/gallery-constants";

const PLACEMENT_OPTIONS = [
  { key: "showGallery", label: "Galeri" },
  { key: "showAbout", label: "Hakkımızda" },
] as const;

export function GalleryUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Default: new photos show everywhere, same as before per-image
  // placement existed — narrowing it down afterwards is a click away on
  // each card, not something every upload has to think about. Ana Sayfa
  // isn't an option here at all — the homepage's "Çalışmalarımız" section
  // is a code-only drop-in (public/calismalarimiz/), not admin-uploadable.
  const [placements, setPlacements] = useState({ showGallery: true, showAbout: true });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    // Sequential on purpose — parallel uploads racing to the same bucket
    // don't gain much for a handful of phone photos, and sequential keeps
    // the toasts (and any failure) attributable to one file at a time.
    let succeeded = 0;
    for (const file of Array.from(files)) {
      // Fail fast on an oversized file instead of waiting on a round trip
      // that a body-size limit would kill anyway with no useful message.
      if (file.size > MAX_GALLERY_IMAGE_BYTES) {
        toast.error(`${file.name}: Görsel çok büyük — en fazla ${Math.floor(MAX_GALLERY_IMAGE_BYTES / (1024 * 1024))}MB olabilir.`);
        continue;
      }

      const formData = new FormData();
      formData.set("file", file);
      if (placements.showGallery) formData.set("showGallery", "on");
      if (placements.showAbout) formData.set("showAbout", "on");

      try {
        const result = await uploadGalleryImage(formData);
        if (result.ok) {
          succeeded++;
        } else {
          toast.error(`${file.name}: ${result.error ?? "Yüklenemedi."}`);
        }
      } catch {
        // A thrown error here (network drop, a stale deploy's Server
        // Action id no longer existing, etc.) must never leave the button
        // stuck on "Yükleniyor…" with no explanation — that's the bug
        // that made this look like it silently hung.
        toast.error(`${file.name}: Bağlantı hatası — tekrar deneyin.`);
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (succeeded > 0) toast.success(succeeded === 1 ? "Görsel yüklendi." : `${succeeded} görsel yüklendi.`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {PLACEMENT_OPTIONS.map((opt) => (
          <label key={opt.key} className="flex items-center gap-2 text-xs text-ash">
            <Checkbox
              checked={placements[opt.key]}
              onCheckedChange={(checked) => setPlacements((prev) => ({ ...prev, [opt.key]: checked === true }))}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button type="button" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        <Upload className="size-3.5" /> {uploading ? "Yükleniyor…" : "Görsel Yükle"}
      </Button>
    </div>
  );
}
