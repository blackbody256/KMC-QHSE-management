import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the Vite server proxies to the gateway, so the browser sees a
// single origin. That matters: the session cookie is HttpOnly and SameSite,
// and a cross-origin development setup would behave differently from
// production in exactly the area least forgiving of surprises.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": { target: "http://localhost:8081", changeOrigin: false },
      "/api": { target: "http://localhost:8081", changeOrigin: false },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
