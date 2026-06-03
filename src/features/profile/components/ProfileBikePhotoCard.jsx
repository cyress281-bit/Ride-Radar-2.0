import { useState } from 'react';
import { Bike } from 'lucide-react';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';

export default function ProfileBikePhotoCard({ src, title = 'Bike', bikeLabel }) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) return null;

  return (
    <section className="relative py-4 border-b border-white/[0.06]">
      <VStack gap={3} className="relative">
        <HStack align="center" justify="between" gap={3} className="px-1">
          <HStack align="center" gap={2} className="min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-primary">
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

        <div className="overflow-hidden rounded-xl">
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
