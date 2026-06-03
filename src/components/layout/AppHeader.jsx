import { memo, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAdminRole } from '@/features/auth/hooks/use-admin-role';
import { useAuthState } from '@/features/auth/hooks/use-auth';
import { useUnreadCount } from '@/features/notifications/hooks/use-notifications';
import { getOrCreateSettings } from '@/features/settings/api/settings-api.js';
import { settingsKeys } from '@/features/settings/hooks/use-settings.js';
import { useSupabaseConnection } from '@/hooks/use-supabase-connection.js';
import RRLogo from '@/components/RRLogo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Text } from '@/components/ui/primitives/Text';
import { HStack } from '@/components/ui/primitives/Stack';
import {
  withRoutePreload,
  preloadProfile,
  preloadNotifications,
  preloadAdminDashboard,
} from '@/lib/routePreload';

const ROUTE_TITLES = {
  '/home': '',
  '/profile': 'Profile',
  '/notifications': 'Notifications',
  '/admin': 'Admin',
  '/settings': 'Settings',
  '/settings/account': 'Account',
  '/settings/blocked-users': 'Blocked Users',
  '/messages': 'Messages',
  '/broadcast': 'Send a Signal',
  '/review-readiness': 'Review Readiness',
  '/community-guidelines': 'Community Guidelines',
};

function getPageTitle(pathname) {
  if (ROUTE_TITLES[pathname] !== undefined) return ROUTE_TITLES[pathname];
  if (pathname === '/') return '';
  const segment = pathname.split('/')[1];
  return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : '';
}

/**
 * Derive a safe fallback route for pages that may be deep-linked or
 * refreshed with no browser history to go back to.
 *
 * Rules (most-specific first):
 *  /broadcast/:id  → /home
 *  /messages/:id   → /messages
 *  /profile/:id    → /home
 *  /admin/*        → /admin
 *  anything else   → /home
 *
 * @param {string} pathname
 * @returns {string}
 */
function getFallbackRoute(pathname) {
  if (/^\/broadcast\/.+/.test(pathname)) return '/home';
  if (/^\/messages\/.+/.test(pathname)) return '/messages';
  if (/^\/profile\/.+/.test(pathname)) return '/home';
  if (pathname.startsWith('/admin/')) return '/admin';
  if (/^\/settings\/.+/.test(pathname)) return '/settings';
  if (pathname === '/review-readiness' || pathname === '/community-guidelines') return '/settings';
  return '/home';
}

/**
 * Smart back navigation: uses browser history when available, otherwise
 * falls back to a sensible parent route so deep-linked/refreshed pages
 * don't trap the user.
 *
 * @param {import('react-router-dom').NavigateFunction} navigate
 * @param {string} pathname
 */
function goBack(navigate, pathname) {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate(getFallbackRoute(pathname), { replace: true });
  }
}

/**
 * AppHeader — Scroll-aware header with electric neon aesthetic.
 *
 * Design:
 * - Transparent at top, gains glassmorphism on scroll
 * - Left: Back button (when not on home) OR Logo (on home)
 * - Center: Page title in neon green when on non-radar pages
 * - Right: Notifications bell + Avatar
 * - Neon glow effects on active elements
 */
const AppHeader = memo(function AppHeader({ isOverlay = false }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdminRole();
  const { user, profile, isLoading: isAuthLoading } = useAuthState();
  const { data: unreadCount = 0 } = useUnreadCount(user?.id, {
    enabled: !!user?.id && !isAuthLoading,
  });
  const isRadar = pathname === '/home';
  const isHome = pathname === '/home';
  const isConversation = /^\/messages\/.+/.test(pathname);
  const isTransparent = isOverlay || isRadar;
  const pageTitle = isConversation ? '' : getPageTitle(pathname);
  const isBeta = import.meta.env.VITE_BETA_MODE === 'true';

  // Realtime connection status drives the LIVE chip color on the radar.
  // - 'subscribed'  → connected     → primary green
  // - 'unknown'     → initializing  → muted neutral (avoids red flash on cold open)
  // - anything else → disconnected  → emergency red
  const { status: connectionStatus, isConnected } = useSupabaseConnection();
  const isConnectionPending = connectionStatus === 'unknown';

  // Read live map visibility only on /home to avoid unnecessary background fetches.
  const { data: radarSettings } = useQuery({
    queryKey: settingsKeys.detail(user?.id),
    queryFn: async () => {
      const { data, error } = await getOrCreateSettings(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isRadar,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const isLiveOnMap = radarSettings?.live_map_visible === true;

  // chipVariant drives the LIVE/OFFLINE chip appearance:
  //   'connected'  → isLiveOnMap=true + realtime connected  → green + pulse
  //   'degraded'   → isLiveOnMap=true + realtime down       → amber + no pulse
  //   'pending'    → initializing (unknown status)           → muted + no pulse
  //   'offline'    → isLiveOnMap=false                       → muted + no pulse
  const chipVariant =
    !isLiveOnMap || isConnectionPending
      ? isConnectionPending
        ? 'pending'
        : 'offline'
      : isConnected
        ? 'connected'
        : 'degraded';

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (isTransparent) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isTransparent]);

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.display_name || profile?.username || 'Rider';
  const isOnboarding = pathname === '/onboarding';
  const showBackButton = !isHome && !isConversation && !isOnboarding;

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 pt-safe select-none transition-all duration-300',
        isTransparent
          ? 'bg-background/30 backdrop-blur-md'
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
            onClick={() => goBack(navigate, pathname)}
            className={cn(
              'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full',
              'text-foreground hover:text-primary',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'pressable'
            )}
            aria-label="Ride Radar home"
          >
            {isRadar ? (
              <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-primary rr-neon-green drop-shadow-[0_0_10px_hsl(var(--primary)/0.65)]">
                Ride Radar
              </span>
            ) : (
              <RRLogo size="md" glow={false} />
            )}
          </NavLink>
        )}

        {/* Center: Page context */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
          {isRadar ? (
            <span
              className={cn(
                'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]',
                chipVariant === 'connected'
                  ? 'text-primary'
                  : chipVariant === 'degraded'
                    ? 'text-amber-400'
                    : 'text-muted-foreground'
              )}
            >
              <span className="relative flex h-1.5 w-1.5">
                {chipVariant === 'connected' ? (
                  <>
                    <span className="animate-pulse-green absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </>
                ) : chipVariant === 'degraded' ? (
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                ) : (
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-muted-foreground/60" />
                )}
              </span>
              {isLiveOnMap ? 'LIVE' : 'OFFLINE'}
            </span>
          ) : (
            pageTitle && (
              <HStack align="center" gap={2}>
                <Text
                  variant="h3"
                  color="default"
                  className="text-base font-bold text-primary"
                >
                  {pageTitle}
                </Text>
                {isBeta && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                    Beta
                  </span>
                )}
              </HStack>
            )
          )}
        </div>

        {/* Right: Actions */}
        <HStack align="center" gap={1} role="group" aria-label="Header actions">
          {isAdmin && (
            <NavLink
              to="/admin"
              className={cn(
                'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'pressable'
              )}
              aria-label="Admin panel"
              {...withRoutePreload(preloadAdminDashboard)}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary animate-glow-pulse"
                aria-hidden="true"
              />
            </NavLink>
          )}

          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              cn(
                'relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'pressable',
                isActive
                  ? 'text-brand-emergency bg-brand-emergency/10'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
            aria-label="Notifications"
            {...withRoutePreload(preloadNotifications)}
          >
            <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-emergency ring-2 ring-background animate-pulse"
                aria-hidden="true"
              />
            )}
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'pressable',
                isActive && 'ring-1 ring-primary/40'
              )
            }
            aria-label="My profile"
            {...withRoutePreload(preloadProfile)}
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
