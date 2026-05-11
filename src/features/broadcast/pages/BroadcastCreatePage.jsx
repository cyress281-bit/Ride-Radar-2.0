import { useState, memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Route, Search, CalendarClock, CheckCircle2 } from 'lucide-react';
import SignalIcon from '@/components/brand/SignalIcon';
import RRLogo from '@/components/RRLogo';
import BroadcastForm from '@/features/broadcast/components/BroadcastForm';
import { cn } from '@/lib/utils.js';

const TYPES = [
  { id: 'solo_ride', label: 'Solo Ride', desc: 'Open a live riding signal', icon: Route, color: 'solo' },
  { id: 'iso', label: 'In Search Of', desc: 'Find wrench help or a bike crew', icon: Search, color: 'iso' },
  { id: 'event', label: 'Event', desc: 'Stage a meetup or group ride', icon: CalendarClock, color: 'event' },
  { id: 'alert', label: 'Alert', desc: 'Road hazard, one-way broadcast', icon: ShieldAlert, color: 'alert' },
];

const TYPE_STYLE_MAP = {
  solo: { hover: 'hover:border-solo/40 hover:bg-solo/8', glow: 'bg-solo', border: 'border-solo/25', text: 'text-solo', bg: 'bg-solo/10' },
  iso: { hover: 'hover:border-iso/40 hover:bg-iso/8', glow: 'bg-iso', border: 'border-iso/25', text: 'text-iso', bg: 'bg-iso/10' },
  event: { hover: 'hover:border-event/40 hover:bg-event/8', glow: 'bg-event', border: 'border-event/25', text: 'text-event', bg: 'bg-event/10' },
  alert: { hover: 'hover:border-alert/40 hover:bg-alert/8', glow: 'bg-alert', border: 'border-alert/25', text: 'text-alert', bg: 'bg-alert/10' },
};

/**
 * Broadcast creation page.
 */
function BroadcastCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get('type');
  const [type, setType] = useState(TYPES.some((t) => t.id === urlType) ? urlType : null);
  const [showCelebration, setShowCelebration] = useState(false);

  const handlePosted = useCallback(() => {
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      navigate('/home');
    }, 800);
  }, [navigate]);

  if (!type) {
    return (
      <div className="px-5 pt-5 pb-8">
        <div className="mb-4 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-primary/15" />
          <div className="rr-chip mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Signal console
          </div>
          <div className="flex items-center gap-3 mb-1">
            <RRLogo size="md" />
            <h1 className="rr-heading text-4xl">Broadcast</h1>
          </div>
          <p className="text-sm text-muted-foreground">Choose the kind of signal you want to send.</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-gradient-to-r from-primary/50 to-border/40" />
            Broadcast types
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {TYPES.map((t) => {
            const styles = TYPE_STYLE_MAP[t.color];
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  'w-full text-left p-5 rounded-[1.35rem] rr-surface transition-all duration-300 group relative overflow-hidden hover:-translate-y-0.5 rr-haptic',
                  styles.hover
                )}
              >
                <div className={cn('absolute top-0 right-0 w-32 h-32 opacity-[0.06] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform duration-500 group-hover:scale-125', styles.glow)} />
                <div className="relative z-10 flex items-center gap-4">
                  <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center border shrink-0', styles.border, styles.bg)}>
                    <SignalIcon type={t.id} size="lg" className="transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-extrabold tracking-[-0.03em] text-xl mb-0.5 text-foreground">{t.label}</div>
                    <div className="text-[13px] text-muted-foreground font-medium">{t.desc}</div>
                  </div>
                  <div className={cn('h-2 w-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity', styles.glow)} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/10 backdrop-blur-sm pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex flex-col items-center gap-3"
            >
              <CheckCircle2 className="w-12 h-12 text-primary" />
              <span className="text-sm font-bold text-primary">Signal broadcasted</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <BroadcastForm type={type} onBack={() => setType(null)} onPosted={handlePosted} />
    </>
  );
}

export default memo(BroadcastCreatePage);
