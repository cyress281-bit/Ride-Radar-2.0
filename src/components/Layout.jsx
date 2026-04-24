import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Radio, MessageCircle, User, Bell, Shield } from 'lucide-react';
import { useCurrentUser, useMyProfile } from '@/lib/useCurrentUser';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/broadcast', icon: Radio, label: 'Broadcast' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Layout() {
  const { data: user } = useCurrentUser();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-background noise">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Radio className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Ride Radar</span>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => cn('p-2 rounded-full hover:bg-secondary transition', isActive && 'bg-secondary')}>
                <Shield className="w-5 h-5" />
              </NavLink>
            )}
            <NavLink to="/notifications" className={({ isActive }) => cn('p-2 rounded-full hover:bg-secondary transition', isActive && 'bg-secondary')}>
              <Bell className="w-5 h-5" />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-2xl mx-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/60">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {tabs.map((t) => {
            const active = pathname === t.to || (t.to !== '/home' && pathname.startsWith(t.to));
            const Icon = t.icon;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                className="flex flex-col items-center gap-1 py-3 text-xs font-medium transition"
              >
                <div className={cn('p-1.5 rounded-lg transition', active ? 'text-primary' : 'text-muted-foreground')}>
                  <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={cn('text-[10px] tracking-wide', active ? 'text-primary font-semibold' : 'text-muted-foreground')}>{t.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}