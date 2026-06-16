import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

const swTemplatePath = path.resolve(import.meta.dirname, "public", "sw.js");

function getBuildTimestamp(): string {
  const builtAt = process.env.NOTENEST_BUILT_AT || new Date().toISOString();
  if (Number.isNaN(Date.parse(builtAt))) {
    throw new Error("Build timestamp must be a valid date string.");
  }
  return builtAt;
}

function serializeBuildInfo(builtAt: string): string {
  return `${JSON.stringify({ builtAt }, null, 2)}\n`;
}

function resolveServiceWorkerTemplate(builtAt: string): string {
  const swTemplate = fs.readFileSync(swTemplatePath, "utf8");
  return swTemplate
    .replaceAll("__BUILT_AT__", builtAt)
    .replaceAll("__APP_ASSET_LIST__", "");
}

const buildInfoPlugin = (): Plugin => ({
  name: "build-info-plugin",
  configureServer(server) {
    const builtAt = getBuildTimestamp();
    server.middlewares.use("/build-info.json", (_req: any, res: any) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(serializeBuildInfo(builtAt));
    });
    server.middlewares.use("/sw.js", (_req: any, res: any) => {
      const sw = resolveServiceWorkerTemplate(builtAt);
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "no-store");
      res.end(sw);
    });
  },
  generateBundle() {
    const builtAt = getBuildTimestamp();
    const sw = resolveServiceWorkerTemplate(builtAt);
    this.emitFile({
      type: "asset",
      fileName: "build-info.json",
      source: serializeBuildInfo(builtAt),
    });
    this.emitFile({
      type: "asset",
      fileName: "sw.js",
      source: sw,
    });
  },
});

export default defineConfig({
  plugins: [
    buildInfoPlugin(),
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
