import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, PlusCircle, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';

const TABS = [
  { to: '/home', icon: Home, label: 'Home', brandColor: 'text-brand-kawasaki', bgColor: 'bg-brand-kawasaki', fillColor: 'hsl(var(--brand-kawasaki) / 0.12)' },
  { to: '/messages', icon: MessageCircle, label: 'Messages', brandColor: 'text-brand-yamaha', bgColor: 'bg-brand-yamaha', fillColor: 'hsl(var(--brand-yamaha) / 0.12)' },
  { to: '/profile', icon: User, label: 'Profile', brandColor: 'text-brand-ducati', bgColor: 'bg-brand-ducati', fillColor: 'hsl(var(--brand-ducati) / 0.12)' },
];

/**
 * BottomNav — Multi-brand full-width bottom tab bar.
 *
 * Design:
 * - Full-width bar
 * - 3 primary tabs, each with its own OEM brand color when active:
 *   Home = Kawasaki Green, Messages = Yamaha Blue, Profile = Ducati Gold
 * - Create button: white FAB with multi-color ambient glow
 * - Active state: brand-colored icon + label + indicator pill
 * - Background: surface/90 backdrop-blur-2xl
 */
const BottomNav = memo(function BottomNav({ isOverlay = false }) {
  const { pathname } = useLocation();
  const isRadar = pathname === '/home';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none'
      )}
      aria-label="Main navigation"
    >
      {/* Create button — white FAB with multi-brand ambient glow */}
      <NavLink
        to="/broadcast"
        className={cn(
          'pointer-events-auto relative z-10 flex items-center justify-center',
          'h-14 w-14 rounded-full',
          'bg-white text-background',
          'transition-all duration-200 ease-out',
          'active:scale-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          '-mb-3'
        )}
        style={{
          boxShadow:
            '0 4px 24px rgba(255,255,255,0.15), 0 0 0 4px hsl(var(--background)), 0 0 30px hsl(var(--brand-kawasaki) / 0.25), 0 0 60px hsl(var(--brand-yamaha) / 0.15)',
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
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'pressable',
                  isActive
                    ? tab.brandColor
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
                    fill={isActive ? tab.fillColor : 'none'}
                    aria-hidden="true"
                  />

                  <Text
                    variant="micro"
                    color={isActive ? 'default' : 'muted'}
                    className={cn(
                      'transition-colors duration-200',
                      isActive && 'font-bold'
                    )}
                    style={isActive ? { color: `hsl(var(--brand-${tab.label === 'Home' ? 'kawasaki' : tab.label === 'Messages' ? 'yamaha' : 'ducati'}))` } : undefined}
                  >
                    {tab.label}
                  </Text>
                </VStack>

                {/* Animated active indicator pill — brand colored */}
                {isActive && (
                  <span
                    className={cn(
                      'absolute bottom-1.5 left-1/2 -translate-x-1/2',
                      'h-[3px] w-6 rounded-full',
                      tab.bgColor,
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
