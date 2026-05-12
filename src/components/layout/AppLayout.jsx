import { memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import OfflineBanner from '@/components/OfflineBanner';

/**
 * AppLayout — Main application shell.
 *
 * Provides the persistent UI frame for all authenticated pages:
 * - Scroll-aware glassmorphism header
 * - Scrollable main content area
 * - Floating dock-style bottom navigation
 * - Subtle ambient background with brand-colored glows
 */
const AppLayout = memo(function AppLayout() {
  const { pathname } = useLocation();
  const isRadar = pathname === '/home';

  return (
    <div className={cn('min-h-dvh bg-background relative overflow-hidden selection:bg-primary/30', isRadar && 'min-h-0 h-dvh')}>
      {/* Offline status banner */}
      <OfflineBanner />

      {/* Skip to main content — keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Background effects — hidden on radar (map is the background) */}
      {!isRadar && (
        <>
          {/* Subtle radial glow — top left (Kawasaki Green hint) */}
          <div
            className="fixed top-[-15%] left-[-10%] w-[50vw] h-[50vw] max-w-[450px] max-h-[450px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          {/* Subtle radial glow — bottom right (Yamaha Blue hint) */}
          <div
            className="fixed bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] max-w-[500px] max-h-[500px] rounded-full bg-cyan/[0.03] blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          {/* Top edge fade for header blending */}
          <div
            className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent pointer-events-none z-[1]"
            aria-hidden="true"
          />
        </>
      )}

      {/* Header — overlay on radar, sticky elsewhere */}
      <AppHeader isOverlay={isRadar} />

      {/* Main content */}
      <main
        id="main-content"
        className={cn(
          isRadar
            ? 'fixed inset-0 z-0'
            : 'relative z-10 mx-auto max-w-2xl pt-14 pb-28 pb-safe'
        )}
        role="main"
      >
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav isOverlay={isRadar} />
    </div>
  );
});

export default AppLayout;
