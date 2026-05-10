import { memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';

/**
 * AppLayout — Main application shell.
 *
 * Provides the persistent UI frame for all authenticated pages:
 * - Sticky glassmorphism header with branding and actions
 * - Scrollable main content area with bottom padding for the floating nav
 * - Floating dock-style bottom navigation bar
 * - Subtle radar grid background and ambient glow effects
 *
 * @returns {JSX.Element}
 */
const AppLayout = memo(function AppLayout() {
  const { pathname } = useLocation();
  const isRadar = pathname === '/home';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/30">
      {/* Skip to main content — keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Subtle radar grid background */}
      <div
        className="fixed inset-0 radar-grid pointer-events-none opacity-[0.24]"
        aria-hidden="true"
      />
      {/* Radial gradient ambient overlay */}
      <div
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.11),transparent_34%),linear-gradient(180deg,transparent,rgba(0,0,0,0.35))]"
        aria-hidden="true"
      />

      {/* Ambient glow orbs */}
      <div
        className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-primary/5 blur-3xl"
        aria-hidden="true"
      />

      {/* Sticky header */}
      <AppHeader />

      {/* Main scrollable content */}
      <main
        id="main-content"
        className={cn(
          'relative z-10 mx-auto',
          isRadar ? 'max-w-none pb-0' : 'max-w-2xl pb-24'
        )}
        role="main"
      >
        <Outlet />
      </main>

      {/* Floating bottom navigation */}
      <BottomNav />
    </div>
  );
});

export default AppLayout;
