"use client";

import clsx from "classnames";
import { formatRangeLabel } from "@/lib/time";

const presets = [
  { name: "World", center: [20, 0], zoom: 2 },
  { name: "Nigeria", center: [9.082, 8.6753], zoom: 5 },
  { name: "UK/Europe", center: [53, -1.5], zoom: 5 },
  { name: "Pacific Ring", center: [0, 160], zoom: 3 },
];

export default function Controls({
  windowKey,
  setWindowKey,
  magMin,
  setMagMin,
  live,
  setLive,
  scrubPct,
  setScrubPct,
  tourOn,
  setTourOn,
  setFlyTo,
  now,
}) {
  return (
    <div className="panel px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWindowKey("hour")}
            className={clsx("badge", windowKey === "hour" && "bg-white/10")}
          >
            Last 1h
          </button>
          <button
            onClick={() => setWindowKey("day")}
            className={clsx("badge", windowKey === "day" && "bg-white/10")}
          >
            Last 24h
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs opacity-80 w-16">
            Mag ≥ {magMin.toFixed(1)}
          </span>
          <input
            type="range"
            min="0"
            max="7"
            step="0.1"
            value={magMin}
            onChange={(e) => setMagMin(parseFloat(e.target.value))}
            className="w-48 accent-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive(true)}
            className={clsx("badge", live && "bg-white/10")}
          >
            Live
          </button>
          <button
            onClick={() => setLive(false)}
            className={clsx("badge", !live && "bg-white/10")}
          >
            Replay
          </button>
          <div
            className={clsx(
              "flex items-center gap-2",
              live ? "opacity-40 pointer-events-none" : ""
            )}
          >
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={scrubPct}
              onChange={(e) => setScrubPct(parseInt(e.target.value))}
              className="w-64 accent-white"
            />
            <span className="text-xs opacity-80 w-40">
              {formatRangeLabel(now, scrubPct)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTourOn((v) => !v)}
            className={clsx("badge", tourOn && "bg-white/10")}
          >
            {tourOn ? "Stop Tour" : "Play Tour"}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => setFlyTo({ center: p.center, zoom: p.zoom })}
              className="badge"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
