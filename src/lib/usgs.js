import { fetchJsonLimited } from "@/lib/net";

const FEEDS = {
  hour: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
  day:  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
};

const isAbs = (u) => /^https?:\/\//i.test(u);

export async function fetchQuakes(windowKey) {
  const upstream = FEEDS[windowKey] || FEEDS.day;
  return fetchJsonLimited(upstream, { ttlMs: 60_000, minGapMs: 1200, retries: 3 });
}

export async function fetchQuakesRangeUTC(startIso, endIso) {
  const upstream =
    `https://earthquake.usgs.gov/fdsnws/event/1/query` +
    `?format=geojson&orderby=time&starttime=${encodeURIComponent(startIso)}` +
    `&endtime=${encodeURIComponent(endIso)}`;
  return fetchJsonLimited(upstream, { ttlMs: 5 * 60_000, minGapMs: 1200, retries: 3 });
}
