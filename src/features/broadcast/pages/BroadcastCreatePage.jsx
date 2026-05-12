import { useState, memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Route, Search, CalendarClock, CheckCircle2 } from 'lucide-react';
import SignalIcon from '@/components/brand/SignalIcon';
import RRLogo from '@/components/RRLogo';
import BroadcastForm from '@/features/broadcast/components/BroadcastForm';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const TYPES = [
  { id: 'solo_ride', label: 'Solo Ride', desc: 'Open a live riding signal', icon: Route, color: 'solo' },
  { id: 'iso', label: 'In Search Of', desc: 'Find wrench help or a bike crew', icon: Search, color: 'iso' },
  { id: 'event', label: 'Event', desc: 'Stage a meetup or group ride', icon: CalendarClock, color: 'event' },
  { id: 'alert', label: 'Alert', desc: 'Road hazard, one-way broadcast', icon: ShieldAlert, color: 'alert' },
];

const TYPE_STYLE_MAP = {
  solo: {
    hover: 'hover:border-primary/60 hover:bg-primary/[0.06]',
    glow: 'bg-primary',
    border: 'border-primary/30',
    text: 'text-primary',
    bg: 'bg-primary/10',
    borderLeft: 'border-l-primary/60 hover:border-l-primary',
    neonText: 'rr-neon-green',
    glowClass: 'glow-kawasaki-sm',
    ringHover: 'group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.35)]',
  },
  iso: {
    hover: 'hover:border-brand-radar/60 hover:bg-brand-radar/[0.06]',
    glow: 'bg-brand-radar',
    border: 'border-brand-radar/30',
    text: 'text-brand-radar',
    bg: 'bg-brand-radar/10',
    borderLeft: 'border-l-brand-radar/60 hover:border-l-brand-radar',
    neonText: 'rr-neon-blue',
    glowClass: 'glow-yamaha',
    ringHover: 'group-hover:shadow-[0_0_20px_hsl(var(--brand-radar)/0.35)]',
  },
  event: {
    hover: 'hover:border-brand-amber/60 hover:bg-brand-amber/[0.06]',
    glow: 'bg-brand-amber',
    border: 'border-brand-amber/30',
    text: 'text-brand-amber',
    bg: 'bg-brand-amber/10',
    borderLeft: 'border-l-brand-amber/60 hover:border-l-brand-amber',
    neonText: '',
    glowClass: 'glow-ducati',
    ringHover: 'group-hover:shadow-[0_0_20px_hsl(var(--brand-amber)/0.35)]',
  },
  alert: {
    hover: 'hover:border-brand-emergency/60 hover:bg-brand-emergency/[0.06]',
    glow: 'bg-brand-emergency',
    border: 'border-brand-emergency/30',
    text: 'text-brand-emergency',
    bg: 'bg-brand-emergency/10',
    borderLeft: 'border-l-brand-emergency/60 hover:border-l-brand-emergency',
    neonText: 'rr-neon-red',
    glowClass: 'glow-honda',
    ringHover: 'group-hover:shadow-[0_0_20px_hsl(var(--brand-emergency)/0.35)]',
  },
};

/**
 * Broadcast creation page — Electric Neon Dashboard Mode Selector.
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
      <div className="px-5 pt-5 pb-8 min-h-dvh-safe bg-background">
        {/* Header — glassmorphism hero */}
        <div className="mb-8 backdrop-blur-xl bg-surface/80 border border-white/[0.06] rounded-[24px] p-6 relative overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/[0.06] blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-brand-radar/[0.05] blur-3xl" />

          <div className="rr-chip mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Signal console
          </div>
          <HStack gap={3} align="center" className="mb-2">
            <RRLogo size="md" />
            <Text as="h1" variant="h1" className="rr-heading text-2xl sm:text-3xl">Broadcast</Text>
          </HStack>
          <Text variant="bodySm" color="muted" className="max-w-[280px]">
            Choose the kind of signal you want to send.
          </Text>
          <div className="mt-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
            Select mode
            <span className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
          </div>
        </div>

        {/* Type selector cards — dashboard mode style */}
        <VStack gap={4}>
          {TYPES.map((t, index) => {
            const styles = TYPE_STYLE_MAP[t.color];
            return (
              <motion.button
                key={t.id}
                onClick={() => setType(t.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07, duration: 0.4, ease: 'easeOut' }}
                className={cn(
                  'w-full text-left p-5 rounded-[22px] transition-all duration-300 group relative overflow-hidden hover:-translate-y-0.5 pressable border-l-[3px] bg-surface-elevated/70',
                  styles.hover,
                  styles.borderLeft
                )}
                style={{
                  border: '1px solid hsl(var(--border) / 0.4)',
                  borderLeftWidth: '3px',
                }}
              >
                {/* Ambient color glow */}
                <div className={cn(
                  'absolute top-0 right-0 w-52 h-52 opacity-[0.06] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-all duration-500 group-hover:opacity-[0.14] group-hover:scale-125',
                  styles.glow
                )} />

                {/* Bottom neon indicator line */}
                <div className={cn(
                  'absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 rounded-full',
                  styles.glow
                )} />

                <HStack gap={4} align="center" className="relative z-10">
                  {/* Icon container with neon ring */}
                  <div className={cn(
                    'h-14 w-14 rounded-2xl flex items-center justify-center border shrink-0 transition-all duration-300 group-hover:scale-105',
                    styles.border,
                    styles.bg,
                    styles.ringHover
                  )}>
                    <SignalIcon type={t.id} size="lg" className="transition-transform duration-300 group-hover:scale-110" />
                  </div>

                  <VStack gap={0.5} flex>
                    <Text variant="h3" className={cn('text-base font-bold transition-colors duration-200', styles.text, styles.neonText)}>
                      {t.label}
                    </Text>
                    <Text variant="bodySm" color="muted" className="font-medium">{t.desc}</Text>
                  </VStack>

                  {/* Selection indicator dot with glow */}
                  <div className={cn(
                    'h-2.5 w-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300',
                    styles.glow,
                    styles.glowClass
                  )} />
                </HStack>
              </motion.button>
            );
          })}
        </VStack>
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
              <CheckCircle2 className="w-12 h-12 text-primary animate-glow-pulse" />
              <span className="text-sm font-bold text-primary rr-neon-green">Signal broadcasted</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <BroadcastForm type={type} onBack={() => setType(null)} onPosted={handlePosted} />
    </>
  );
}

export default memo(BroadcastCreatePage);
