import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.aina.lifemaxxing',
  appName: 'LifeMaxxing',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#030712',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#030712',
    },
  },
};

export default config;
