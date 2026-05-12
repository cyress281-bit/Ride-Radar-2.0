import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, PlusCircle, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/messages', icon: MessageCircle, label: 'Chat' },
  { to: '/profile', icon: User, label: 'You' },
];

/**
 * BottomNav — Floating dock-style navigation.
 *
 * Design:
 * - Centered floating pill dock (not full-width bar)
 * - 3 primary tabs: Home, Chat, You
 * - Create button: elevated circular button breaking the dock top
 * - Active state: brand-colored filled icon with subtle glow
 * - Background: glassmorphism with subtle border
 */
const BottomNav = memo(function BottomNav({ isOverlay = false }) {
  const { pathname } = useLocation();
  const isRadar = pathname === '/home';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center justify-end pb-safe pointer-events-none',
        isOverlay || isRadar ? 'h-auto' : 'h-auto'
      )}
      aria-label="Main navigation"
    >
      {/* Create button — elevated, breaks out of dock */}
      <NavLink
        to="/broadcast"
        className={cn(
          'pointer-events-auto relative -mb-3 z-10 flex items-center justify-center',
          'h-14 w-14 rounded-full',
          'bg-primary text-primary-foreground',
          'shadow-[0_4px_20px_hsl(var(--brand-kawasaki)/0.45),0_0_0_4px_hsl(var(--background))]',
          'transition-all duration-200 ease-out',
          'active:scale-90 active:shadow-[0_2px_10px_hsl(var(--brand-kawasaki)/0.35)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        )}
        aria-label="Create broadcast"
      >
        <PlusCircle className="h-7 w-7" strokeWidth={2} />
      </NavLink>

      {/* Dock */}
      <div
        className={cn(
          'pointer-events-auto flex items-center justify-center gap-1',
          'mx-4 mb-3 px-2 py-2 rounded-2xl',
          'bg-surface/85 backdrop-blur-2xl',
          'border border-white/[0.06]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]',
          'max-w-xs w-full'
        )}
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
                'relative flex flex-col items-center justify-center gap-0.5',
                'flex-1 min-h-[44px] px-3 py-1.5 rounded-xl',
                'transition-all duration-200 select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'active:scale-95',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              {/* Active pill background */}
              {isActive && (
                <span className="absolute inset-0 rounded-xl bg-primary/10 pointer-events-none" />
              )}

              <Icon
                className={cn(
                  'transition-all duration-200',
                  'h-[22px] w-[22px]',
                  isActive
                    ? 'drop-shadow-[0_0_6px_hsl(var(--brand-kawasaki)/0.5)]'
                    : ''
                )}
                strokeWidth={isActive ? 2.5 : 1.5}
                fill={isActive ? 'hsl(var(--primary) / 0.12)' : 'none'}
                aria-hidden="true"
              />

              <span
                className={cn(
                  'text-[10px] font-semibold transition-colors duration-200',
                  isActive ? 'text-primary' : 'text-muted-foreground'
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
