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
  hazard,
  setHazard,
  mode,
  setMode,
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
  historyDate,
  setHistoryDate,
  onPickRandomDay,
  startISO,
  setStartISO,
  endISO,
  setEndISO,
  rangeError,
  canTour, // NEW: controls whether Play Tour is enabled
}) {
  return (
    <div className="panel px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setHazard("earthquakes")}
            className="badge"
            data-variant="eq"
            data-active={hazard === "earthquakes"}
            aria-pressed={hazard === "earthquakes"}
          >
            Earthquakes
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setHazard("floods")}
            className="badge"
            data-variant="fl"
            data-active={hazard === "floods"}
            aria-pressed={hazard === "floods"}
          >
            Floods
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setMode("live")}
            className={clsx("badge", mode === "live" && "ring-2 ring-white/40")}
            aria-pressed={mode === "live"}
          >
            Live
          </button>
          <button
            onClick={() => setMode("historyDay")}
            className={clsx(
              "badge",
              mode === "historyDay" && "ring-2 ring-white/40"
            )}
            aria-pressed={mode === "historyDay"}
          >
            History Day
          </button>
          <button
            onClick={() => setMode("customRange")}
            className={clsx(
              "badge",
              mode === "customRange" && "ring-2 ring-white/40"
            )}
            aria-pressed={mode === "customRange"}
          >
            Custom Range
          </button>
        </div>

        {mode === "live" && hazard === "earthquakes" && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setWindowKey("hour")}
              className={clsx(
                "badge",
                windowKey === "hour" && "ring-2 ring-white/40"
              )}
              aria-pressed={windowKey === "hour"}
            >
              Last 1h
            </button>
            <button
              onClick={() => setWindowKey("day")}
              className={clsx(
                "badge",
                windowKey === "day" && "ring-2 ring-white/40"
              )}
              aria-pressed={windowKey === "day"}
            >
              Last 24h
            </button>
          </div>
        )}

        {mode === "historyDay" && (
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="date"
              className="input"
              value={historyDate}
              onChange={(e) => setHistoryDate(e.target.value)}
              max={new Date(Date.now() - 86400e3).toISOString().slice(0, 10)}
            />
            <button onClick={onPickRandomDay} className="badge">
              Random Day
            </button>
          </div>
        )}

        {mode === "customRange" && (
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="datetime-local"
              className="input"
              value={startISO}
              onChange={(e) => setStartISO(e.target.value)}
            />
            <span className="text-xs opacity-80">→</span>
            <input
              type="datetime-local"
              className="input"
              value={endISO}
              onChange={(e) => setEndISO(e.target.value)}
            />
            {rangeError ? (
              <span className="badge bg-red-600/40 border-red-400/40">
                {rangeError}
              </span>
            ) : null}
          </div>
        )}

        {hazard === "earthquakes" && (
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
        )}

        <div className="flex items-center gap-2 grow basis-[420px] min-w-[320px]">
          <button
            onClick={() => setLive(true)}
            className={clsx("badge", live && "ring-2 ring-white/40")}
            aria-pressed={live}
          >
            Live End
          </button>
          <button
            onClick={() => setLive(false)}
            className={clsx("badge", !live && "ring-2 ring-white/40")}
            aria-pressed={!live}
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
            disabled={!canTour}
            aria-disabled={!canTour}
            title={
              canTour
                ? tourOn
                  ? "Stop tour"
                  : "Play tour"
                : "Select a valid time range (and ensure there are events) to start the tour"
            }
            className={clsx(
              "badge",
              tourOn && "ring-2 ring-white/40",
              !canTour && "opacity-40 pointer-events-none"
            )}
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
      </div>
    </div>
  );
}
