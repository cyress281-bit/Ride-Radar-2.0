import { cn } from '@/lib/utils';

export default function NavGlyph({ icon: Icon, active, className }) {
  return (
    <div className={cn(
      'relative h-9 w-9 rounded-2xl border flex items-center justify-center overflow-hidden transition-all duration-200',
      active
        ? 'border-primary/35 bg-primary/10 text-primary shadow-[0_0_22px_hsl(var(--primary)/0.18),inset_0_1px_0_hsl(0_0%_100%/0.08)]'
        : 'border-border/50 bg-black/20 text-muted-foreground group-hover:text-foreground group-hover:border-border',
      className
    )}>
      <span className="absolute inset-x-2 top-1 h-px bg-current/25" />
      <span className={cn('absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full', active ? 'bg-primary animate-pulse' : 'bg-muted-foreground/35')} />
      <span className="absolute -left-4 top-1/2 h-px w-12 -rotate-45 bg-current/20" />
      <Icon className="relative z-10 h-[19px] w-[19px]" strokeWidth={active ? 2.5 : 2.15} />
    </div>
  );
}