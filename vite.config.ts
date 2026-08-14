import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-512-maskable.png",
        "icons/apple-touch-icon.png",
      ],
      manifest: {
        name: "パチンコ回転数カウンター",
        short_name: "回転数カウンター",
        description: "パチンコのデータカウンター回転数を記録する",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#11141c",
        theme_color: "#11141c",
        lang: "ja",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  base: "/pcnk-counter/",
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
});
