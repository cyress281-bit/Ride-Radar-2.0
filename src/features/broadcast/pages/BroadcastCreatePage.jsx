import { useState, memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import BroadcastForm from '@/features/broadcast/components/BroadcastForm';
import BroadcastTypeSelector from '@/features/broadcast/components/BroadcastTypeSelector';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';

/**
 * Broadcast creation page — Electric Neon Dashboard Mode Selector.
 */
function BroadcastCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get('type');
  const validTypes = ['solo_ride', 'event', 'iso', 'alert'];
  const [type, setType] = useState(validTypes.includes(urlType) ? urlType : null);
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
      <div className="px-5 pt-6 pb-8 pb-safe bg-background min-h-dvh">
        <VStack gap={6}>
          {/* Header */}
          <VStack gap={1}>
            <Text as="h1" variant="h1" className="rr-heading text-2xl">
              Send a Signal
            </Text>
            <Text variant="bodySm" color="muted">
              Choose what you want to send to nearby riders.
            </Text>
          </VStack>

          {/* Type selector */}
          <BroadcastTypeSelector onSelect={setType} />
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
              <span className="text-sm font-bold text-primary rr-neon-green">Signal sent</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <BroadcastForm type={type} onBack={() => setType(null)} onPosted={handlePosted} />
    </>
  );
}

export default memo(BroadcastCreatePage);
