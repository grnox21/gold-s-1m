import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap label-caps text-[0.72rem] transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground hover:bg-gold-bright",
        outline:
          "border border-border-strong text-foreground hover:border-accent hover:text-accent bg-transparent",
        ghost: "text-foreground hover:text-accent bg-transparent",
        subtle: "bg-surface-raised text-foreground hover:bg-charcoal-3",
        link: "text-accent underline-offset-4 hover:underline label-caps",
        destructive: "bg-danger text-warm-white hover:bg-danger/90",
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
