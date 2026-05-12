import { memo } from 'react';
import { Crosshair, Layers, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HStack, VStack } from '@/components/ui/primitives/Stack';

/**
 * MapOverlay — Map UI overlay components for radar aesthetic.
 *
 * @param {object} props
 * @param {() => void} [props.onRecenter]
 * @param {() => void} [props.onLayerToggle]
 * @param {() => void} [props.onZoomIn]
 * @param {() => void} [props.onZoomOut]
 * @param {boolean} [props.showLayerToggle]
 * @param {string} [props.className]
 */
export const MapOverlay = memo(function MapOverlay({
  onRecenter,
  onLayerToggle,
  onZoomIn,
  onZoomOut,
  showLayerToggle = true,
  className,
}) {
  return (
    <VStack
      align="end"
      gap={2}
      className={cn('absolute right-3 top-3 z-[420] pointer-events-none', className)}
    >
      {/* Recenter button */}
      {onRecenter && (
        <MapOverlayButton onClick={onRecenter} aria-label="Recenter map">
          <Crosshair className="h-4 w-4" />
        </MapOverlayButton>
      )}

      {/* Layer toggle */}
      {showLayerToggle && onLayerToggle && (
        <MapOverlayButton onClick={onLayerToggle} aria-label="Toggle map layer">
          <Layers className="h-4 w-4" />
        </MapOverlayButton>
      )}

      {/* Zoom controls */}
      <VStack align="center" gap={1} className="pointer-events-auto">
        {onZoomIn && (
          <MapOverlayButton onClick={onZoomIn} aria-label="Zoom in">
            <Plus className="h-4 w-4" />
          </MapOverlayButton>
        )}
        {onZoomOut && (
          <MapOverlayButton onClick={onZoomOut} aria-label="Zoom out">
            <Minus className="h-4 w-4" />
          </MapOverlayButton>
        )}
      </VStack>
    </VStack>
  );
});

/**
 * MapOverlayButton — Glassmorphism button for map overlays.
 */
export const MapOverlayButton = memo(function MapOverlayButton({
  children,
  onClick,
  className,
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'pointer-events-auto flex items-center justify-center',
        'h-9 w-9 rounded-lg',
        'bg-surface/80 backdrop-blur-xl',
        'border border-primary/10',
        'text-foreground hover:text-primary',
        'transition-all duration-150',
        'active:scale-95',
        'shadow-depth-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

/**
 * MapLegend — Legend overlay for map data.
 */
export const MapLegend = memo(function MapLegend({ items, className }) {
  return (
    <div
      className={cn(
        'pointer-events-auto inline-flex flex-wrap items-center gap-3',
        'rounded-xl bg-surface/80 backdrop-blur-xl border border-primary/10',
        'px-3 py-2 shadow-depth-2',
        className
      )}
    >
      {items.map((item) => (
        <HStack key={item.label} align="center" gap={1.5}>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}` }}
          />
          <span className="text-[11px] font-medium text-muted-foreground">
            {item.label}
          </span>
        </HStack>
      ))}
    </div>
  );
});
