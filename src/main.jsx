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
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Service worker registration failed:', err);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
