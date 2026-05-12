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
 * BottomNav — Modern full-width bottom tab bar with animated active indicator.
 *
 * Design:
 * - Full-width bar (not floating dock)
 * - 3 primary tabs: Home, Messages, Profile
 * - Create button: elevated circular FAB centered above the bar (Kawasaki Green)
 * - Active state: brand-colored icon + label, with a small animated indicator pill
 * - Inactive: muted gray
 * - Background: surface/90 backdrop-blur-2xl, subtle top border
 * - Safe area support for iOS
 * - Press feedback on all tabs
 */
const BottomNav = memo(function BottomNav({ isOverlay = false }) {
  const { pathname } = useLocation();
  const isRadar = pathname === '/home';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none',
        isOverlay || isRadar ? 'h-auto' : 'h-auto'
      )}
      aria-label="Main navigation"
    >
      {/* Create button — elevated circular FAB centered above the bar */}
      <NavLink
        to="/broadcast"
        className={cn(
          'pointer-events-auto relative z-10 flex items-center justify-center',
          'h-14 w-14 rounded-full',
          'bg-primary text-primary-foreground',
          'shadow-depth-3',
          'transition-all duration-200 ease-out',
          'active:scale-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          '-mb-3'
        )}
        style={{
          boxShadow:
            '0 4px 20px hsl(var(--brand-kawasaki) / 0.45), 0 0 0 4px hsl(var(--background))',
        }}
        aria-label="Create broadcast"
      >
        <PlusCircle className="h-7 w-7" strokeWidth={2} />
      </NavLink>

      {/* Full-width tab bar */}
      <div
        className={cn(
          'pointer-events-auto w-full',
          'bg-surface/90 backdrop-blur-2xl',
          'border-t border-white/[0.06]',
          'shadow-depth-2'
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
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
                      'h-[22px] w-[22px]'
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

                {/* Animated active indicator pill */}
                {isActive && (
                  <span
                    className={cn(
                      'absolute bottom-1.5 left-1/2 -translate-x-1/2',
                      'h-[3px] w-6 rounded-full bg-primary',
                      'animate-fade-in'
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

export default BottomNav;
