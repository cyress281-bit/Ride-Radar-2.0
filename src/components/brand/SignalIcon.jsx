import { ShieldAlert, Search, CalendarClock, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';

const styles = {
  solo_ride: {
    Icon: OfficialMotorcycleIcon,
    shell: 'border-solo/45 bg-black/80 text-solo shadow-[0_0_30px_hsl(var(--solo)/0.24)]',
    beam: 'bg-solo/45',
    dot: 'bg-solo',
  },
  iso: {
    Icon: Search,
    Accent: Wrench,
    shell: 'border-iso/45 bg-iso/10 text-iso shadow-[0_0_30px_hsl(var(--iso)/0.22)]',
    beam: 'bg-iso/45',
    dot: 'bg-iso',
  },
  event: {
    Icon: CalendarClock,
    shell: 'border-event/35 bg-event/10 text-event shadow-[0_0_24px_hsl(var(--event)/0.16)]',
    beam: 'bg-event/40',
    dot: 'bg-event',
  },
  alert: {
    Icon: ShieldAlert,
    shell: 'border-alert/40 bg-alert/10 text-alert shadow-[0_0_24px_hsl(var(--alert)/0.2)]',
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

  return (
    <div className={cn('relative shrink-0 border overflow-hidden flex items-center justify-center', sizes[size], config.shell, className)}>
      <div className="absolute inset-1 rounded-[inherit] border border-current/10" />
      <div className="absolute inset-3 rounded-full border border-current/10" />
      <div className={cn('absolute -left-5 top-1/2 h-px w-16 -rotate-45 opacity-60', config.beam)} />
      <div className={cn('absolute -right-6 top-3 h-px w-16 rotate-12 opacity-40', config.beam)} />
      <div className={cn('absolute left-2 bottom-2 h-px w-6 opacity-45', config.beam)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,hsl(0_0%_100%/0.18),transparent_34%)]" />
      {type === 'solo_ride' ? (
        <Icon className={cn('relative z-10 rounded-lg', size === 'sm' ? 'h-7 w-8' : size === 'lg' ? 'h-10 w-11' : 'h-8 w-9')} />
      ) : (
        <Icon className={cn('relative z-10 drop-shadow-[0_0_6px_currentColor]', iconSizes[size])} strokeWidth={2.45} />
      )}
      {Accent && <Accent className="absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-full bg-black/60 p-0.5 text-current" strokeWidth={2.5} />}
      <span className={cn('absolute right-2 bottom-2 h-1.5 w-1.5 rounded-full animate-pulse', config.dot)} />
    </div>
  );
}