import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
const versionJsonPath = path.resolve(import.meta.dirname, "version.json");
const swTemplatePath = path.resolve(import.meta.dirname, "public", "sw.js");

function getVersionFromJson(): string {
  const json = fs.readFileSync(versionJsonPath, "utf8");
  const parsed = JSON.parse(json) as { version?: string };
  if (!parsed.version || !/^\d+\.\d+\.\d+$/.test(parsed.version)) {
    throw new Error("version.json must contain semver `version`.");
  }
  return parsed.version;
}

function resolveServiceWorkerTemplate(version: string): string {
  const swTemplate = fs.readFileSync(swTemplatePath, "utf8");
  return swTemplate
    .replaceAll("__VERSION_JSON_SEMVER__", version)
    .replaceAll("__APP_ASSET_LIST__", "");
}

const versionJsonPlugin = (): Plugin => ({
  name: "version-json-plugin",
  configureServer(server) {
    server.middlewares.use("/version.json", (_req: any, res: any) => {
      const json = fs.readFileSync(versionJsonPath, "utf8");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(json);
    });
    server.middlewares.use("/sw.js", (_req: any, res: any) => {
      const version = getVersionFromJson();
      const sw = resolveServiceWorkerTemplate(version);
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "no-store");
      res.end(sw);
    });
  },
  generateBundle() {
    const json = fs.readFileSync(versionJsonPath, "utf8");
    const version = getVersionFromJson();
    const sw = resolveServiceWorkerTemplate(version);
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: json,
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
