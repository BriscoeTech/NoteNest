const rawVersion = __APP_VERSION__;

// NOTE: App version must always be two-part "vMAJOR.MINOR" (e.g., v2.7).
// Keep package.json version in MAJOR.MINOR format so this stays consistent.
export const APP_VERSION = /^(\d+)\.(\d+)$/.test(rawVersion)
  ? `v${rawVersion}`
  : `v${rawVersion.replace(/^v/, "").split(".").slice(0, 2).join(".")}`;
