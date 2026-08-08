"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteBlockedTime } from "@/app/admin/(protected)/engellenen-saatler/actions";

export function BlockedTimeDeleteButton({ id }: { id: string }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteBlockedTime(id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error ?? "Silinemedi.");
      return;
    }
    toast.success("Engelleme kaldırıldı.");
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={deleting} aria-label="Engellemeyi kaldır">
      <Trash2 className="size-4" />
    </Button>
  );
}
