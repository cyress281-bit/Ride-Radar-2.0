import { forwardRef, useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { AspectRatio } from '@/components/ui/primitives/AspectRatio';

/**
 * Swipeable image gallery with dot indicators.
 *
 * @param {object} props
 * @param {{url: string, alt?: string}[]} [props.images=[]]
 * @param {number} [props.aspectRatio=16/9]
 * @param {string} [props.className]
 */
export const ImageCarousel = forwardRef(function ImageCarousel(
  { images = [], aspectRatio = 16 / 9, className },
  ref
) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loaded, setLoaded] = useState({});

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi, onSelect]);

  const handleImageLoad = (index) => {
    setLoaded((prev) => ({ ...prev, [index]: true }));
  };

  if (!images.length) {
    return (
      <AspectRatio ratio={aspectRatio} className={cn('bg-muted rounded-xl', className)} />
    );
  }

  return (
    <div ref={ref} className={cn('relative overflow-hidden rounded-xl', className)}>
      <AspectRatio ratio={aspectRatio}>
        <div className="absolute inset-0" ref={emblaRef}>
          <div className="flex h-full">
            {images.map((img, i) => (
              <div key={i} className="relative flex-[0_0_100%] min-w-0 h-full">
                {!loaded[i] && (
                  <div className="absolute inset-0 bg-muted animate-pulse" />
                )}
                <img
                  src={img.url}
                  alt={img.alt || ''}
                  className={cn(
                    'w-full h-full object-cover transition-opacity duration-300',
                    loaded[i] ? 'opacity-100' : 'opacity-0'
                  )}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  onLoad={() => handleImageLoad(i)}
                />
              </div>
            ))}
          </div>
        </div>
      </AspectRatio>

      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === selectedIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});
