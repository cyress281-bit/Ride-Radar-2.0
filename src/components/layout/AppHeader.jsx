import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bell, Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminRole } from '@/features/auth/hooks/use-admin-role';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth';
import RRLogo from '@/components/RRLogo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

/**
 * AppHeader — Sticky glassmorphism header bar.
 *
 * Layout:
 * - Left: RRLogo (links to /home)
 * - Center: "Ride Radar" title (hidden on mobile, visible on tablet+)
 * - Right: Admin shield (conditional), Notifications bell with badge, Avatar thumbnail
 *
 * Styling:
 * - Glassmorphism: bg-background/80 backdrop-blur-md border-b border-primary/10
 * - Height: h-14
 *
 * @returns {JSX.Element}
 */
const AppHeader = memo(function AppHeader() {
  const { pathname } = useLocation();
  const { isAdmin } = useAdminRole();
  const { profile } = useSupabaseAuth();
  const isRadar = pathname === '/home';

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.display_name || profile?.username || 'Rider';

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-primary/10">
      <div className={cn('mx-auto px-4 h-14 flex items-center justify-between', isRadar ? 'max-w-[1180px]' : 'max-w-2xl')}>
        {/* Left: Logo */}
        <NavLink
          to="/home"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg px-1 py-0.5"
          aria-label="Ride Radar home"
        >
          <RRLogo size="sm" />
          <span className="hidden sm:inline font-display font-extrabold text-lg tracking-[-0.04em]">
            Ride<span className="text-primary">Radar</span>
          </span>
        </NavLink>

        {/* Center: App title (hidden on mobile) */}
        <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
            Ride Radar
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1" role="group" aria-label="Header actions">
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
              aria-label="Admin panel"
            >
              <Shield className="w-5 h-5" aria-hidden="true" />
            </NavLink>
          )}

          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              cn(
                'relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )
            }
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {/* Unread badge placeholder — wire to notification store when ready */}
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
              )
            }
            aria-label="My profile"
          >
            <Avatar className="h-8 w-8">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </NavLink>
        </div>
      </div>
    </header>
  );
});

export default AppHeader;
