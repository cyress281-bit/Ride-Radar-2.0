import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Gauge, Radar, MessagesSquare, UserRound, Bell, Shield } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useLiveMapPresence } from '@/hooks/useLiveMapPresence';
import { cn } from '@/lib/utils';
import RRLogo from '@/components/RRLogo';

const tabs = [
  { to: '/home', icon: Gauge, label: 'Radar' },
  { to: '/broadcast', icon: Radar, label: 'Signal' },
  { to: '/messages', icon: MessagesSquare, label: 'Comms' },
  { to: '/profile', icon: UserRound, label: 'Rider' },
];

/**
 * Layout - App shell with premium native mobile feel.
 *
 * Accessibility:
 * - Skip-to-content link for keyboard users
 * - Semantic <header>, <main>, <nav> landmarks
 * - aria-current="page" on active navigation items (handled by NavLink)
 * - aria-label on navigation regions
 * - Notification bell has explicit aria-label
 * - Tab bar items meet 44x44px minimum touch targets
 * - Focus indicators visible on all interactive elements
 *
 * Responsive:
 * - Bottom nav uses safe-area inset for iPhone notch
 * - Content area has bottom padding to avoid tab bar overlap
 * - Max-width container for comfortable reading on larger screens
 */
export default function Layout() {
  const { pathname } = useLocation();
  const { isAdmin } = useAdminRole();
  const isRadar = pathname === '/home';
  const [currentLocation, setCurrentLocation] = useState({ lat: null, lng: null });

  useLiveMapPresence(currentLocation, { autoPublish: true, source: 'app-shell' });

  useEffect(() => {
    let active = true;

    if (!navigator.geolocation) {
      return () => {
        active = false;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return;
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        if (!active) return;
        setCurrentLocation({ lat: null, lng: null });
      },
      { maximumAge: 120000, timeout: 5000, enableHighAccuracy: false }
    );

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/30">
      {/* Skip to main content - keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Subtle live background - decorative */}
      <div className="fixed inset-0 radar-grid pointer-events-none opacity-[0.24]" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.11),transparent_34%),linear-gradient(180deg,transparent,rgba(0,0,0,0.35))]" aria-hidden="true" />

      {/* Ambient moving glows - decorative */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-black/55 backdrop-blur-2xl border-b border-primary/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        <div className={cn('mx-auto px-5 h-14 flex items-center justify-between', isRadar ? 'max-w-[1180px]' : 'max-w-2xl')}>
          <NavLink
            to="/home"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg px-1 py-0.5"
            aria-label="RideRadar home"
          >
            <RRLogo size="sm" />
            <span className="font-display font-extrabold text-lg tracking-[-0.04em]">
              Ride<span className="text-primary">Radar</span>
            </span>
          </NavLink>

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
                  'p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main id="main-content" className={cn('relative z-10 mx-auto', isRadar ? 'max-w-none pb-0' : 'max-w-2xl pb-24')} role="main">
        <Outlet />
      </main>

      {/* Floating dock-style bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none"
        aria-label="Main navigation"
      >
        <div className={cn('mx-auto flex justify-center px-4 pb-3 pt-2', isRadar ? 'max-w-[1180px]' : 'max-w-2xl')}>
          <div
            className="rr-surface-strong pointer-events-auto flex items-center gap-1 rounded-full px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.65)] border border-primary/15"
            role="tablist"
          >
            {tabs.map((t) => {
              const active = pathname === t.to || (t.to !== '/home' && pathname.startsWith(t.to));
              const Icon = t.icon;
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  role="tab"
                  aria-selected={active}
                  aria-label={t.label}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 rounded-full min-w-[64px] min-h-[52px] px-3 transition-all duration-200 active:scale-95',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    active
                      ? 'bg-primary/[0.13] text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {/* Active glow dot */}
                  {active && (
                    <span className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary animate-pulse-green shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
                  )}
                  <Icon
                    className={cn(
                      'h-[22px] w-[22px] transition-all duration-200',
                      active && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.55)]'
                    )}
                    strokeWidth={active ? 2.6 : 2}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      'text-[9px] tracking-[0.12em] font-bold uppercase transition-colors duration-200',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {t.label}
                  </span>
                  {/* Active pill background glow */}
                  {active && (
                    <span className="absolute inset-0 rounded-full border border-primary/20 pointer-events-none shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
