import { memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import OfflineBanner from '@/components/OfflineBanner';

/**
 * AppLayout — Main application shell.
 *
 * Provides the persistent UI frame for all authenticated pages:
 * - Sticky glassmorphism header with branding and actions
 * - Scrollable main content area with bottom padding for the floating nav
 * - Floating dock-style bottom navigation bar
 * - Subtle radar grid background and ambient glow effects
 *
 * Radar mode (/home): map fills the entire viewport, header and nav float
 * as transparent overlays so the map is always visible underneath.
 *
 * @returns {JSX.Element}
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
          <div
            className="fixed inset-0 radar-grid pointer-events-none opacity-[0.24]"
            aria-hidden="true"
          />
          <div
            className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.11),transparent_34%),linear-gradient(180deg,transparent,rgba(0,0,0,0.35))]"
            aria-hidden="true"
          />
          <div
            className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-primary/5 blur-3xl"
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
            : 'relative z-10 mx-auto max-w-2xl pb-24 pb-safe'
        )}
        role="main"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              enter: { duration: 0.3, ease: 'easeOut' },
              exit: { duration: 0.2, ease: 'easeIn' },
            }}
            className="will-change-transform transform-gpu"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom navigation — floats on radar, fixed elsewhere */}
      <BottomNav isOverlay={isRadar} />
    </div>
  );
});

export default AppLayout;
