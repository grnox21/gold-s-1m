"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border-strong bg-surface-raised transition-colors outline-none",
        "focus-visible:ring-1 focus-visible:ring-accent data-[state=checked]:bg-accent data-[state=checked]:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4.5 translate-x-0.5 rounded-full bg-warm-white shadow-sm transition-transform",
          "data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-ink"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
