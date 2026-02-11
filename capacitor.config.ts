import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ticketsystem',
  appName: 'A Lovable project',
  webDir: 'dist',
  server: {
    url: 'https://86178a98-0fa2-4c5b-9aa3-f110599560c9.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
