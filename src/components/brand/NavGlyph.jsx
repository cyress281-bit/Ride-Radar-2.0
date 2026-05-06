import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Memoized navigation glyph - renders 4 times per tab bar, only the active state
 * changes on navigation. Prevents all 4 icons from re-rendering when Layout
 * re-renders due to route change (only active/inactive icons need update).
 */
const NavGlyph = memo(function NavGlyph({ icon: Icon, active, className }) {
  return (
    <div className={cn(
      'relative h-9 w-9 rounded-2xl border flex items-center justify-center overflow-hidden transition-all duration-200',
      active
        ? 'border-primary/40 bg-primary/10 text-primary shadow-[0_0_24px_hsl(var(--primary)/0.22),inset_0_1px_0_hsl(0_0%_100%/0.08)]'
        : 'border-border/50 bg-black/25 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20',
      className
    )}>
      <span className="absolute inset-x-2 top-1 h-px bg-current/25" />
      <span className="absolute left-1.5 top-1.5 h-1 w-3 rounded-full bg-current/20" />
      <span className={cn('absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full', active ? 'bg-primary animate-pulse' : 'bg-muted-foreground/35')} />
      <span className="absolute -left-4 top-1/2 h-px w-12 -rotate-45 bg-current/25" />
      <span className="absolute -right-5 top-3 h-px w-12 rotate-12 bg-current/15" />
      <span className={cn('absolute inset-2 rounded-full border border-current/10', active && 'animate-pulse')} />
      <Icon className="relative z-10 h-[19px] w-[19px] drop-shadow-[0_0_5px_currentColor]" strokeWidth={active ? 2.55 : 2.2} />
    </div>
  );
});

export default NavGlyph;