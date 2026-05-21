import { cn } from '@/lib/utils.js';

const ACCENT_MAP = {
  'Total Users': 'border-t-brand-kawasaki',
  'Active Broadcasts': 'border-t-brand-yamaha',
  'Pending Reports': 'border-t-brand-honda',
  "Today's Connections": 'border-t-brand-ducati',
  'Active Conversations': 'border-t-brand-kawasaki',
  'User Blocks': 'border-t-brand-honda',
  'Deletion Requests': 'border-t-brand-honda',
  'Announcements': 'border-t-brand-yamaha',
  'Analytics': 'border-t-brand-ducati',
  'Compliance': 'border-t-brand-kawasaki',
  'Monitoring': 'border-t-brand-yamaha',
};

/**
 * Reusable metric card with glassmorphism styling.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string|number} props.value
 * @param {React.ComponentType<{className?: string}>} [props.icon]
 * @param {string} [props.trend]
 * @param {() => void} [props.onClick]
 * @param {string} [props.className]
 */
export default function AdminMetricCard({
  title,
  value,
  icon: Icon,
  trend,
  onClick,
  className,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/66 p-4 text-left backdrop-blur-xl transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:bg-black/72 hover:shadow-[0_18px_36px_rgba(0,0,0,0.32)]',
        'focus:outline-none focus:ring-2 focus:ring-primary/40',
        'rr-haptic',
        'border-t-2',
        ACCENT_MAP[title] || 'border-t-primary',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/[0.06] blur-3xl transition-opacity duration-200 group-hover:bg-primary/[0.1]" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.12)]">
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </div>
        {trend && (
          <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-success">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4 font-display text-[clamp(1.8rem,3.8vw,2.25rem)] font-bold leading-none tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/90">
        {title}
      </div>
    </button>
  );
}
