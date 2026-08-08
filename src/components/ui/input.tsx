import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-sm border border-border-strong bg-surface px-4 text-sm text-foreground placeholder:text-muted transition-colors outline-none",
        "focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "aria-invalid:border-danger aria-invalid:ring-danger",
        className
      )}
      {...props}
    />
  );
}

export { Input };
