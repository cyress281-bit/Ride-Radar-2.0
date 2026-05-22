import { useState, memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import BroadcastForm from '@/features/broadcast/components/BroadcastForm';
import BroadcastTypeSelector from '@/features/broadcast/components/BroadcastTypeSelector';

/**
 * Broadcast creation page — Electric Neon Dashboard Mode Selector.
 */
function BroadcastCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get('type');
  const validTypes = ['solo_ride', 'event', 'iso', 'alert', 'bike_down'];
  const [type, setType] = useState(validTypes.includes(urlType) ? urlType : null);

  const handlePosted = useCallback(() => {
    const subtitleByType = {
      solo_ride: 'Nearby riders can see it now.',
      event: 'Your meetup is live.',
      iso: 'Nearby riders can respond.',
      alert: 'Nearby riders can see it now.',
      bike_down: 'Nearby riders can help now.',
    };

    toast.custom(() => (
      <div
        className="w-[min(92vw,22rem)] rounded-[28px] border border-primary/20 bg-background/95 px-4 py-4 shadow-[0_24px_80px_hsl(var(--primary)/0.18),0_0_0_1px_hsl(var(--primary)/0.08)] backdrop-blur-xl"
        style={{ marginTop: 'calc(env(safe-area-inset-top) + 8px)' }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-tight text-foreground">Signal Sent</p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {subtitleByType[type] || 'Nearby riders can see it now.'}
            </p>
          </div>
        </div>
      </div>
    ), {
      duration: 2200,
    });

    navigate('/home', { replace: true });
  }, [navigate, type]);

  if (!type) {
    return (
      <div className="px-5 pt-6 pb-nav-safe bg-background min-h-dvh">
        {/* Type selector */}
        <BroadcastTypeSelector onSelect={setType} />
      </div>
    );
  }

  return (
    <BroadcastForm type={type} onBack={() => setType(null)} onPosted={handlePosted} />
  );
}

export default memo(BroadcastCreatePage);
