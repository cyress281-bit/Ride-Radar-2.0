import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, PlusCircle, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';

const TABS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/profile', icon: User, label: 'Profile' },
];

/**
 * BottomNav — Electric neon bottom tab bar.
 *
 * Design:
 * - Full-width bar
 * - 3 primary tabs with neon green active states
 * - Create button: neon green FAB with glow
 * - Active state: neon icon + label + indicator pill
 * - Background: surface/90 backdrop-blur-2xl
 */
export const BottomNav = memo(function BottomNav({ isOverlay = false }) {
  const { pathname } = useLocation();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none'
      )}
      aria-label="Main navigation"
    >
      {/* Create button — neon green FAB with glow */}
      <NavLink
        to="/broadcast"
        className={cn(
          'pointer-events-auto relative z-10 flex items-center justify-center',
          'h-14 w-14 rounded-full',
          'bg-primary text-primary-foreground',
          'transition-all duration-200 ease-out',
          'active:scale-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          '-mb-3 animate-glow-pulse'
        )}
        style={{
          boxShadow:
            '0 4px 24px hsl(var(--primary) / 0.35), 0 0 0 4px hsl(var(--background)), 0 0 40px hsl(var(--primary) / 0.25)',
        }}
        aria-label="Create broadcast"
      >
        <PlusCircle className="h-7 w-7" strokeWidth={2.5} />
      </NavLink>

      {/* Full-width tab bar */}
      <div
        className={cn(
          'pointer-events-auto w-full',
          'bg-surface/90 backdrop-blur-2xl',
          'border-t border-white/[0.06]'
        )}
      >
        <div className="mx-auto max-w-xl flex items-center justify-around pb-safe">
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
                  'relative flex flex-col items-center justify-center',
                  'flex-1 min-h-[56px] px-3 py-1.5',
                  'transition-all duration-200 select-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'pressable',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                <VStack align="center" gap={0.5}>
                  <Icon
                    className={cn(
                      'transition-all duration-200',
                      'h-[22px] w-[22px]',
                      isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]'
                    )}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    fill={isActive ? 'hsl(var(--primary) / 0.12)' : 'none'}
                    aria-hidden="true"
                  />

                  <Text
                    variant="micro"
                    color={isActive ? 'primary' : 'muted'}
                    className={cn(
                      'transition-colors duration-200',
                      isActive && 'font-bold'
                    )}
                  >
                    {tab.label}
                  </Text>
                </VStack>

                {/* Animated active indicator pill — neon green */}
                {isActive && (
                  <span
                    className={cn(
                      'absolute bottom-1.5 left-1/2 -translate-x-1/2',
                      'h-[3px] w-6 rounded-full',
                      'bg-primary',
                      'animate-fade-in shadow-[0_0_8px_hsl(var(--primary)/0.6)]'
                    )}
                    aria-hidden="true"
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
});
