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
        'w-full rounded-[20px] border border-border bg-surface p-4 text-left backdrop-blur-md transition',
        'hover:border-primary/30 hover:bg-foreground/[0.07] focus:outline-none focus:ring-2 focus:ring-primary/40',
        'rr-haptic',
        'border-t-2',
        ACCENT_MAP[title] || 'border-t-primary',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        {trend && (
          <span className="text-xs font-medium text-success">{trend}</span>
        )}
      </div>
      <div className="mt-3 font-display text-2xl font-bold sm:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{title}</div>
    </button>
  );
}
