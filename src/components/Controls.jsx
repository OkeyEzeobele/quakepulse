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
  source,
  setSource,
  historyDate,
  setHistoryDate,
  onPickRandomDay,
}) {
  return (
    <div className="panel px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setWindowKey("hour")}
            className={clsx("badge", windowKey === "hour" && "bg-white/20")}
          >
            Last 1h
          </button>
          <button
            onClick={() => setWindowKey("day")}
            className={clsx("badge", windowKey === "day" && "bg-white/20")}
          >
            Last 24h
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs opacity-80 whitespace-nowrap">
            Mag ≥ {magMin.toFixed(1)}
          </span>
          <input
            type="range"
            min="0"
            max="7"
            step="0.1"
            value={magMin}
            onChange={(e) => setMagMin(parseFloat(e.target.value))}
            className="range w-44 sm:w-56"
          />
        </div>

        <div className="flex items-center gap-2 grow basis-[420px] min-w-[320px]">
          <button
            onClick={() => setLive(true)}
            className={clsx("badge", live && "bg-white/20")}
          >
            Live
          </button>
          <button
            onClick={() => setLive(false)}
            className={clsx("badge", !live && "bg-white/20")}
          >
            Replay
          </button>

          <div
            className={clsx(
              "flex items-center gap-2 flex-1",
              live && "opacity-40 pointer-events-none"
            )}
          >
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={scrubPct}
              onChange={(e) => setScrubPct(parseInt(e.target.value))}
              className="range w-full"
            />
            <span
              className="text-xs opacity-80 truncate max-w-[10rem] sm:max-w-[16rem]"
              title={formatRangeLabel(now, scrubPct)}
              suppressHydrationWarning
            >
              {formatRangeLabel(now, scrubPct)}
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={() => setTourOn((v) => !v)}
            className={clsx("badge", tourOn && "bg-white/20")}
          >
            {tourOn ? "Stop Tour" : "Play Tour"}
          </button>
        </div>

        <div className="ml-2 flex flex-wrap items-center gap-2 shrink-0">
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

        <div className="h-9 w-px bg-white/20 shrink-0" />

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setSource("history")}
            className={clsx("badge", source === "history" && "bg-white/20")}
          >
            History
          </button>
          <input
            type="date"
            className="input"
            value={historyDate}
            onChange={(e) => {
              setHistoryDate(e.target.value);
              setSource("history");
            }}
            max={new Date(Date.now() - 86400e3).toISOString().slice(0, 10)}
          />
          <button onClick={onPickRandomDay} className="badge">
            Random Day
          </button>
          <button
            onClick={() => setSource("live")}
            className={clsx("badge", source === "live" && "bg-white/20")}
          >
            Back to Live
          </button>
        </div>
      </div>
    </div>
  );
}
