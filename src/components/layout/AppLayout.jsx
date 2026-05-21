import { memo, useEffect } from 'react';
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

function isStandalonePwa() {
  return Boolean(
    window.navigator.standalone ||
    window.matchMedia?.('(display-mode: standalone)')?.matches
  );
}

function readSafeAreaBottom() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;bottom:0;left:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
  document.body.appendChild(probe);
  const safeBottom = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return Math.round(safeBottom);
}

const AppLayout = memo(function AppLayout() {
  const { pathname } = useLocation();
  const isRadar = pathname === '/home';

  // PWA cold-start settle nudge:
  // Installed iOS PWA pages can start with a shorter viewport until the
  // document becomes scrollable and iOS commits the full height. We make a
  // tiny, invisible scrollable sentinel available only during startup on
  // standalone installs, then remove it after the settle window.
  useEffect(() => {
    if (!isStandalonePwa()) return;

    const html = document.documentElement;
    const sentinel = document.createElement('div');
    sentinel.id = 'rr-pwa-viewport-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText =
      'position:absolute;left:0;top:calc(100vh + 1px);width:1px;height:1px;opacity:0;pointer-events:none;visibility:hidden;';
    document.body.appendChild(sentinel);

    const settle = () => {
      window.scrollTo(0, 2);
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        html.style.setProperty('--rr-safe-area-bottom', `${readSafeAreaBottom()}px`);
        html.style.setProperty('--rr-viewport-height', `${Math.round(window.visualViewport?.height ?? window.innerHeight)}px`);
      });
    };

    const raf1 = requestAnimationFrame(settle);
    const raf2 = requestAnimationFrame(() => {
      requestAnimationFrame(settle);
    });

    const timers = [
      setTimeout(settle, 150),
      setTimeout(settle, 500),
      setTimeout(settle, 1500),
      setTimeout(() => {
        sentinel.remove();
      }, 1600),
    ];

    const vv = window.visualViewport;
    const onResize = () => {
      html.style.setProperty('--rr-safe-area-bottom', `${readSafeAreaBottom()}px`);
      html.style.setProperty('--rr-viewport-height', `${Math.round(vv?.height ?? window.innerHeight)}px`);
    };

    vv?.addEventListener('resize', onResize, { passive: true });
    vv?.addEventListener('scroll', onResize, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      timers.forEach(clearTimeout);
      sentinel.remove();
      vv?.removeEventListener('resize', onResize);
      vv?.removeEventListener('scroll', onResize);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // iOS Safari cold-start: env(safe-area-inset-bottom) stays 0 until the browser
  // observes a scroll event on a scrollable document. void offsetHeight does NOT
  // trigger this — only an actual scroll event does. Profile fixes it naturally
  // because its tall content makes the page scrollable so ScrollToTop fires a real
  // scroll. Fix: briefly overflow by 2 px, fire an instant scroll to position 2,
  // then restore. The HTML spec guarantees scroll events fire before rAF callbacks
  // in the same rendering update, so by raf1 iOS has committed the safe-area value.
  // AppBootLoader covers the UI for ≥2.4 s so no visual flash reaches the user.
  useEffect(() => {
    const html = document.documentElement;
    let raf1;
    let raf2;
    let raf3;
    const savedMinH = html.style.minHeight;
    const savedScrollBehavior = html.style.scrollBehavior;

    html.style.minHeight = 'calc(100% + 2px)';
    html.style.scrollBehavior = 'auto'; // bypass css scroll-behavior:smooth
    window.scrollTo(0, 2);

    raf1 = requestAnimationFrame(() => {
      // Scroll event has fired — iOS safe-area metrics are now committed.
      // Read the actual env() value via a fixed probe and expose as a CSS var
      // so that all consumers (translate, pb-safe, etc.) get the correct value
      // even on the very first paint the user sees.
      const safeBottom = readSafeAreaBottom();
      html.style.setProperty('--rr-safe-area-bottom', `${safeBottom}px`);

      window.scrollTo(0, 0);
      raf2 = requestAnimationFrame(() => {
        html.style.minHeight = savedMinH;
        html.style.scrollBehavior = savedScrollBehavior;
      });
    });

    const safeAreaTimers = [
      setTimeout(() => html.style.setProperty('--rr-safe-area-bottom', `${readSafeAreaBottom()}px`), 150),
      setTimeout(() => html.style.setProperty('--rr-safe-area-bottom', `${readSafeAreaBottom()}px`), 500),
      setTimeout(() => html.style.setProperty('--rr-safe-area-bottom', `${readSafeAreaBottom()}px`), 1500),
    ];

    const updateVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      html.style.setProperty('--rr-viewport-height', `${Math.round(h)}px`);
    };
    updateVh();
    raf3 = requestAnimationFrame(updateVh);
    const timer = setTimeout(updateVh, 50);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateVh);
    window.addEventListener('resize', updateVh);
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) cancelAnimationFrame(raf2);
      cancelAnimationFrame(raf3);
      clearTimeout(timer);
      safeAreaTimers.forEach(clearTimeout);
      vv?.removeEventListener('resize', updateVh);
      window.removeEventListener('resize', updateVh);
      html.style.minHeight = savedMinH;
      html.style.scrollBehavior = savedScrollBehavior;
    };
  }, []);

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
            : 'relative z-10 mx-auto max-w-xl overflow-x-hidden pb-nav-safe'
        )}
        style={!isRadar ? { paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' } : undefined}
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
