import { memo } from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import OptimizedImage from '@/components/OptimizedImage';

const AlertPhotoGrid = memo(function AlertPhotoGrid({ images = [], variant = 'card' }) {
  const photos = images.filter(Boolean).slice(0, 2);
  if (photos.length === 0) return null;

  const isDetail = variant === 'detail';

  return (
    <div className={cn('grid gap-2', photos.length === 2 && 'grid-cols-2', isDetail ? 'my-5' : 'mb-4')}>
      {photos.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className={cn(
            'relative overflow-hidden rounded-2xl border border-alert/25 bg-black/45 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]',
            isDetail ? 'min-h-56 p-2' : 'min-h-36 p-1.5'
          )}
        >
          <OptimizedImage
            src={url}
            alt={`Alert photo ${index + 1}`}
            containerClassName={cn('h-full w-full', isDetail ? 'max-h-[62vh]' : 'max-h-52')}
            objectFit="contain"
            loading="lazy"
            showSkeleton
            fadeInDuration={250}
          />
          <div className="absolute left-2 top-2 rounded-full border border-alert/30 bg-black/75 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-alert backdrop-blur">
            <ShieldAlert className="mr-1 inline h-3 w-3" /> Photo {index + 1}
          </div>
        </div>
      ))}
    </div>
  );
});

export default AlertPhotoGrid;
