import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.recompd.mobile",
  appName: "RECOMP'D",
  webDir: "dist",
  server: {
    url: "https://recompd.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
