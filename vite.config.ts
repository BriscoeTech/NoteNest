import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const appVersion = process.env.npm_package_version ?? "0.0.0";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src", "src"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  root: path.resolve(import.meta.dirname, "src"),
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
