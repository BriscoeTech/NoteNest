import { build as viteBuild } from "vite";
import path from "path";
import fs from "fs";

function buildServiceWorkerFromTemplate(templatePath: string, builtAt: string): string {
  const template = fs.readFileSync(templatePath, "utf8");
  return template.replaceAll("__BUILT_AT__", builtAt);
}

function collectBuiltAssetEntries(assetsRoot: string): string[] {
  if (!fs.existsSync(assetsRoot)) {
    return [];
  }

  const entries = fs.readdirSync(assetsRoot, { withFileTypes: true });
  const assetFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => `./assets/${entry.name}`)
    .sort();

  return assetFiles;
}

function injectBuiltAssets(swSource: string, assetEntries: string[]): string {
  const serializedAssets = assetEntries.map((entry) => `'${entry}',`).join("\n  ");
  return swSource.replaceAll("__APP_ASSET_LIST__", serializedAssets);
}

async function buildAll() {
  console.log("building client for GitHub Pages...");
  const projectRoot = path.resolve(import.meta.dirname, "..");
  const docsRoot = path.resolve(projectRoot, "docs");
  const swTemplatePath = path.resolve(projectRoot, "public", "sw.js");
  const builtAt = new Date().toISOString();
  process.env.NOTENEST_BUILT_AT = builtAt;

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

  const builtAssetEntries = collectBuiltAssetEntries(path.resolve(docsRoot, "assets"));
  const swTemplate = buildServiceWorkerFromTemplate(swTemplatePath, builtAt);
  const resolvedSw = injectBuiltAssets(swTemplate, builtAssetEntries);
  fs.writeFileSync(path.resolve(docsRoot, "sw.js"), resolvedSw, "utf8");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
