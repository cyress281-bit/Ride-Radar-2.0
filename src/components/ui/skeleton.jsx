import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    (<div
      className={cn("animate-pulse rounded-xl bg-primary/[0.08] shadow-[inset_0_0_20px_rgba(57,255,20,0.04)]", className)}
      {...props} />)
  );
}

export { Skeleton }
