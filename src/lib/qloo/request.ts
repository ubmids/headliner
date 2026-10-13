import type { ParamValue, QlooParams } from "./types";

/** Serialise one parameter the way the Qloo GET API expects: arrays become comma-separated. */
export function serialiseParam(value: ParamValue): string {
  return Array.isArray(value) ? value.map(String).join(",") : String(value);
}

/** Drop undefined/empty params and return them sorted, so the same request always has the same key. */
export function normaliseParams(params: QlooParams): Array<[string, string]> {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0) && v !== "")
    .map(([k, v]) => [k, serialiseParam(v as ParamValue)] as [string, string])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Canonical request key used by the cache and the fixture store. */
export function requestKey(path: string, params: QlooParams): string {
  const qs = normaliseParams(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return qs ? `${path}?${qs}` : path;
}

export function buildUrl(baseUrl: string, path: string, params: QlooParams): string {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [k, v] of normaliseParams(params)) url.searchParams.set(k, v);
  return url.toString();
}
