import { useState } from 'react';
import { Bike } from 'lucide-react';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';

export default function ProfileBikePhotoCard({ src, title = 'Bike', bikeLabel }) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/75 shadow-[0_8px_28px_hsl(var(--primary)/0.035),inset_0_1px_0_hsl(0_0%_100%/0.04)] backdrop-blur-xl">
      <VStack gap={3} className="p-3">
        <HStack align="center" justify="between" gap={3} className="px-1">
          <HStack align="center" gap={2} className="min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.08] text-primary">
              <Bike className="h-4 w-4" aria-hidden="true" />
            </span>
            <VStack gap={0} className="min-w-0">
              <Text variant="bodySm" className="font-bold text-foreground">
                {title}
              </Text>
              {bikeLabel && (
                <Text variant="micro" color="muted" className="truncate">
                  {bikeLabel}
                </Text>
              )}
            </VStack>
          </HStack>
        </HStack>

        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
          <OptimizedImage
            src={src}
            alt={bikeLabel ? `${bikeLabel} bike photo` : 'Bike photo'}
            containerClassName="aspect-[16/9] w-full"
            className="h-full w-full"
            objectFit="cover"
            loading="lazy"
            fadeInDuration={180}
            showSkeleton
            onError={() => setImageError(true)}
          />
        </div>
      </VStack>
    </section>
  );
}
