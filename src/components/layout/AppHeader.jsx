import { memo, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminRole } from '@/features/auth/hooks/use-admin-role';
import { useAuthState } from '@/features/auth/hooks/use-auth';
import { useUnreadCount } from '@/features/notifications/hooks/use-notifications';
import RRLogo from '@/components/RRLogo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Text } from '@/components/ui/primitives/Text';
import { HStack } from '@/components/ui/primitives/Stack';

const ROUTE_TITLES = {
  '/home': '',
  '/profile': 'Profile',
  '/notifications': 'Notifications',
  '/admin': 'Admin',
  '/settings': 'Settings',
  '/rides': 'Rides',
  '/messages': 'Messages',
  '/chat': 'Chat',
  '/safety': 'Safety',
  '/broadcast': 'Broadcast',
};

function getPageTitle(pathname) {
  if (ROUTE_TITLES[pathname] !== undefined) return ROUTE_TITLES[pathname];
  if (pathname === '/') return '';
  const segment = pathname.split('/')[1];
  return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : '';
}

/**
 * AppHeader — Scroll-aware minimal header.
 *
 * Design:
 * - Transparent at top, gains bg-background/80 backdrop-blur on scroll
 * - Left: Back button (when not on home) OR Logo (on home)
 * - Center: Page title (bold, not uppercase micro label)
 * - Right: Notifications bell + Avatar
 * - Height: 56px
 * - Keeps existing admin dot, unread badge logic
 */
const AppHeader = memo(function AppHeader({ isOverlay = false }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdminRole();
  const { user, profile } = useAuthState();
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const isRadar = pathname === '/home';
  const isHome = pathname === '/home';
  const isTransparent = isOverlay || isRadar;
  const pageTitle = getPageTitle(pathname);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (isTransparent) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isTransparent]);

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.display_name || profile?.username || 'Rider';

  const showBackButton = !isHome;

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 pt-safe select-none transition-all duration-300',
        isTransparent
          ? 'bg-black/30 backdrop-blur-md'
          : scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-white/[0.04]'
            : 'bg-transparent'
      )}
    >
      <HStack
        align="center"
        justify="between"
        className="mx-auto px-4 h-14 max-w-xl"
      >
        {/* Left: Back button or Logo */}
        {showBackButton ? (
          <button
            onClick={() => navigate(-1)}
            className={cn(
              'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full',
              'text-foreground hover:text-primary',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'pressable'
            )}
            aria-label="Go back"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : (
          <NavLink
            to="/home"
            className={cn(
              'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'pressable'
            )}
            aria-label="Ride Radar home"
          >
            <RRLogo
              size="md"
              glow={isRadar}
              className={cn(isRadar && 'animate-pulse')}
            />
          </NavLink>
        )}

        {/* Center: Page context */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
          {isRadar ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-honda">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-honda opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-honda" />
              </span>
              LIVE
            </span>
          ) : (
            pageTitle && (
              <Text
                variant="h3"
                color="default"
                className="text-base font-bold"
              >
                {pageTitle}
              </Text>
            )
          )}
        </div>

        {/* Right: Actions */}
        <HStack align="center" gap={1} role="group" aria-label="Header actions">
          {isAdmin && (
            <NavLink
              to="/admin"
              className={cn(
                'flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'pressable'
              )}
              aria-label="Admin panel"
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                aria-hidden="true"
              />
            </NavLink>
          )}

          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              cn(
                'relative flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'pressable',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
            aria-label="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-honda ring-2 ring-background"
                aria-hidden="true"
              />
            )}
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'pressable',
                isActive && 'ring-1 ring-primary/40'
              )
            }
            aria-label="My profile"
          >
            <Avatar className="h-7 w-7 border border-white/10">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-surface text-muted-foreground text-xs font-bold">
                <User className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
          </NavLink>
        </HStack>
      </HStack>
    </header>
  );
});

export default AppHeader;
