import type { CapacitorConfig } from "@capacitor/cli";

// The native shell loads the live site, so server-side pages and the
// /api/public/sb relay (no-VPN access) keep working inside the app.
const config: CapacitorConfig = {
  appId: "com.bagomarket.app",
  appName: "Bago Market",
  webDir: "capacitor-www",
  server: {
    url: "https://bagomarket.shop",
    cleartext: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, backgroundColor: "#0f3b25" },
    StatusBar: { overlaysWebView: false, backgroundColor: "#0f3b25", style: "DARK" },
    // Android 15+ forces edge-to-edge; expose real insets as --safe-area-inset-* CSS vars.
    SystemBars: { insetsHandling: "css", style: "DARK" },
  },
};

export default config;
