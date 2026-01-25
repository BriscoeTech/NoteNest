import { build as viteBuild } from "vite";
import path from "path";

async function buildAll() {
  console.log("building client for GitHub Pages...");
  await viteBuild({
    build: {
      // Ensure output lands at repo-root /docs for GitHub Pages.
      outDir: path.resolve(import.meta.dirname, "..", "docs"),
      emptyOutDir: true,
    },
    base: "./", 
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
