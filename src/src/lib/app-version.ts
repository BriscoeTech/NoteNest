let rawVersion = "0.0.0";
export let APP_VERSION = "v0.0";

function toDisplayVersion(version: string): string {
  const normalized = version.replace(/^v/, "");
  const [major = "0", minor = "0"] = normalized.split(".");
  return `v${major}.${minor}`;
}

export async function loadAppVersion(): Promise<string> {
  try {
    const response = await fetch("./version.json", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { version?: string };
      if (data.version && /^\d+\.\d+\.\d+$/.test(data.version)) {
        rawVersion = data.version;
      }
    }
  } catch {
    // Keep fallback version when version.json is unavailable.
  }
  APP_VERSION = toDisplayVersion(rawVersion);
  return APP_VERSION;
}
