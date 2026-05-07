@echo off
REM Apply changes for LiveMap lazy-loading and commit
git add src/components/map/LiveMapSurface.lazy.jsx src/pages/LiveMap.jsx
git commit -m "feat(live-map): lazy-load leaflet, lazy map surface, CSS lazy-load, error/loading states"
if %errorlevel% neq 0 (
  echo No changes to commit or commit failed.
) else (
  git push
)
pause