const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function getSubdomain(x, y) {
  return ['a', 'b', 'c', 'd'][(x + y) % 4];
}

function latLngToTileXY(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function buildTileUrl(x, y, z) {
  const s = getSubdomain(x, y);
  return DARK_TILE_URL
    .replace('{s}', s)
    .replace('{z}', z)
    .replace('{x}', x)
    .replace('{y}', y)
    .replace('{r}', '');
}

/**
 * Preload a grid of tiles around a lat/lng for given zoom levels.
 * This warms the browser cache and service worker cache for offline use.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number[]} zoomLevels - e.g. [10, 11, 12, 13, 14]
 * @param {number} radius - tile radius around center (default 2 = 5x5 grid)
 */
export function preloadTilesAround(lat, lng, zoomLevels = [12, 13, 14], radius = 2) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !zoomLevels?.length) return;

  const urls = [];
  for (const z of zoomLevels) {
    const center = latLngToTileXY(lat, lng, z);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = center.x + dx;
        const y = center.y + dy;
        const maxTile = Math.pow(2, z) - 1;
        if (x < 0 || x > maxTile || y < 0 || y > maxTile) continue;
        urls.push(buildTileUrl(x, y, z));
      }
    }
  }

  const uniqueUrls = [...new Set(urls)];
  if (!uniqueUrls.length) return;

  // Fetch tiles with limited concurrency to avoid hammering the CDN
  let index = 0;
  const concurrency = 6;

  function fetchNext() {
    if (index >= uniqueUrls.length) return;
    const url = uniqueUrls[index++];
    fetch(url, { mode: 'cors', credentials: 'omit' })
      .catch(() => {
        /* ignore preload errors — tile may be outside coverage */
      })
      .finally(() => {
        setTimeout(fetchNext, 40);
      });
  }

  for (let i = 0; i < concurrency; i++) {
    fetchNext();
  }
}
