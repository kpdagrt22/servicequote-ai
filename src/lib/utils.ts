/** Small dependency-free UI/util helpers. */

/** Minimal classNames joiner (clsx-lite). Falsy values are dropped. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Round to 2 decimal places, avoiding binary float drift (e.g. 1.005). */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Coerce an arbitrary form value to a finite number, defaulting to 0. */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/**
 * Return `path` only if it is a safe in-app destination, else `fallback`.
 * Guards against open redirects: rejects absolute URLs ("https://evil.com"),
 * protocol-relative URLs ("//evil.com"), and backslash tricks ("/\\evil.com").
 */
export function safeInternalPath(path: string | null | undefined, fallback = "/"): string {
  if (!path || typeof path !== "string") return fallback;
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
