import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rideradarapp.app',
  appName: 'Ride Radar',
  webDir: 'dist',
  backgroundColor: '#040406',
  ios: {
    scheme: 'App',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
