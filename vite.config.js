import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import path from "path";

const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: isVercel ? {
      "@capacitor/status-bar": path.resolve(__dirname, "src/lib/mocks/statusBarMock.js"),
      "@capacitor/local-notifications": path.resolve(__dirname, "src/lib/mocks/localNotificationsMock.js"),
      "@capacitor/app": path.resolve(__dirname, "src/lib/mocks/appMock.js"),
    } : {}
  }
});
