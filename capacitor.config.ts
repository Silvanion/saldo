import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saldo.app',
  appName: 'Saldo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
