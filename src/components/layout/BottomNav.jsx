import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Crosshair, Radio, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/home', icon: Crosshair, label: 'Radar' },
  { to: '/broadcast', icon: Radio, label: 'Signal' },
  { to: '/messages', icon: MessageSquare, label: 'Comms' },
  { to: '/profile', icon: User, label: 'Rider' },
];

/**
 * BottomNav — Floating dock-style tab bar for primary navigation.
 *
 * Features:
 * - 4 primary tabs: Radar, Signal, Comms, Rider
 * - Active tab highlighted with neon green glow and slight scale-up
 * - Inactive tabs shown in muted gray
 * - Fixed to bottom with iOS safe-area inset support (pb-safe)
 * - Glassmorphism surface with rounded corners
 *
 * @param {boolean} [isOverlay=false] — When true, uses more transparent bg for overlay mode
 * @returns {JSX.Element}
 */
const BottomNav = memo(function BottomNav({ isOverlay = false }) {
  const { pathname } = useLocation();
  const isRadar = pathname === '/home';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none"
      aria-label="Main navigation"
    >
      <div className={cn('mx-auto flex justify-center px-4 pb-3 pt-2', isRadar ? 'max-w-[1180px]' : 'max-w-2xl')}>
        <div
          className={cn(
            'pointer-events-auto flex items-center gap-1 rounded-2xl px-3 py-2',
            isOverlay
              ? 'bg-black/60 backdrop-blur-xl border border-white/10'
              : 'bg-background/90 backdrop-blur-lg border border-primary/20',
            'shadow-[0_12px_40px_rgba(0,0,0,0.65)]'
          )}
          role="tablist"
        >
          {TABS.map((tab) => {
            const isActive =
              pathname === tab.to ||
              (tab.to !== '/home' && pathname.startsWith(tab.to));
            const Icon = tab.icon;

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 rounded-xl min-w-[64px] min-h-[52px] px-3 transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'active:scale-95',
                  isActive
                    ? 'bg-primary/[0.13] text-primary scale-105'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Active glow dot */}
                {isActive && (
                  <span className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary animate-pulse-green shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
                )}

                <Icon
                  className={cn(
                    'h-[22px] w-[22px] transition-all duration-200',
                    isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.55)]'
                  )}
                  strokeWidth={isActive ? 2.6 : 2}
                  aria-hidden="true"
                />

                <span
                  className={cn(
                    'text-[9px] tracking-[0.12em] font-bold uppercase transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {tab.label}
                </span>

                {/* Active pill border glow */}
                {isActive && (
                  <span className="absolute inset-0 rounded-xl border border-primary/20 pointer-events-none shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]" />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
});

export default BottomNav;
