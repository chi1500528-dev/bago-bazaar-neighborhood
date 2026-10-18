import type { CapacitorConfig } from "@capacitor/cli";

// The native shell loads the live site, so server-side pages and the
// /api/public/sb relay (no-VPN access) keep working inside the app.
const config: CapacitorConfig = {
  appId: "com.bagomarket.app",
  appName: "Bago Market",
  webDir: "capacitor-www",
  server: {
    url: "https://bago-bazaar-neighborhood.lovable.app",
    cleartext: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, backgroundColor: "#0f3b25" },
    StatusBar: { backgroundColor: "#0f3b25", style: "DARK" },
  },
};

export default config;
