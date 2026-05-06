import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Initialize monitoring and analytics
import { initializeSentry } from '@/lib/sentry'
import { initializeAnalytics } from '@/lib/analytics'
import { initializeWebVitals } from '@/lib/performanceMonitoring'

// PWA Setup
import { registerServiceWorker, setupInstallPrompt } from '@/lib/registerSW'

// Leaflet CSS is now loaded dynamically when RadarMapView is lazy-loaded.
// This avoids including ~10KB of CSS in the initial bundle for users who
// never open the map view. The CSS is imported inside RadarMapView.jsx instead.

// Initialize error tracking and performance monitoring
initializeSentry()
initializeAnalytics()
initializeWebVitals()

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  registerServiceWorker()
  setupInstallPrompt()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)