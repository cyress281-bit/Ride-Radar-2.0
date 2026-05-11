import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, PlusCircle, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/home', icon: Home, label: 'Home', isCreate: false },
  { to: '/broadcast', icon: PlusCircle, label: 'Create', isCreate: true },
  { to: '/messages', icon: MessageCircle, label: 'Messages', isCreate: false },
  { to: '/profile', icon: User, label: 'Profile', isCreate: false },
];

/**
 * BottomNav — Full-width native-app-style tab bar.
 *
 * Features:
 * - 4 primary tabs: Home, Create, Messages, Profile
 * - Active tab: filled icon, primary glow, scale-up, pill background
 * - Inactive tab: outline icon, muted gray
 * - Create tab: slightly larger icon, cyan accent when active
 * - Fixed to bottom with iOS safe-area inset support (pb-safe)
 * - Radar mode (/home): more transparent bg for map visibility
 *
 * @param {boolean} [isOverlay=false] — When true, uses more transparent bg for overlay mode
 * @returns {JSX.Element}
 */
const BottomNav = memo(function BottomNav({ isOverlay = false }) {
  const { pathname } = useLocation();
  const isRadar = pathname === '/home';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl select-none pointer-events-auto will-change-transform',
        isOverlay || isRadar
          ? 'bg-black/60 border-white/5'
          : 'bg-surface/95 border-border'
      )}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around h-16 pb-safe">
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
                'relative flex flex-col items-center justify-center gap-0.5',
                'min-h-[48px] min-w-[48px] px-3 py-1 rounded-xl',
                'transition-all duration-200 select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'active:scale-95 active:opacity-80',
                isActive
                  ? tab.isCreate
                    ? 'text-cyan scale-105'
                    : 'text-primary scale-105'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Active pill background */}
              {isActive && (
                <span
                  className={cn(
                    'absolute inset-0 rounded-xl pointer-events-none',
                    tab.isCreate ? 'bg-cyan/10' : 'bg-primary/10'
                  )}
                />
              )}

              <Icon
                className={cn(
                  'transition-all duration-200',
                  tab.isCreate ? 'h-[26px] w-[26px]' : 'h-6 w-6',
                  isActive &&
                    (tab.isCreate
                      ? 'drop-shadow-[0_0_8px_hsl(var(--cyan)/0.5)]'
                      : 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.55)]')
                )}
                strokeWidth={isActive ? 2.5 : 1.5}
                fill={
                  isActive
                    ? tab.isCreate
                      ? 'hsl(var(--cyan) / 0.15)'
                      : 'hsl(var(--primary) / 0.12)'
                    : 'none'
                }
                aria-hidden="true"
              />

              <span
                className={cn(
                  'text-[10px] font-medium transition-colors duration-200',
                  isActive
                    ? tab.isCreate
                      ? 'text-cyan'
                      : 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
});

export default BottomNav;
