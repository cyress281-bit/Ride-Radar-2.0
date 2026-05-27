import { memo, useCallback, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock.js';
import { useGestureCoordinator, GesturePriority } from '@/gestures/gesture-coordinator.js';

const HEIGHT_MAP = {
  auto: undefined,
  half: '50vh',
  full: '100dvh',
};

/**
 * BottomSheet — Reusable bottom sheet component.
 *
 * Props:
 * - isOpen: boolean — Controlled open state
 * - onClose: () => void — Called when sheet should close
 * - title: string — Sheet title
 * - children: ReactNode — Sheet content
 * - height: 'auto' | 'full' | 'half' — Sheet height preset
 * - className: string — Additional classes for content area
 *
 * Design:
 * - Rounded top corners (24px), drag handle, backdrop overlay
 * - Swipe to dismiss via drag handle
 * - Animation: slide up from bottom, fade backdrop
 * - Uses Radix Dialog primitives
 */
const BottomSheet = memo(function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  className,
}) {
  useBodyScrollLock(isOpen);

  // Gesture coordination: overlay drag takes priority over scroll
  const gestures = useGestureCoordinator('bottom-sheet', GesturePriority.OVERLAY);

  const contentRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    currentY.current = e.clientY;
    document.body.style.userSelect = 'none';

    const content = contentRef.current;
    if (content) {
      content.style.transition = 'none';
    }
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    currentY.current = e.clientY;

    const deltaY = Math.max(0, currentY.current - startY.current);
    const content = contentRef.current;
    if (content) {
      content.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.userSelect = '';

    const deltaY = currentY.current - startY.current;
    const content = contentRef.current;
    if (content) {
      content.style.transition = '';
      if (deltaY > 120) {
        onClose();
      } else {
        content.style.transform = '';
      }
    }
  }, [onClose]);

  // Attach global pointer events for drag
  useEffect(() => {
    if (!isOpen) return;

    const onMove = (e) => handlePointerMove(e);
    const onUp = () => handlePointerUp();
    const onCancel = () => {
      isDragging.current = false;
      document.body.style.userSelect = '';
      const content = contentRef.current;
      if (content) {
        content.style.transition = '';
        content.style.transform = '';
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [isOpen, handlePointerMove, handlePointerUp]);

  // Reset transform when opening
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.style.transform = '';
    }
  }, [isOpen]);

  const heightStyle = HEIGHT_MAP[height];

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Backdrop overlay — Radix onOpenChange already closes on outside click */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'transition-all duration-200'
          )}
        />

        {/* Sheet content */}
        <DialogPrimitive.Content
          ref={contentRef}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50',
            'bg-surface border-t border-white/[0.06]',
            'rounded-t-[24px]',
            'shadow-depth-5',
            'flex flex-col',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
            'data-[state=open]:duration-300 data-[state=closed]:duration-200',
            'outline-none',
            className
          )}
          style={{
            maxHeight: heightStyle,
            height: heightStyle,
            paddingBottom: 'env(keyboard-inset-height, 0px)',
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          {/* Drag handle */}
          <div
            className={cn(
              'flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing',
              'touch-none select-none'
            )}
            onPointerDown={handlePointerDown}
            {...gestures.bindOverlayHandle()}
            role="button"
            aria-label="Drag to close"
            tabIndex={0}
          >
            <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header with title and close */}
          {title && (
            <VStack className="px-5 pb-3">
              <HStack
                align="center"
                justify="between"
                className="min-h-[40px]"
              >
                <DialogPrimitive.Title asChild>
                  <Text variant="h3" color="default" className="text-base font-bold">
                    {title}
                  </Text>
                </DialogPrimitive.Title>

                <DialogPrimitive.Close
                  onClick={onClose}
                  className={cn(
                    'flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full',
                    'text-muted-foreground hover:text-foreground',
                    'transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    'pressable'
                  )}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </DialogPrimitive.Close>
              </HStack>
            </VStack>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pb-safe">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});

export default BottomSheet;
