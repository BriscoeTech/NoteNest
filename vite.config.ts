import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

const packageJsonPath = path.resolve(import.meta.dirname, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
  version?: string;
};
const appVersion = packageJson.version ?? "0.0.0";
const htmlVersionPlugin = {
  name: "html-version-plugin",
  transformIndexHtml(html: string) {
    return html.replaceAll("__APP_VERSION__", appVersion);
  },
};

export default defineConfig({
  plugins: [
    htmlVersionPlugin,
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
