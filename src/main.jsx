import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

const isStaleLocalhostPwaLaunch =
  window.location.hostname === 'localhost' && window.location.port === '3000';

if (isStaleLocalhostPwaLaunch) {
  window.location.replace(`https://rideradarapp.com${window.location.pathname}${window.location.search}${window.location.hash}`);
}

// Initialize monitoring and analytics
import { initializeSentry } from '@/lib/sentry'
import { initializeAnalytics } from '@/lib/analytics'
import { initializeWebVitals } from '@/lib/performanceMonitoring'

// PWA Setup
import { registerServiceWorker, setupInstallPrompt } from '@/lib/registerSW'

// Leaflet CSS is imported by the shared live map surface used by Radar.

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
