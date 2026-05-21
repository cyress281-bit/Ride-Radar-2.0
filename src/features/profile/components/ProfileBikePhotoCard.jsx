import { useState } from 'react';
import { Bike } from 'lucide-react';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';

export default function ProfileBikePhotoCard({ src, title = 'Bike', bikeLabel }) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.10] bg-surface/85 shadow-[0_18px_56px_hsl(0_0%_0%/0.38),inset_0_1px_0_hsl(0_0%_100%/0.05)] backdrop-blur-2xl">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.10),transparent_58%)]" />
      <VStack gap={3} className="relative p-4">
        <HStack align="center" justify="between" gap={3} className="px-1">
          <HStack align="center" gap={2} className="min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.10] text-primary shadow-[0_0_18px_hsl(var(--primary)/0.14)]">
              <Bike className="h-4 w-4" aria-hidden="true" />
            </span>
            <VStack gap={0} className="min-w-0">
              <Text variant="bodySm" className="font-semibold tracking-tight text-foreground">
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

        <div className="overflow-hidden rounded-xl border border-white/[0.10] bg-black/35 shadow-[0_12px_32px_hsl(0_0%_0%/0.32)]">
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
