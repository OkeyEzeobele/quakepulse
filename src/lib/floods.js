import { fetchJsonLimited } from "@/lib/net";
import { defaultFloodWindow } from "@/lib/time";

export async function fetchFloods({ fromISO, toISO, pageSize = 200, noCache = false } = {}) {
  if (!fromISO || !toISO) {
    const d = defaultFloodWindow();
    fromISO ??= d.fromISO;
    toISO ??= d.toISO;
  }

  const url =
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?" +
    new URLSearchParams({
      eventlist: "FL",
      fromdate: String(fromISO).slice(0, 10),
      todate: String(toISO).slice(0, 10),
      pagesize: String(pageSize),
    }).toString() +
    (noCache ? `&_ts=${Date.now()}` : "");

  return fetchJsonLimited(url, {
    ttlMs: noCache ? 0 : 10 * 60_000,
    minGapMs: 1500,
    retries: 2,
    defaultOnEmpty: { features: [] },
  });
}

export function normalizeFloods(fc) {
  const feats = Array.isArray(fc?.features) ? fc.features : [];
  return feats
    .map((f) => {
      const p = f?.properties || {};
      const g = f?.geometry || {};
      const coords = Array.isArray(g.coordinates) ? g.coordinates : [null, null];
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      const fromIconOverall =
        typeof p.iconoverall === "string"
          ? (p.iconoverall.match(/\/(Green|Orange|Red)\//i)?.[1] || "")
          : "";
      const fromIcon =
        typeof p.icon === "string"
          ? (p.icon.match(/\/(Green|Orange|Red)\//i)?.[1] || "")
          : "";

      const levelRaw =
        p.alertlevel ||
        p.episodealertlevel ||
        fromIconOverall ||
        fromIcon ||
        "";

      const level = String(levelRaw).toLowerCase();

      return {
        id: `${p.eventid ?? ""}-${p.episodeid ?? ""}`,
        lat,
        lon,
        name: p.name || p.description || "Flood",
        level,
        isCurrent: p.iscurrent === true || p.iscurrent === "true",
        fromISO: p.fromdate ? new Date(p.fromdate).toISOString() : null,
        toISO: p.todate ? new Date(p.todate).toISOString() : null,
        country: p.country || p.iso3 || null,
        raw: p,
      };
    })
    .filter(Boolean);
}
