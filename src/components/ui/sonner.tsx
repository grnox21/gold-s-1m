"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-surface! text-foreground! border-border! shadow-lift! rounded-md! font-sans!",
          description: "text-muted!",
          actionButton: "bg-accent! text-accent-foreground!",
          cancelButton: "bg-surface-raised! text-muted!",
        },
      }}
      {...props}
    />
  );
}
