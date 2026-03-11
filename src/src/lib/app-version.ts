let runtimeVersionJsonSemver = "";
export let RUNTIME_VERSION_DISPLAY = "";

function toDisplayVersion(version: string): string {
  if (!version) return "";
  const normalized = version.replace(/^v/, "");
  const [major = "", minor = ""] = normalized.split(".");
  if (!major || !minor) return "";
  return `v${major}.${minor}`;
}

export async function loadAppVersion(): Promise<string> {
  try {
    const response = await fetch("./version.json", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { version?: string };
      if (data.version && /^\d+\.\d+\.\d+$/.test(data.version)) {
        runtimeVersionJsonSemver = data.version;
      }
    }
  } catch {
    // Keep empty version if version.json is unavailable.
  }
  RUNTIME_VERSION_DISPLAY = toDisplayVersion(runtimeVersionJsonSemver);
  return RUNTIME_VERSION_DISPLAY;
}
