import { memo, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import OfflineBanner from '@/components/OfflineBanner';

/**
 * AppLayout â€” Main application shell with electric neon aesthetic.
 *
 * Provides the persistent UI frame for all authenticated pages:
 * - Scroll-aware glassmorphism header
 * - Scrollable main content area
 * - Full-width bottom tab bar navigation
 * - Radar grid overlay + subtle neon ambient glow
 * - Deep space black background
 */

function readSafeAreaBottom() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;bottom:0;left:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
  document.body.appendChild(probe);
  const safeBottom = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return Math.round(safeBottom);
}

function isStandalonePwa() {
  return Boolean(
    window.navigator.standalone ||
    window.matchMedia?.('(display-mode: standalone)')?.matches
  );
}

function readNavDebug(pathname) {
  const html = document.documentElement;
  const navEl = document.querySelector('[data-rr-nav]');
  const navRect = navEl?.getBoundingClientRect?.() ?? null;
  const navStyles = navEl ? getComputedStyle(navEl) : null;
  const pillEl = navEl?.firstElementChild ?? null;
  const pillRect = pillEl?.getBoundingClientRect?.() ?? null;
  const pillStyles = pillEl ? getComputedStyle(pillEl) : null;
  const vv = window.visualViewport;
  const rootStyles = getComputedStyle(html);

  return {
    pathname,
    isRadar: pathname === '/home',
    isStandalone: isStandalonePwa(),
    isPwa: isStandalonePwa(),
    innerHeight: window.innerHeight,
    clientHeight: html.clientHeight,
    bodyScrollHeight: document.body.scrollHeight,
    vvHeight: vv?.height ?? null,
    vvOffsetTop: vv?.offsetTop ?? null,
    vvPageTop: vv?.pageTop ?? null,
    vvScale: vv?.scale ?? null,
    rrSafeAreaBottom: rootStyles.getPropertyValue('--rr-safe-area-bottom').trim() || '(unset)',
    rrViewportOffsetBottom: rootStyles.getPropertyValue('--rr-viewport-offset-bottom').trim() || '(unset)',
    rrViewportHeight: rootStyles.getPropertyValue('--rr-viewport-height').trim() || '(unset)',
    navBottom: navStyles?.bottom ?? '(missing)',
    navPaddingBottom: navStyles?.paddingBottom ?? '(missing)',
    navRectTop: navRect?.top ?? '(missing)',
    navRectBottom: navRect?.bottom ?? '(missing)',
    navRectHeight: navRect?.height ?? '(missing)',
    pillMarginBottom: pillStyles?.marginBottom ?? '(missing)',
    pillPaddingBottom: pillStyles?.paddingBottom ?? '(missing)',
    pillRectTop: pillRect?.top ?? '(missing)',
    pillRectBottom: pillRect?.bottom ?? '(missing)',
    pillRectHeight: pillRect?.height ?? '(missing)',
  };
}

const AppLayout = memo(function AppLayout() {
  const location = useLocation();
  const { pathname } = location;
  const isRadar = pathname === '/home';
  const showNavDebug = new URLSearchParams(location.search).get('navdebug') === '1' || isStandalonePwa();
  const [navDebug, setNavDebug] = useState(() => readNavDebug(pathname));

  // iOS Safari cold-start: env(safe-area-inset-bottom) stays 0 until the browser
  // observes a scroll event on a scrollable document. void offsetHeight does NOT
  // trigger this â€” only an actual scroll event does. Profile fixes it naturally
  // because its tall content makes the page scrollable so ScrollToTop fires a real
  // scroll. Fix: briefly overflow by 2 px, fire an instant scroll to position 2,
  // then restore. The HTML spec guarantees scroll events fire before rAF callbacks
  // in the same rendering update, so by raf1 iOS has committed the safe-area value.
  // AppBootLoader covers the UI for â‰¥2.4 s so no visual flash reaches the user.
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
      // Scroll event has fired â€” iOS safe-area metrics are now committed.
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

  useEffect(() => {
    if (!showNavDebug) return;

    const update = () => setNavDebug(readNavDebug(pathname));
    const timers = [
      setTimeout(update, 150),
      setTimeout(update, 500),
      setTimeout(update, 1500),
    ];

    update();

    const vv = window.visualViewport;
    window.addEventListener('resize', update, { passive: true });
    vv?.addEventListener('resize', update, { passive: true });
    vv?.addEventListener('scroll', update, { passive: true });

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', update);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, [pathname, showNavDebug]);

  return (
    <div
      className={cn(
        'min-h-dvh bg-background relative overflow-hidden selection:bg-primary/30',
        isRadar && 'min-h-0 h-dvh'
      )}
    >
      {/* Offline status banner */}
      <OfflineBanner />

      {/* Skip to main content â€” keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
      >
        Skip to main content
      </a>

      {/* Background effects â€” hidden on radar (map is the background) */}
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
          {/* Subtle neon radial glow â€” top left */}
          <div
            className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] max-w-[400px] max-h-[400px] rounded-full bg-primary/[0.025] blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          {/* Subtle neon radial glow â€” bottom right */}
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

      {/* Header â€” overlay on radar, sticky elsewhere */}
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

      {showNavDebug && (
        <div
          className="fixed top-3 right-3 z-[200] max-h-[70vh] w-[min(92vw,24rem)] overflow-y-auto rounded-xl border border-primary/25 bg-black/85 p-3 text-[10px] leading-4 text-foreground shadow-[0_18px_50px_hsl(0_0%_0%/0.6)] backdrop-blur-xl"
          style={{ pointerEvents: 'none' }}
        >
          <div className="mb-2 font-bold text-primary">Nav Debug</div>
          <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 font-mono">
            <span className="text-muted-foreground">pathname</span><span className="break-all">{navDebug.pathname}</span>
            <span className="text-muted-foreground">isRadar</span><span>{String(navDebug.isRadar)}</span>
            <span className="text-muted-foreground">isStandalone</span><span>{String(navDebug.isStandalone)}</span>
            <span className="text-muted-foreground">isPwa</span><span>{String(navDebug.isPwa)}</span>
            <span className="text-muted-foreground">window.innerHeight</span><span>{navDebug.innerHeight}</span>
            <span className="text-muted-foreground">document.documentElement.clientHeight</span><span>{navDebug.clientHeight}</span>
            <span className="text-muted-foreground">document.body.scrollHeight</span><span>{navDebug.bodyScrollHeight}</span>
            <span className="text-muted-foreground">visualViewport.height</span><span>{navDebug.vvHeight ?? '(n/a)'}</span>
            <span className="text-muted-foreground">visualViewport.offsetTop</span><span>{navDebug.vvOffsetTop ?? '(n/a)'}</span>
            <span className="text-muted-foreground">visualViewport.pageTop</span><span>{navDebug.vvPageTop ?? '(n/a)'}</span>
            <span className="text-muted-foreground">visualViewport.scale</span><span>{navDebug.vvScale ?? '(n/a)'}</span>
            <span className="text-muted-foreground">--rr-safe-area-bottom</span><span>{navDebug.rrSafeAreaBottom}</span>
            <span className="text-muted-foreground">--rr-viewport-offset-bottom</span><span>{navDebug.rrViewportOffsetBottom}</span>
            <span className="text-muted-foreground">--rr-viewport-height</span><span>{navDebug.rrViewportHeight}</span>
            <span className="text-muted-foreground">BottomNav computed bottom</span><span>{navDebug.navBottom}</span>
            <span className="text-muted-foreground">BottomNav computed padding-bottom</span><span>{navDebug.navPaddingBottom}</span>
            <span className="text-muted-foreground">BottomNav rect top</span><span>{navDebug.navRectTop}</span>
            <span className="text-muted-foreground">BottomNav rect bottom</span><span>{navDebug.navRectBottom}</span>
            <span className="text-muted-foreground">BottomNav rect height</span><span>{navDebug.navRectHeight}</span>
            <span className="text-muted-foreground">Inner pill margin-bottom</span><span>{navDebug.pillMarginBottom}</span>
            <span className="text-muted-foreground">Inner pill padding-bottom</span><span>{navDebug.pillPaddingBottom}</span>
            <span className="text-muted-foreground">Inner pill rect top</span><span>{navDebug.pillRectTop}</span>
            <span className="text-muted-foreground">Inner pill rect bottom</span><span>{navDebug.pillRectBottom}</span>
            <span className="text-muted-foreground">Inner pill rect height</span><span>{navDebug.pillRectHeight}</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default AppLayout;
