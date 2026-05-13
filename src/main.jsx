import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize monitoring and analytics
import { initializeSentry } from './lib/sentry';
import { initializeAnalytics } from './lib/analytics';
import { initializeWebVitals } from './lib/performanceMonitoring';

initializeSentry();
initializeAnalytics();
initializeWebVitals();

// Register service worker for PWA
import { registerServiceWorker, setupInstallPrompt } from './lib/registerSW';

setupInstallPrompt();
registerServiceWorker();

// Catch async errors that error boundaries cannot capture
window.addEventListener('unhandledrejection', (event) => {
  // Ignore benign errors
  const msg = event.reason?.message || String(event.reason);
  if (
    msg.includes('ResizeObserver loop limit exceeded') ||
    msg.includes('NetworkError') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Auth session missing') ||
    msg.includes('chunk load')
  ) {
    event.preventDefault();
    return;
  }
  // Log to console; Sentry auto-captures unhandled rejections in production
  if (import.meta.env.DEV) {
    console.error('[Global] Unhandled rejection:', event.reason);
  }
});

window.addEventListener('error', (event) => {
  // Ignore browser extension errors and Leaflet tile 404s
  const msg = event.message || '';
  const src = event.filename || '';
  if (
    src.includes('chrome-extension://') ||
    src.includes('moz-extension://') ||
    src.includes('safari-extension://') ||
    msg.includes('ResizeObserver loop limit exceeded') ||
    msg.includes('NetworkError')
  ) {
    event.preventDefault();
    return;
  }
  if (import.meta.env.DEV) {
    console.error('[Global] Uncaught error:', event.error);
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  // Root element not found — app cannot mount
} else {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
