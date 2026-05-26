import { useEffect, memo, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { Map, Marker as MapLibreMarker, useMap as useMapLibre } from 'react-map-gl/maplibre';

const CARTO_DARK_VECTOR_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const US_CENTER = { lat: 39.8283, lng: -98.5795 };

const COLOR_STYLES = {
  alert: {
    shell: 'border-alert/18 bg-black/35 shadow-[0_18px_52px_hsl(0_0%_0%/0.34),0_0_24px_hsl(var(--alert)/0.08)]',
    badge: 'border-alert/25 bg-alert/10 text-alert',
  },
  bike_down: {
    shell: 'border-destructive/18 bg-black/35 shadow-[0_18px_52px_hsl(0_0%_0%/0.34),0_0_24px_hsl(var(--destructive)/0.08)]',
    badge: 'border-destructive/25 bg-destructive/10 text-destructive',
  },
};

function MapLibreMapViewportSync({ center, zoom }) {
  const map = useMapLibre().current;
  const lastViewRef = useRef('');

  useEffect(() => {
    if (!map || center?.lat == null || center?.lng == null) return;
    const nextView = `${center.lat.toFixed(6)}:${center.lng.toFixed(6)}:${zoom}`;
    if (lastViewRef.current === nextView) return;
    lastViewRef.current = nextView;
    const mapInstance = map?.getMap();
    if (!mapInstance) return;
    mapInstance.jumpTo({ center: [center.lng, center.lat], zoom });
  }, [center, zoom, map]);

  return null;
}

const LocationPickerMap = memo(function LocationPickerMap({
  defaultCenter,
  value,
  onChange,
  color = 'alert',
  zoomLevel = null,
}) {
  const center = value ?? defaultCenter ?? US_CENTER;
  const hasPin = value?.lat != null && value?.lng != null;
  const zoom = zoomLevel ?? (hasPin ? 15 : defaultCenter?.lat != null ? 11 : 4);
  const theme = COLOR_STYLES[color] || COLOR_STYLES.alert;

  const handleMapClick = useCallback(
    (e) => {
      onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    },
    [onChange]
  );

  const handleMarkerDragEnd = useCallback(
    (e) => {
      onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    },
    [onChange]
  );

  return (
    <div className={cn('relative h-56 w-full overflow-hidden rounded-2xl backdrop-blur-2xl', theme.shell)}>
      <div className={cn('absolute left-3 top-3 z-[400] flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] backdrop-blur-sm', theme.badge)}>
        <MapPin className="h-3 w-3" />
        {hasPin ? 'Pin placed' : 'Tap map to place pin'}
      </div>
      <Map
        initialViewState={{
          latitude: center.lat,
          longitude: center.lng,
          zoom,
        }}
        mapStyle={CARTO_DARK_VECTOR_STYLE}
        style={{ width: '100%', height: '100%' }}
        scrollZoom={false}
        onClick={handleMapClick}
        attributionControl={false}
        navigationControl={false}
      >
        <MapLibreMapViewportSync center={center} zoom={zoom} />
        {hasPin && (
          <MapLibreMarker
            longitude={value.lng}
            latitude={value.lat}
            draggable
            onDragEnd={handleMarkerDragEnd}
            anchor="center"
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#ef4444',
                border: '3px solid #fff',
                boxShadow: '0 0 10px rgba(239,68,68,0.7)',
              }}
            />
          </MapLibreMarker>
        )}
      </Map>
    </div>
  );
});

export default LocationPickerMap;
