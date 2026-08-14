"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { uploadGalleryImage } from "@/app/giris/(protected)/gorseller/actions";
import { MAX_GALLERY_IMAGE_BYTES, MAX_GALLERY_VIDEO_BYTES } from "@/lib/gallery-constants";

const PLACEMENT_OPTIONS = [
  { key: "showGallery", label: "Galeri" },
  { key: "showAbout", label: "Hakkımızda" },
] as const;

const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function GalleryUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Default: new photos show everywhere, same as before per-image
  // placement existed — narrowing it down afterwards is a click away on
  // each card, not something every upload has to think about. Ana Sayfa
  // isn't an option here at all — the homepage's "Çalışmalarımız" section
  // is a code-only drop-in (public/calismalarimiz/), not admin-uploadable.
  // A video always ends up Galeri-only regardless of these checkboxes —
  // the server refuses show_about for one no matter what's sent (see
  // uploadGalleryImage, lib/gallery-storage.ts) — so there's no separate
  // "video placement" UI here, just the hint text below the checkboxes.
  const [placements, setPlacements] = useState({ showGallery: true, showAbout: true });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    // Sequential on purpose — parallel uploads racing to the same bucket
    // don't gain much for a handful of phone photos/clips, and sequential
    // keeps the toasts (and any failure) attributable to one file at a time.
    let succeeded = 0;
    for (const file of Array.from(files)) {
      const isVideo = VIDEO_TYPES.has(file.type);
      const maxBytes = isVideo ? MAX_GALLERY_VIDEO_BYTES : MAX_GALLERY_IMAGE_BYTES;

      // Fail fast on an oversized file instead of waiting on a round trip
      // that a body-size limit would kill anyway with no useful message.
      if (file.size > maxBytes) {
        toast.error(`${file.name}: Dosya çok büyük — en fazla ${Math.floor(maxBytes / (1024 * 1024))}MB olabilir.`);
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
    if (succeeded > 0) toast.success(succeeded === 1 ? "Yüklendi." : `${succeeded} dosya yüklendi.`);
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
      <p className="text-[0.7rem] text-ash/70">Video yalnızca Galeri&apos;de gösterilir — Hakkımızda işaretli olsa bile.</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button type="button" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        <Upload className="size-3.5" /> {uploading ? "Yükleniyor…" : "Görsel / Video Yükle"}
      </Button>
    </div>
  );
}
