import { memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import OfflineBanner from '@/components/OfflineBanner';

/**
 * AppLayout — Main application shell with electric neon aesthetic.
 *
 * Provides the persistent UI frame for all authenticated pages:
 * - Scroll-aware glassmorphism header
 * - Scrollable main content area
 * - Full-width bottom tab bar navigation
 * - Radar grid overlay + subtle neon ambient glow
 * - Deep space black background
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
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
      >
        Skip to main content
      </a>

      {/* Background effects — hidden on radar (map is the background) */}
      {!isRadar && (
        <>
          {/* Radar grid overlay */}
          <div
            className="fixed inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(57,255,20,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(57,255,20,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
            aria-hidden="true"
          />
          {/* Subtle neon radial glow — top left */}
          <div
            className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] max-w-[400px] max-h-[400px] rounded-full bg-primary/[0.025] blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          {/* Subtle neon radial glow — bottom right */}
          <div
            className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[450px] max-h-[450px] rounded-full bg-brand-radar/[0.02] blur-3xl pointer-events-none"
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
