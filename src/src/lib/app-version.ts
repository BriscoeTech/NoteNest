const rawVersion = __APP_VERSION__;

// Display only major.minor in UI, while package.json keeps full semver.
// NOTE: App version must always be two-part "vMAJOR.MINOR" (e.g., v2.7).
// package.json stays semver (MAJOR.MINOR.PATCH); PATCH is intentionally omitted in display.
export const APP_VERSION = /^(\d+)\.(\d+)$/.test(rawVersion)
  ? `v${rawVersion}`
  : `v${rawVersion.replace(/^v/, "").split(".").slice(0, 2).join(".")}`;
