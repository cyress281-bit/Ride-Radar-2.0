import LiveMapSurface from '@/components/map/LiveMapSurface';

/**
 * Home preview wrapper for the shared live map surface.
 * The full product surface lives at /live-map.
 */
export default function RadarMapView(props) {
  return <LiveMapSurface {...props} variant="preview" />;
}
