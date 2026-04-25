import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Gauge, Radar, MessagesSquare, UserRound, Bell, Shield } from 'lucide-react';
import { useCurrentUser, useMyProfile } from '@/lib/useCurrentUser';
import { cn } from '@/lib/utils';
import RRLogo from '@/components/RRLogo';

const tabs = [
  { to: '/home', icon: Gauge, label: 'Radar' },
  { to: '/broadcast', icon: Radar, label: 'Signal' },
  { to: '/messages', icon: MessagesSquare, label: 'Comms' },
  { to: '/profile', icon: UserRound, label: 'Rider' },
];

export default function Layout() {
  const { data: user } = useCurrentUser();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/30">
      {/* Subtle live background */}
      <div className="fixed inset-0 radar-grid-animated pointer-events-none opacity-[0.24]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.11),transparent_34%),linear-gradient(180deg,transparent,rgba(0,0,0,0.35))]" />
      
      {/* Ambient moving glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] bg-primary/10 ambient-glow" style={{ animationDelay: '0s' }} />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-primary/5 ambient-glow" style={{ animationDelay: '-4s' }} />

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-black/55 backdrop-blur-2xl border-b border-primary/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RRLogo size="sm" />
            <span className="font-display font-extrabold text-lg tracking-[-0.04em]">
              Ride<span className="text-primary">Radar</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn('p-2 rounded-full transition-colors', isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')
                }
              >
                <Shield className="w-5 h-5" />
              </NavLink>
            )}
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                cn('p-2 rounded-full transition-colors', isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')
              }
            >
              <Bell className="w-5 h-5" />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="relative z-10 max-w-2xl mx-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/70 backdrop-blur-2xl border-t border-primary/10 pb-safe shadow-[0_-18px_55px_rgba(0,0,0,0.55)]">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {tabs.map((t) => {
            const active = pathname === t.to || (t.to !== '/home' && pathname.startsWith(t.to));
            const Icon = t.icon;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                className="flex flex-col items-center gap-1 py-3 transition-colors group"
              >
                <div className={cn(
                  'p-1.5 rounded-xl transition-all',
                  active ? 'text-primary bg-primary/10 shadow-[0_0_18px_hsl(var(--primary)/0.12)]' : 'text-muted-foreground group-hover:text-foreground'
                )}>
                  <Icon
                    className="w-[22px] h-[22px]"
                    strokeWidth={active ? 2.5 : 2}
                    style={active ? { filter: 'drop-shadow(0 0 5px hsl(142 100% 47% / 0.7))' } : {}}
                  />
                </div>
                <span className={cn(
                  'text-[10px] tracking-[0.08em] font-bold uppercase',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}>
                  {t.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}