#!/usr/bin/env bash
# Apply changes for LiveMap lazy-loading and commit
set -e
git add src/components/map/LiveMapSurface.lazy.jsx src/pages/LiveMap.jsx
if git commit -m "feat(live-map): lazy-load leaflet, lazy map surface, CSS lazy-load, error/loading states"; then
  git push
else
  echo "No changes to commit or commit failed."
fi