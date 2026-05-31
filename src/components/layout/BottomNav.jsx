import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';
import { withRoutePreload, preloadHome, preloadMessages, preloadProfile } from '@/lib/routePreload';

const TABS = [
  { to: '/home', icon: Map, label: 'Radar', preload: preloadHome },
  { to: '/messages', icon: MessageCircle, label: 'Comm.', preload: preloadMessages },
  { to: '/profile', icon: User, label: 'Profile', preload: preloadProfile },
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
          'relative overflow-hidden rounded-[28px]',
          'border border-white/[0.08] bg-background/82 backdrop-blur-2xl',
          'shadow-[0_-18px_42px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.03)]'
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
        />

        <div className="grid grid-cols-3 gap-1.5 p-1.5">
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
                {...withRoutePreload(tab.preload)}
                className={cn(
                  'group relative flex min-h-[58px] flex-col items-center justify-center overflow-hidden rounded-[22px]',
                  'px-2 py-2',
                  'transition-all duration-200 select-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'pressable',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground/85'
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-0 rounded-[22px]',
                      'bg-gradient-to-b from-primary/[0.22] via-primary/[0.12] to-primary/[0.05]',
                      'ring-1 ring-primary/20',
                      'shadow-[0_0_24px_hsl(var(--primary)/0.18)]'
                    )}
                  />
                )}

                <VStack align="center" gap={0.5} className="relative">
                  <Icon
                    className={cn(
                      'h-[22px] w-[22px] transition-all duration-200',
                      isActive
                        ? 'text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.65)]'
                        : 'text-current/90 group-hover:text-foreground'
                    )}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  <Text
                    variant="micro"
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-200',
                      isActive
                        ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.28)]'
                        : 'text-muted-foreground'
                    )}
                  >
                    {tab.label}
                  </Text>
                </VStack>

                {isActive && (
                  <span
                    className={cn(
                      'relative mt-1 h-1 w-7 rounded-full bg-primary',
                      'animate-fade-in',
                      'shadow-[0_0_10px_hsl(var(--primary)/0.75)]'
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
