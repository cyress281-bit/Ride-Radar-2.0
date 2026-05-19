import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';

const TABS = [
  { to: '/home', icon: Map, label: 'Radar' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const BottomNav = memo(function BottomNav({ isOverlay = false }) {
  const { pathname } = useLocation();

  return (
    <nav
      data-rr-nav
      className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-safe pointer-events-none"
      style={isOverlay ? { bottom: 'var(--rr-viewport-offset-bottom, 0px)' } : undefined}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          'mx-auto max-w-xl pointer-events-auto',
          'bg-surface/85 backdrop-blur-xl',
          'border border-white/[0.08]',
          'rounded-2xl overflow-hidden',
          'shadow-[0_-4px_24px_hsl(0_0%_0%/0.35)]'
        )}
      >
        <div className="flex items-center justify-around">
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
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'pressable',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                <VStack align="center" gap={0.5}>
                  <Icon
                    className={cn(
                      'transition-colors duration-200',
                      'h-[22px] w-[22px]'
                    )}
                    strokeWidth={2}
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
                      'h-[3px] w-6 rounded-full bg-primary',
                      'animate-fade-in',
                      'shadow-[0_0_8px_hsl(var(--primary)/0.6)]'
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
