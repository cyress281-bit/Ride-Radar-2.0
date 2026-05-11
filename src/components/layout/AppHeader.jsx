import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminRole } from '@/features/auth/hooks/use-admin-role';
import { useAuthState } from '@/features/auth/hooks/use-auth';
import { useUnreadCount } from '@/features/notifications/hooks/use-notifications';
import RRLogo from '@/components/RRLogo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
 * AppHeader — Premium minimal header bar.
 *
 * Layout:
 * - Left: RRLogo icon only (links to /home), pulse glow on radar
 * - Center: Page title (non-radar) or LIVE indicator (radar)
 * - Right: Admin dot (conditional), Notifications bell with badge, Avatar
 *
 * Modes:
 * - Normal: sticky with bg-surface/80
 * - Radar (/home): transparent bg-black/40
 *
 * @param {boolean} [isOverlay=false]
 * @returns {JSX.Element}
 */
const AppHeader = memo(function AppHeader({ isOverlay = false }) {
  const { pathname } = useLocation();
  const { isAdmin } = useAdminRole();
  const { user, profile } = useAuthState();
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const isRadar = pathname === '/home';
  const isTransparent = isOverlay || isRadar;
  const pageTitle = getPageTitle(pathname);

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.display_name || profile?.username || 'Rider';

  return (
    <header
      className={cn(
        'z-40 pt-safe select-none',
        isTransparent
          ? 'bg-black/40 backdrop-blur-xl border-b border-white/5'
          : 'bg-surface/80 backdrop-blur-xl border-b border-border'
      )}
    >
      <div className="mx-auto px-4 h-14 md:h-16 flex items-center justify-between max-w-2xl">
        {/* Left: Logo */}
        <NavLink
          to="/home"
          className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 active:opacity-80 transition-all duration-150 will-change-transform"
          aria-label="Ride Radar home"
        >
          <RRLogo
            size="md"
            glow={isRadar}
            className={cn(isRadar && 'animate-pulse')}
          />
        </NavLink>

        {/* Center: Page context */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
          {isRadar ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              LIVE
            </span>
          ) : (
            pageTitle && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                {pageTitle}
              </span>
            )
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3" role="group" aria-label="Header actions">
          {isAdmin && (
            <NavLink
              to="/admin"
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 active:opacity-80 will-change-transform"
              aria-label="Admin panel"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            </NavLink>
          )}

          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              cn(
                'relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full transition-all duration-150 will-change-transform',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'active:scale-95 active:opacity-80',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )
            }
            aria-label="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-primary"
                aria-hidden="true"
              />
            )}
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full transition-all duration-150 will-change-transform',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'active:scale-95 active:opacity-80',
                isActive && 'ring-1 ring-primary/50'
              )
            }
            aria-label="My profile"
          >
            <Avatar className="h-7 w-7">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                <User className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
          </NavLink>
        </div>
      </div>
    </header>
  );
});

export default AppHeader;
