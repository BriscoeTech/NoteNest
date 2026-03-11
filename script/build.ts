import { build as viteBuild } from "vite";
import path from "path";
import fs from "fs";

type VersionFile = { version?: string };

function readVersion(versionFilePath: string): string {
  const raw = fs.readFileSync(versionFilePath, "utf8");
  const parsed = JSON.parse(raw) as VersionFile;
  if (!parsed.version || !/^\d+\.\d+\.\d+$/.test(parsed.version)) {
    throw new Error("version.json must contain semver `version`.");
  }
  return parsed.version;
}

function buildServiceWorkerFromTemplate(templatePath: string, version: string): string {
  const template = fs.readFileSync(templatePath, "utf8");
  return template.replaceAll("__VERSION_JSON_SEMVER__", version);
}

async function buildAll() {
  console.log("building client for GitHub Pages...");
  const projectRoot = path.resolve(import.meta.dirname, "..");
  const docsRoot = path.resolve(projectRoot, "docs");
  const versionPath = path.resolve(projectRoot, "version.json");
  const swTemplatePath = path.resolve(projectRoot, "public", "sw.js");

  await viteBuild({
    configFile: path.resolve(projectRoot, "vite.config.ts"),
    build: {
      // Ensure output lands at repo-root /docs for GitHub Pages.
      outDir: docsRoot,
      emptyOutDir: true,
    },
    root: path.resolve(projectRoot, "src"),
    base: "./", 
  });

  const version = readVersion(versionPath);
  const resolvedSw = buildServiceWorkerFromTemplate(swTemplatePath, version);
  fs.writeFileSync(path.resolve(docsRoot, "sw.js"), resolvedSw, "utf8");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
