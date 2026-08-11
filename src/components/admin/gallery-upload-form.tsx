"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadGalleryImage } from "@/app/giris/(protected)/gorseller/actions";

export function GalleryUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    // Sequential on purpose — parallel uploads racing to the same bucket
    // don't gain much for a handful of phone photos, and sequential keeps
    // the toasts (and any failure) attributable to one file at a time.
    let succeeded = 0;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadGalleryImage(formData);
      if (result.ok) {
        succeeded++;
      } else {
        toast.error(`${file.name}: ${result.error ?? "Yüklenemedi."}`);
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (succeeded > 0) toast.success(succeeded === 1 ? "Görsel yüklendi." : `${succeeded} görsel yüklendi.`);
  }

  return (
    <div>
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
