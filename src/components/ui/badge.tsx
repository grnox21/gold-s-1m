import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 label-caps text-[0.62rem] w-fit whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-surface-raised text-foreground border border-border",
        gold: "bg-gold/12 text-gold-bright border border-gold/30",
        success: "bg-success-soft text-success border border-success/30",
        warning: "bg-warning-soft text-warning border border-warning/30",
        danger: "bg-danger-soft text-danger border border-danger/30",
        info: "bg-info-soft text-info border border-info/30",
        outline: "border border-border-strong text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
