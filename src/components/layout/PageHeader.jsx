import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';

/**
 * PageHeader — Reusable page header for sub-pages.
 *
 * Props:
 * - title: string — Large bold title
 * - subtitle: string — Optional subtitle below title
 * - backTo: string | number | function — Where to navigate on back. Defaults to -1 (browser back)
 * - rightAction: ReactNode — Optional right-side action element
 * - className: string — Additional classes
 *
 * Design:
 * - Sticky with bg-background/80 backdrop-blur
 * - Height: auto (padding based)
 * - Back button with chevron left
 */
const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  backTo = -1,
  rightAction,
  className,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof backTo === 'function') {
      backTo();
    } else if (typeof backTo === 'string') {
      navigate(backTo);
    } else {
      navigate(backTo);
    }
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-30',
        'bg-background/80 backdrop-blur-xl',
        'border-b border-white/[0.04]',
        className
      )}
    >
      <HStack
        align="center"
        justify="between"
        className="mx-auto max-w-xl px-4 py-3"
      >
        <HStack align="center" gap={2} className="flex-1 min-w-0">
          {/* Back button */}
          <button
            onClick={handleBack}
            className={cn(
              'flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full shrink-0',
              'text-foreground hover:text-primary',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'pressable'
            )}
            aria-label="Go back"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Title group */}
          <VStack gap={0} className="min-w-0">
            <Text
              variant="h2"
              color="default"
              truncate
              className="text-lg font-bold"
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                variant="caption"
                color="muted"
                truncate
              >
                {subtitle}
              </Text>
            )}
          </VStack>
        </HStack>

        {/* Right action */}
        {rightAction && (
          <div className="shrink-0 ml-2">
            {rightAction}
          </div>
        )}
      </HStack>
    </div>
  );
});

export default PageHeader;
