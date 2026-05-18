import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Crosshair, Navigation, Plus, Radio, Siren, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAdminRole } from '@/features/auth/hooks/use-admin-role';
import { useAuthState } from '@/features/auth/hooks/use-auth';
import { useUnreadCount } from '@/features/notifications/hooks/use-notifications';
import { useUpdateSettings } from '@/features/settings/hooks/use-settings';
import { useRadarCommand } from '@/features/broadcast/contexts/RadarCommandContext';
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
  '/messages': 'Messages',
  '/broadcast': 'Send a Signal',
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
  const { user, profile } = useAuthState();
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const isRadar = pathname === '/home';
  const isHome = pathname === '/home';
  const isTransparent = isOverlay || isRadar;
  const pageTitle = getPageTitle(pathname);
  const isBeta = import.meta.env.VITE_BETA_MODE === 'true';

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (isTransparent) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isTransparent]);

  // Radar command bar — state and handlers
  const radarCommand = useRadarCommand();
  const updateSettings = useUpdateSettings();
  const [justActivated, setJustActivated] = useState(false);
  const [justLocked, setJustLocked] = useState(false);
  const justActivatedTimerRef = useRef(null);
  const prevLocatingRef = useRef(false);
  const hasInitiatedRequestRef = useRef(false);

  const locating = radarCommand?.locating ?? false;
  const hasUserLocation = radarCommand?.hasUserLocation ?? false;
  const isLiveMapVisible = radarCommand?.isLiveMapVisible ?? false;

  useEffect(() => {
    return () => {
      if (justActivatedTimerRef.current) clearTimeout(justActivatedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isRadar) return;
    const wasLocating = prevLocatingRef.current;
    prevLocatingRef.current = locating;
    if (wasLocating && !locating && hasUserLocation) {
      setJustLocked(true);
      if (hasInitiatedRequestRef.current) {
        hasInitiatedRequestRef.current = false;
        try { navigator.vibrate?.(15); } catch {}
      }
      const timer = setTimeout(() => setJustLocked(false), 700);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [locating, hasUserLocation, isRadar]);

  const handleCreateBroadcast = useCallback(() => navigate('/broadcast'), [navigate]);
  const handleBikeDown = useCallback(() => navigate('/broadcast?type=bike_down'), [navigate]);

  const handleRequestLocation = useCallback(() => {
    hasInitiatedRequestRef.current = true;
    radarCommand?.requestLocation?.();
  }, [radarCommand]);

  const handleToggleLive = useCallback(async () => {
    if (!user?.id || updateSettings.isPending) return;
    try {
      const turningOn = !isLiveMapVisible;
      await updateSettings.mutateAsync({
        userId: user.id,
        updates: { live_map_visible: turningOn },
      });
      if (turningOn) {
        setJustActivated(true);
        if (justActivatedTimerRef.current) clearTimeout(justActivatedTimerRef.current);
        justActivatedTimerRef.current = setTimeout(() => setJustActivated(false), 700);
      }
    } catch (err) {
      toast.error('Could not update live status', {
        description: err?.message || 'Please try again',
      });
    }
  }, [user?.id, isLiveMapVisible, updateSettings]);

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
        ) : isRadar ? (
          <div className="flex items-center gap-0.5 bg-black/50 backdrop-blur-xl border border-white/[0.08] rounded-full px-1.5 py-1 shadow-[0_2px_16px_hsl(0_0%_0%/0.4)]">
            {/* Live */}
            <button
              onClick={handleToggleLive}
              disabled={updateSettings.isPending}
              className={cn(
                'rr-haptic flex items-center gap-[3px] rounded-full px-2 py-1.5 min-h-[36px] text-[10px] font-bold transition-all active:scale-95',
                isLiveMapVisible
                  ? 'bg-primary/20 text-primary'
                  : 'text-foreground/70 hover:bg-white/[0.06]',
                justActivated && 'rr-lock'
              )}
              aria-label={isLiveMapVisible ? 'LIVE — tap to hide' : 'Go Live — appear on map'}
            >
              <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {updateSettings.isPending ? (
                  <Navigation className="h-3 w-3 animate-spin" />
                ) : isLiveMapVisible ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                ) : (
                  <Radio className="h-3 w-3" />
                )}
              </div>
              <span>{updateSettings.isPending ? '…' : 'Live'}</span>
            </button>
            {/* Signal */}
            <button
              onClick={handleCreateBroadcast}
              className="rr-haptic flex items-center gap-[3px] rounded-full px-2 py-1.5 min-h-[36px] text-[10px] font-bold text-primary hover:bg-white/[0.06] transition-all active:scale-95"
              aria-label="Create a signal"
            >
              <Plus className="h-3 w-3 shrink-0" />
              <span>Signal</span>
            </button>
            {/* Locate — icon-only for width budget */}
            <button
              onClick={handleRequestLocation}
              disabled={locating}
              className={cn(
                'rr-haptic flex items-center justify-center rounded-full p-2.5 min-h-[36px] min-w-[36px] text-primary transition-all active:scale-95',
                !locating && 'hover:bg-white/[0.06]',
                justLocked && 'rr-lock'
              )}
              aria-label={hasUserLocation ? 'Center Radar on my area' : 'Find my location'}
            >
              {locating ? (
                <Navigation className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Crosshair className="h-3.5 w-3.5" />
              )}
            </button>
            <div className="h-3 w-px bg-white/20 mx-0.5 shrink-0" aria-hidden="true" />
            {/* Bike Down — icon-only for width budget */}
            <button
              onClick={handleBikeDown}
              className="rr-haptic flex items-center justify-center rounded-full p-2.5 min-h-[36px] min-w-[36px] text-destructive hover:bg-destructive/[0.06] transition-all active:scale-95"
              aria-label="Report a bike down emergency"
            >
              <Siren className="h-3.5 w-3.5" />
            </button>
          </div>
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
            <RRLogo size="md" glow={false} />
          </NavLink>
        )}

        {/* Center: Page context — hidden on Radar (command bar owns the left zone) */}
        {!isRadar && pageTitle && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
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
          </div>
        )}

        {/* Right: Actions */}
        <HStack align="center" gap={1} role="group" aria-label="Header actions">
          {isAdmin && (
            <NavLink
              to="/admin"
              className={cn(
                'flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'pressable'
              )}
              aria-label="Admin panel"
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
                'relative flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'pressable',
                isActive
                  ? 'text-brand-emergency bg-brand-emergency/10'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
            aria-label="Notifications"
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
                'flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
