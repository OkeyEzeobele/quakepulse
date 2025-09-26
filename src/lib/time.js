const CLOCK_FMT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function toKpi(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export function formatAgo(ts) {
  const d = Date.now() - ts;
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function formatClock(d) {
  return CLOCK_FMT.format(d);
}

export function formatRangeLabel(now, pct) {
  const start = new Date(now - 24 * 3600e3);
  const t = new Date(start.getTime() + (pct / 100) * 24 * 3600e3);
  return `${CLOCK_FMT.format(start)} → ${CLOCK_FMT.format(t)}`;
}
