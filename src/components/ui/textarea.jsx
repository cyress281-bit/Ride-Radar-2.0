import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-2xl border border-primary/[0.12] bg-foreground/[0.035] px-4 py-3 text-base shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055),0_12px_30px_hsl(var(--background)/0.22)] transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:bg-primary/[0.075] focus-visible:shadow-[0_0_0_2px_hsl(var(--primary)),0_0_20px_hsl(var(--primary)/0.3)] focus-visible:animate-[rr-neon-focus-pulse_1.8s_ease-in-out_infinite] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
