import { build as viteBuild } from "vite";

async function buildAll() {
  console.log("building client for GitHub Pages...");
  await viteBuild({
    build: {
      outDir: "docs",
      emptyOutDir: true,
    },
    base: "./", 
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
