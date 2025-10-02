"use client";

import clsx from "classnames";

function fmt(ts) {
  if (!Number.isFinite(ts)) return "—";
  try {
    const d = new Date(ts);
    return d.toISOString().replace("T", " ").slice(0, 16) + "Z";
  } catch {
    return "—";
  }
}

function levelBadgeClasses(level) {
  const l = String(level || "").toLowerCase();
  if (l === "red")
    return "bg-red-500/15 border-red-400/40 text-red-100 ring-1 ring-red-400/30";
  if (l === "orange")
    return "bg-orange-500/15 border-orange-400/40 text-orange-100 ring-1 ring-orange-400/30";
  if (l === "green")
    return "bg-emerald-500/15 border-emerald-400/40 text-emerald-100 ring-1 ring-emerald-400/30";
  return "bg-white/10 border-white/20 text-neutral-200";
}

export default function FloodDrawer({ flood, onClose, footer = "" }) {
  if (!flood) return null;

  const {
    name,
    level,
    country,
    start,
    end,
    lat,
    lon,
    isCurrent,
    id,
    links, // optional: { report, details, geometry }
  } = flood;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">
            {name || "Flood event"}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-90">
            <span className={clsx("badge h-6 px-2", levelBadgeClasses(level))}>
              {level ? String(level).toUpperCase() : "LEVEL —"}
            </span>
            {country ? <span className="badge h-6 px-2">{country}</span> : null}
            <span className="badge h-6 px-2">
              {Number.isFinite(lat) ? lat.toFixed(3) : "—"},{" "}
              {Number.isFinite(lon) ? lon.toFixed(3) : "—"}
            </span>
            {isCurrent ? (
              <span className="badge h-6 px-2">Active now</span>
            ) : null}
            {id ? <span className="badge h-6 px-2">ID: {id}</span> : null}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-3 inline-flex h-8 items-center rounded-md border border-white/20 bg-neutral-900/80 px-2 text-xs hover:bg-white/10"
          aria-label="Close flood details"
        >
          Close
        </button>
      </div>

      <div className="px-4 pb-3 text-xs opacity-90">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-white/15 bg-white/5 p-2">
            <div className="opacity-70">From</div>
            <div className="mt-0.5 font-medium">{fmt(start)}</div>
          </div>
          <div className="rounded-md border border-white/15 bg-white/5 p-2">
            <div className="opacity-70">To</div>
            <div className="mt-0.5 font-medium">{fmt(end)}</div>
          </div>
        </div>

        {(links?.report || links?.details) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {links?.report && (
              <a
                href={links.report}
                target="_blank"
                rel="noreferrer"
                className="badge h-7 px-2 hover:bg-white/10"
              >
                GDACS Report
              </a>
            )}
            {links?.details && (
              <a
                href={links.details}
                target="_blank"
                rel="noreferrer"
                className="badge h-7 px-2 hover:bg-white/10"
              >
                Details
              </a>
            )}
          </div>
        )}
      </div>

      {footer ? (
        <div className="border-t border-white/15 bg-white/[0.03] px-4 py-2 text-[11px] opacity-80">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
