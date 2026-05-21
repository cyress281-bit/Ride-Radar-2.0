import { useEffect, memo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const US_CENTER = { lat: 39.8283, lng: -98.5795 };

const alertPinIcon = divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 0 10px rgba(239,68,68,0.7);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapClickHandler({ onChange }) {
  useMapEvents({
    click: (e) => {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapViewportSync({ center, zoom }) {
  const map = useMap();
  const lastViewRef = useRef('');

  useEffect(() => {
    if (center?.lat == null || center?.lng == null) return;
    const nextView = `${center.lat.toFixed(6)}:${center.lng.toFixed(6)}:${zoom}`;
    if (lastViewRef.current === nextView) return;
    lastViewRef.current = nextView;
    map.setView([center.lat, center.lng], zoom, { animate: false });
  }, [center, zoom, map]);

  return null;
}

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

const LocationPickerMap = memo(function LocationPickerMap({ defaultCenter, value, onChange, color = 'alert', zoomLevel = null }) {
  const center = value ?? defaultCenter ?? US_CENTER;
  const hasPin = value?.lat != null && value?.lng != null;
  const zoom = zoomLevel ?? (hasPin ? 15 : defaultCenter?.lat != null ? 11 : 4);
  const theme = COLOR_STYLES[color] || COLOR_STYLES.alert;

  return (
    <div className={cn('relative h-56 w-full overflow-hidden rounded-2xl backdrop-blur-2xl', theme.shell)}>
      <div className={cn('absolute left-3 top-3 z-[400] flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] backdrop-blur-sm', theme.badge)}>
        <MapPin className="h-3 w-3" />
        {hasPin ? 'Pin placed' : 'Tap map to place pin'}
      </div>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={3}
        maxZoom={18}
        scrollWheelZoom={false}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={DARK_TILE_URL}
          subdomains="abcd"
          crossOrigin="anonymous"
        />
        <MapViewportSync center={center} zoom={zoom} />
        <MapClickHandler onChange={onChange} />
        {hasPin && (
          <>
            <Marker
              position={[value.lat, value.lng]}
              draggable
              icon={alertPinIcon}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  onChange({ lat: pos.lat, lng: pos.lng });
                },
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
});

export default LocationPickerMap;
