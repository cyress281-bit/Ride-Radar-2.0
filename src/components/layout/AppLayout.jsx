import { memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import OfflineBanner from '@/components/OfflineBanner';

/**
 * AppLayout — Main application shell with refined background.
 *
 * Provides the persistent UI frame for all authenticated pages:
 * - Scroll-aware glassmorphism header
 * - Scrollable main content area
 * - Full-width bottom tab bar navigation
 * - Subtle warm ambient background with very faint radial glow
 * - Top edge gradient fade for header blending
 */
const AppLayout = memo(function AppLayout() {
  const { pathname } = useLocation();
  const isRadar = pathname === '/home';

  return (
    <div
      className={cn(
        'min-h-dvh bg-background relative overflow-hidden selection:bg-primary/30',
        isRadar && 'min-h-0 h-dvh'
      )}
    >
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
          {/* Subtle warm radial glow — top left (very faint) */}
          <div
            className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] max-w-[400px] max-h-[400px] rounded-full bg-primary/[0.025] blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          {/* Subtle warm radial glow — bottom right (very faint) */}
          <div
            className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[450px] max-h-[450px] rounded-full bg-cyan/[0.02] blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          {/* Top edge gradient fade for header blending */}
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
            : 'relative z-10 mx-auto max-w-xl pt-16 pb-24 pb-safe'
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
