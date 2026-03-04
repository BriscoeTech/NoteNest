import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
const versionJsonPath = path.resolve(import.meta.dirname, "version.json");

const versionJsonPlugin = (): Plugin => ({
  name: "version-json-plugin",
  configureServer(server) {
    server.middlewares.use("/version.json", (_req: any, res: any) => {
      const json = fs.readFileSync(versionJsonPath, "utf8");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(json);
    });
  },
  generateBundle() {
    const json = fs.readFileSync(versionJsonPath, "utf8");
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: json,
    });
  },
});

export default defineConfig({
  plugins: [
    versionJsonPlugin(),
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
