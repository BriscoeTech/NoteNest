const VERSION_CACHE_KEY = "notenest-runtime-version";
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

let runtimeVersionJsonSemver = "";
export let RUNTIME_VERSION_DISPLAY = "";

function toDisplayVersion(version: string): string {
  if (!version) return "";
  const normalized = version.replace(/^v/, "");
  const [major = "", minor = ""] = normalized.split(".");
  if (!major || !minor) return "";
  return `v${major}.${minor}`;
}

function setRuntimeVersion(version: string): void {
  runtimeVersionJsonSemver = version;
  RUNTIME_VERSION_DISPLAY = toDisplayVersion(version);
}

function readCachedVersion(): string {
  if (typeof window === "undefined") return "";
  try {
    const cachedVersion = window.localStorage.getItem(VERSION_CACHE_KEY) || "";
    return VERSION_PATTERN.test(cachedVersion) ? cachedVersion : "";
  } catch {
    return "";
  }
}

function writeCachedVersion(version: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VERSION_CACHE_KEY, version);
  } catch {
    // Ignore storage failures; version loading should remain non-fatal.
  }
}

export async function loadAppVersion(): Promise<string> {
  try {
    const response = await fetch("./version.json", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { version?: string };
      if (data.version && VERSION_PATTERN.test(data.version)) {
        setRuntimeVersion(data.version);
        writeCachedVersion(data.version);
        return RUNTIME_VERSION_DISPLAY;
      }
    }
  } catch {
    // Fall back to the last successfully loaded runtime version if present.
  }

  const cachedVersion = readCachedVersion();
  if (cachedVersion) {
    setRuntimeVersion(cachedVersion);
    return RUNTIME_VERSION_DISPLAY;
  }

  setRuntimeVersion("");
  return RUNTIME_VERSION_DISPLAY;
}

export async function ensureAppVersionLoaded(): Promise<string> {
  if (RUNTIME_VERSION_DISPLAY) {
    return RUNTIME_VERSION_DISPLAY;
  }
  return loadAppVersion();
}
