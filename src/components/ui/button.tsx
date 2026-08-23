import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // transform + shadow join the transition alongside the original colors —
  // a plain color swap on hover reads as static; lifting the button a
  // couple px (and settling back down on press, not just letting it snap)
  // is what makes the same interaction feel like it has actual weight.
  // Skipped for `link` (underlined text, not a button shape — a lift would
  // look like a bug) and disabled (must never look interactive).
  "inline-flex items-center justify-center gap-2 whitespace-nowrap label-caps text-[0.72rem] transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:duration-75 disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground shadow-[0_1px_0_rgba(0,0,0,0.2)] hover:bg-gold-bright hover:shadow-[0_10px_28px_-10px_rgba(201,162,75,0.65)] active:scale-[0.98]",
        outline:
          "border border-border-strong text-foreground hover:border-accent hover:text-accent hover:shadow-[0_8px_20px_-12px_rgba(201,162,75,0.4)] bg-transparent active:scale-[0.98]",
        ghost: "text-foreground hover:text-accent bg-transparent hover:-translate-y-px active:scale-[0.98]",
        subtle: "bg-surface-raised text-foreground hover:bg-charcoal-3 active:scale-[0.98]",
        link: "text-accent underline-offset-4 hover:underline label-caps hover:translate-y-0 active:translate-y-0",
        destructive: "bg-danger text-warm-white hover:bg-danger/90 active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-[0.66rem]",
        lg: "h-14 px-9 text-[0.78rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
