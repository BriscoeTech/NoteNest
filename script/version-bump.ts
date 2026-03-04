import fs from "fs";
import path from "path";

type BumpType = "patch" | "minor";
type VersionFile = { version: string };

function parseSemver(input: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(input);
  if (!match) {
    throw new Error(`Invalid semver in version.json: "${input}"`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function bumpVersion(version: string, type: BumpType): string {
  const [major, minor, patch] = parseSemver(version);
  if (type === "minor") {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

function main() {
  const bumpType = (process.argv[2] ?? "minor") as BumpType;
  if (bumpType !== "minor" && bumpType !== "patch") {
    throw new Error(`Unsupported bump type "${bumpType}". Use "minor" or "patch".`);
  }

  const versionPath = path.resolve(import.meta.dirname, "..", "version.json");
  const raw = fs.readFileSync(versionPath, "utf8");
  const parsed = JSON.parse(raw) as VersionFile;
  if (!parsed.version) {
    throw new Error("version.json is missing \"version\".");
  }

  const next = bumpVersion(parsed.version, bumpType);
  fs.writeFileSync(versionPath, `${JSON.stringify({ version: next }, null, 2)}\n`, "utf8");
  console.log(`v${next}`);
}

main();
