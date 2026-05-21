import { memo, useEffect, useRef } from 'react';
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
// DEV ONLY — captures all layout metrics the debugger needs
function captureLayoutMetrics(label) {
  if (!import.meta.env.DEV) return;
  const html = document.documentElement;

  // Probe env(safe-area-inset-bottom) live
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;bottom:0;left:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
  document.body.appendChild(probe);
  const envSafeBottom = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();

  const cs = getComputedStyle(html);
  const rrSafeAreaBottom = cs.getPropertyValue('--rr-safe-area-bottom').trim();
  const rrViewportHeight = cs.getPropertyValue('--rr-viewport-height').trim();
  const rrNavH = cs.getPropertyValue('--rr-nav-h').trim();

  const navEl = document.querySelector('[data-rr-nav]');
  const navRect = navEl?.getBoundingClientRect() ?? null;
  const navPbSafe = navEl ? getComputedStyle(navEl).paddingBottom : null;

  const sheetEl = document.querySelector('[data-rr-sheet]');
  const sheetRect = sheetEl?.getBoundingClientRect() ?? null;
  const sheetTransform = sheetEl ? getComputedStyle(sheetEl).transform : null;

  const vv = window.visualViewport;

  console.groupCollapsed(`[RR Debug] ${label} — profileHasMounted=${!!window.__rrDebug?.profileHasMounted}`);
  console.log('window.innerHeight:', window.innerHeight);
  console.log('visualViewport.height:', vv?.height, ' offsetTop:', vv?.offsetTop);
  console.log('html.clientHeight:', html.clientHeight, ' scrollHeight:', html.scrollHeight);
  console.log('body.clientHeight:', document.body.clientHeight, ' scrollHeight:', document.body.scrollHeight);
  console.log('env(safe-area-inset-bottom) probe:', envSafeBottom, 'px');
  console.log('--rr-safe-area-bottom:', rrSafeAreaBottom || '(unset)');
  console.log('--rr-viewport-height:', rrViewportHeight || '(unset)');
  console.log('--rr-nav-h:', rrNavH || '(unset)');
  console.log('BottomNav rect:', navRect ? `top=${navRect.top.toFixed(1)} bottom=${navRect.bottom.toFixed(1)} height=${navRect.height.toFixed(1)}` : 'not found');
  console.log('BottomNav pb-safe computed paddingBottom:', navPbSafe);
  console.log('RadarSheet rect:', sheetRect ? `top=${sheetRect.top.toFixed(1)} bottom=${sheetRect.bottom.toFixed(1)} height=${sheetRect.height.toFixed(1)}` : 'not found');
  console.log('RadarSheet transform:', sheetTransform);
  console.groupEnd();
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
  const captureTimerRef = useRef(null);

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
    let raf1, raf2, raf3;
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

  // DEV: capture layout metrics 300ms after each route change to give DOM time to settle
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    clearTimeout(captureTimerRef.current);
    captureTimerRef.current = setTimeout(() => {
      const label = `route=${pathname} [${window.__rrDebug?.profileHasMounted ? 'GOOD-after-profile' : 'BAD-cold'}]`;
      captureLayoutMetrics(label);
    }, 300);
    return () => clearTimeout(captureTimerRef.current);
  }, [pathname]);

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
