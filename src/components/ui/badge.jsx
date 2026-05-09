import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.35)] hover:bg-primary/85",
        secondary:
          "border-primary/15 bg-primary/[0.08] text-primary hover:bg-primary/[0.14]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-[0_0_16px_hsl(var(--destructive)/0.35)] hover:bg-destructive/85",
        outline: "border-primary/25 text-primary hover:bg-primary/[0.08]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
