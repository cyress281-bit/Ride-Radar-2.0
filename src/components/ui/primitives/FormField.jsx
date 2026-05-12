import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

/**
 * FormField — Input with label, error, and helper text.
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.helper]
 * @param {React.ReactNode} [props.children] — Input element
 * @param {string} [props.className]
 */
export const FormField = React.forwardRef(function FormField(
  { label, error, helper, children, className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      {children}
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
      {!error && helper && (
        <p className="text-xs text-muted-foreground">{helper}</p>
      )}
    </div>
  )
})

/**
 * FormInput — Styled input for use inside FormField.
 */
export const FormInput = React.forwardRef(({ className, type, error, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl border bg-foreground/[0.035] px-4 py-3 text-base shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055),0_12px_30px_hsl(var(--background)/0.22)] transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-primary/[0.075] focus-visible:shadow-[0_0_0_2px_hsl(var(--primary)),0_0_20px_hsl(var(--primary)/0.3)] focus-visible:animate-[rr-neon-focus-pulse_1.8s_ease-in-out_infinite] disabled:cursor-not-allowed disabled:opacity-50",
        error
          ? "border-destructive/40 focus-visible:border-destructive focus-visible:shadow-[0_0_0_2px_hsl(var(--destructive)),0_0_20px_hsl(var(--destructive)/0.3)]"
          : "border-primary/[0.12] focus-visible:border-primary",
        className
      )}
      ref={ref}
      {...props} />
  );
})
FormInput.displayName = "FormInput"
