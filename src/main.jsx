import React from 'react';
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
  console.error('[Unhandled Rejection]', event.reason);
  // Sentry will auto-capture in production via its default integration
});

window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[main.jsx] Root element not found. Unable to mount React app.');
} else {
  ReactDOM.createRoot(rootElement).render(<App />);
}
