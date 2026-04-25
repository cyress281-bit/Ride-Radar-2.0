import { ShieldAlert, Search, CalendarClock, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';

const styles = {
  solo_ride: {
    Icon: OfficialMotorcycleIcon,
    shell: 'border-solo/30 bg-solo/8 text-solo shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]',
    beam: 'bg-solo/45',
    dot: 'bg-solo',
  },
  iso: {
    Icon: Search,
    Accent: Wrench,
    shell: 'border-iso/30 bg-iso/8 text-iso shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]',
    beam: 'bg-iso/45',
    dot: 'bg-iso',
  },
  event: {
    Icon: CalendarClock,
    shell: 'border-event/30 bg-event/8 text-event shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]',
    beam: 'bg-event/40',
    dot: 'bg-event',
  },
  alert: {
    Icon: ShieldAlert,
    shell: 'border-alert/30 bg-alert/8 text-alert shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]',
    beam: 'bg-alert/45',
    dot: 'bg-alert',
  },
};

export default function SignalIcon({ type = 'solo_ride', size = 'md', className }) {
  const config = styles[type] || styles.solo_ride;
  const Icon = config.Icon;
  const Accent = config.Accent;
  const sizes = {
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl',
  };
  const iconSizes = { sm: 'w-5 h-5', md: 'w-6 h-6', lg: 'w-7 h-7' };
  const motorcycleSizes = { sm: 'h-7 w-8', md: 'h-8 w-9', lg: 'h-10 w-11' };

  return (
    <div className={cn('relative shrink-0 border overflow-hidden flex items-center justify-center', sizes[size], config.shell, className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,hsl(0_0%_100%/0.12),transparent_42%)]" />
      <div className="absolute inset-1 rounded-[inherit] border border-current/10" />
      {type === 'solo_ride' ? (
        <Icon className={cn('relative z-10', motorcycleSizes[size])} />
      ) : (
        <Icon className={cn('relative z-10', iconSizes[size])} strokeWidth={2.35} />
      )}
      {Accent && <Accent className="absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-full bg-background/75 p-0.5 text-current" strokeWidth={2.4} />}
    </div>
  );
}