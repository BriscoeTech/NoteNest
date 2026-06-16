const BUILD_INFO_CACHE_KEY = "notenest-runtime-build-info";

export let RUNTIME_BUILT_AT = "";
export let RUNTIME_BUILD_DISPLAY = "";

function isValidBuiltAt(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function toDisplayBuiltAt(builtAt: string): string {
  if (!isValidBuiltAt(builtAt)) return "";

  const formatted = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(builtAt));

  return `Built ${formatted}`;
}

function setRuntimeBuildInfo(builtAt: string): void {
  RUNTIME_BUILT_AT = builtAt;
  RUNTIME_BUILD_DISPLAY = toDisplayBuiltAt(builtAt);
}

function readCachedBuiltAt(): string {
  if (typeof window === "undefined") return "";
  try {
    const cachedBuiltAt = window.localStorage.getItem(BUILD_INFO_CACHE_KEY) || "";
    return isValidBuiltAt(cachedBuiltAt) ? cachedBuiltAt : "";
  } catch {
    return "";
  }
}

function writeCachedBuiltAt(builtAt: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BUILD_INFO_CACHE_KEY, builtAt);
  } catch {
    // Ignore storage failures; build-info loading should remain non-fatal.
  }
}

export async function loadBuildInfo(): Promise<string> {
  try {
    const response = await fetch("./build-info.json", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { builtAt?: string };
      if (isValidBuiltAt(data.builtAt)) {
        setRuntimeBuildInfo(data.builtAt);
        writeCachedBuiltAt(data.builtAt);
        return RUNTIME_BUILT_AT;
      }
    }
  } catch {
    // Fall back to the last successfully loaded build timestamp if present.
  }

  const cachedBuiltAt = readCachedBuiltAt();
  if (cachedBuiltAt) {
    setRuntimeBuildInfo(cachedBuiltAt);
    return RUNTIME_BUILT_AT;
  }

  setRuntimeBuildInfo("");
  return RUNTIME_BUILT_AT;
}

export async function ensureRuntimeBuiltAtLoaded(): Promise<string> {
  if (RUNTIME_BUILT_AT) {
    return RUNTIME_BUILT_AT;
  }
  return loadBuildInfo();
}
