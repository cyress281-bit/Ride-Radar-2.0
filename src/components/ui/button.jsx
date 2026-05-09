import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "rr-haptic inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold tracking-normal transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/0.22),inset_0_1px_0_hsl(0_0%_100%/0.28)] hover:bg-primary/90 hover:shadow-[0_0_28px_hsl(var(--primary)/0.38)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_16px_38px_hsl(var(--destructive)/0.18)] hover:bg-destructive/90",
        outline:
          "rr-glass-border bg-white/[0.035] text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055),0_14px_34px_rgba(0,0,0,0.28)] hover:bg-primary/[0.07] hover:text-primary hover:border-primary/25",
        secondary:
          "bg-white/[0.06] text-secondary-foreground shadow-[0_12px_28px_rgba(0,0,0,0.22)] hover:bg-white/[0.09]",
        ghost: "hover:bg-primary/[0.07] hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5 py-3",
        sm: "h-10 px-4 text-xs",
        lg: "h-14 px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
