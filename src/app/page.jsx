"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchQuakes, fetchQuakesRangeUTC } from "@/lib/usgs";
import { fetchFloods } from "@/lib/floods";
import { formatAgo, formatClock, mean, toKpi } from "@/lib/time";
import Controls from "@/components/Controls";
import Drawer from "@/components/Drawer";
import Legend from "@/components/Legend";
import FXOverlay from "@/components/FXOverlay";
import { ToastProvider, useToast } from "@/lib/toast";

const QuakeMap = dynamic(() => import("@/components/QuakeMap"), { ssr: false });

function PageInner() {
  const { toast } = useToast();

  const [hazard, setHazard] = useState("earthquakes");
  const [mode, setMode] = useState("live");

  const [windowKey, setWindowKey] = useState("day");
  const [historyDate, setHistoryDate] = useState("");
  const [startISO, setStartISO] = useState("");
  const [endISO, setEndISO] = useState("");
  const [rangeError, setRangeError] = useState("");

  const [magMin, setMagMin] = useState(0);
  const [quakes, setQuakes] = useState([]);
  const [floods, setFloods] = useState([]);

  const [selected, setSelected] = useState(null);
  const [flyTo, setFlyTo] = useState(null);

  const [live, setLive] = useState(true);
  const [scrubPct, setScrubPct] = useState(100);

  const [mountedTime, setMountedTime] = useState(null);

  const [fxShow, setFxShow] = useState(false);
  const [fxKind, setFxKind] = useState("none");
  const [fxDur, setFxDur] = useState(1200);
  const [fxIntensity, setFxIntensity] = useState(1);
  const [fxTick, setFxTick] = useState(0);

  const [tourOn, setTourOn] = useState(false);

  const seenRef = useRef(new Set());
  const userMovedRef = useRef(false);
  const tourTokenRef = useRef(0);

  const isFlood = hazard === "floods";
  const isQuake = hazard === "earthquakes";

  const DEFAULT_VIEW = { center: [20, 0], zoom: 2 };
  const resetToDefaultView = () => setFlyTo(DEFAULT_VIEW);

  useEffect(() => {
    setMountedTime(new Date());
    const id = setInterval(() => setMountedTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    resetToDefaultView();
  }, []);

  useEffect(() => {
    setSelected(null);
    setTourOn(false);
    userMovedRef.current = false;
    if (isFlood) setQuakes([]);
    else setFloods([]);
  }, [hazard]);

  useEffect(() => {
    setTourOn(false);
  }, [mode, historyDate, startISO, endISO, windowKey, magMin]);

  function handleMapMove() {
    userMovedRef.current = true;
    setFlyTo(null);
  }

  function parseDTL(v) {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  const now = Date.now();
  const liveWindowMs = windowKey === "hour" ? 3600e3 : 86400e3;

  const { rangeStart, rangeEnd, rangeValidMs } = useMemo(() => {
    let s, e;
    if (mode === "live") {
      s = new Date(now - (isQuake ? liveWindowMs : 30 * 86400e3));
      e = new Date(now);
    } else if (mode === "historyDay") {
      const d = historyDate || "1970-01-01";
      s = new Date(`${d}T00:00:00.000Z`);
      e = new Date(`${d}T23:59:59.999Z`);
    } else {
      s = parseDTL(startISO);
      e = parseDTL(endISO);
    }
    const ms = s && e ? e.getTime() - s.getTime() : 0;
    return { rangeStart: s, rangeEnd: e, rangeValidMs: ms };
  }, [mode, isQuake, historyDate, startISO, endISO, now, liveWindowMs]);

  useEffect(() => {
    if (mode !== "customRange") {
      setRangeError("");
      return;
    }
    if (!rangeStart || !rangeEnd) {
      setRangeError("Select both start and end");
      return;
    }
    if (rangeValidMs < 10 * 60 * 1000) {
      setRangeError("Range must be at least 10 minutes");
      return;
    }
    if (rangeValidMs > 24 * 3600 * 1000) {
      setRangeError("Range must be at most 24 hours");
      return;
    }
    setRangeError("");
  }, [mode, rangeStart, rangeEnd, rangeValidMs]);

  const replayTs = useMemo(() => {
    if (!rangeStart || !rangeEnd) return now;
    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();
    return live ? endMs : startMs + (scrubPct / 100) * (endMs - startMs);
  }, [live, scrubPct, rangeStart, rangeEnd, now]);

  useEffect(() => {
    let cancel = false;
    let timer;

    async function loadLiveEQ() {
      try {
        if (!isQuake) return;
        const data = await fetchQuakes(windowKey);
        if (cancel) return;
        const items = data.features.map((f) => ({
          id: f.id,
          mag: f.properties.mag ?? 0,
          time: f.properties.time,
          place: f.properties.place,
          lon: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
          depth: f.geometry.coordinates[2],
        }));
        const withFlags = items.map((q) => ({
          ...q,
          isNew: !seenRef.current.has(q.id),
        }));
        withFlags.forEach((q) => seenRef.current.add(q.id));
        setQuakes(withFlags.sort((a, b) => b.time - a.time));
      } catch (e) {
        if (!cancel)
          toast({
            title: "Earthquake data error",
            description: String(e?.message || e),
            type: "error",
          });
      }
    }

    if (isQuake && mode === "live") {
      loadLiveEQ();
      const loop = () => {
        const base = windowKey === "hour" ? 90_000 : 180_000;
        const jitter = Math.floor(Math.random() * 45_000);
        timer = setTimeout(async () => {
          await loadLiveEQ();
          loop();
        }, base + jitter);
      };
      loop();
    }

    return () => {
      cancel = true;
      if (timer) clearTimeout(timer);
    };
  }, [isQuake, mode, windowKey, toast]);

  useEffect(() => {
    let cancel = false;
    async function loadEQRange() {
      try {
        if (!isQuake) return;
        if (mode === "historyDay" && historyDate) {
          const start = new Date(`${historyDate}T00:00:00.000Z`).toISOString();
          const end = new Date(`${historyDate}T23:59:59.999Z`).toISOString();
          const data = await fetchQuakesRangeUTC(start, end);
          if (cancel) return;
          const items = data.features.map((f) => ({
            id: f.id,
            mag: f.properties.mag ?? 0,
            time: f.properties.time,
            place: f.properties.place,
            lon: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            depth: f.geometry.coordinates[2],
          }));
          setQuakes(
            items
              .sort((a, b) => a.time - b.time)
              .map((q, i) => ({ ...q, isNew: i < 12 }))
          );
        } else if (
          mode === "customRange" &&
          rangeStart &&
          rangeEnd &&
          !rangeError
        ) {
          const data = await fetchQuakesRangeUTC(
            rangeStart.toISOString(),
            rangeEnd.toISOString()
          );
          if (cancel) return;
          const items = data.features.map((f) => ({
            id: f.id,
            mag: f.properties.mag ?? 0,
            time: f.properties.time,
            place: f.properties.place,
            lon: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            depth: f.geometry.coordinates[2],
          }));
          setQuakes(
            items
              .sort((a, b) => a.time - b.time)
              .map((q, i) => ({ ...q, isNew: i < 12 }))
          );
        } else if (isQuake && mode === "live") {
          return;
        } else {
          setQuakes([]);
        }
      } catch (e) {
        if (!cancel)
          toast({
            title: "Earthquake range error",
            description: String(e?.message || e),
            type: "error",
          });
      }
    }
    if (mode !== "live") loadEQRange();
    return () => {
      cancel = true;
    };
  }, [isQuake, mode, historyDate, rangeStart, rangeEnd, rangeError, toast]);

  useEffect(() => {
    let cancel = false;
    let timer;

    function computeWindow() {
      const nowLocal = new Date();
      let s, e;
      if (mode === "historyDay" && historyDate) {
        s = new Date(`${historyDate}T00:00:00.000Z`);
        e = new Date(`${historyDate}T23:59:59.999Z`);
      } else if (mode === "customRange" && startISO && endISO) {
        s = new Date(startISO);
        e = new Date(endISO);
      } else {
        s = new Date(nowLocal.getTime() - 30 * 86400e3);
        e = nowLocal;
      }
      const queryFrom = new Date(s.getTime() - 86400e3);
      const queryTo = new Date(e.getTime());
      return { s, e, queryFrom, queryTo };
    }

    async function loadFloodsOnce() {
      if (!isFlood) return;
      const { queryFrom, queryTo } = computeWindow();
      try {
        const data = await fetchFloods({
          fromISO: queryFrom.toISOString(),
          toISO: queryTo.toISOString(),
          pageSize: 200,
          // noCache: true, // enable only when debugging
        });
        if (cancel) return;

        function inferLevel(p) {
          const iconOverall =
            typeof p.iconoverall === "string" ? p.iconoverall : "";
          const icon = typeof p.icon === "string" ? p.icon : "";
          const fromIconOverall = iconOverall.match(
            /\/(Green|Orange|Red)\//i
          )?.[1];
          const fromIcon = icon.match(/\/(Green|Orange|Red)\//i)?.[1];
          const raw =
            p.alertlevel ||
            p.episodealertlevel ||
            fromIconOverall ||
            fromIcon ||
            p.level ||
            "";
          return String(raw).toLowerCase();
        }

        function firstLonLat(geom) {
          const c = geom?.coordinates;
          if (!Array.isArray(c)) return [NaN, NaN];
          if (Number.isFinite(c[0]) && Number.isFinite(c[1]))
            return [Number(c[0]), Number(c[1])];
          try {
            const flat = c.flat(2).filter(Number.isFinite);
            if (flat.length >= 2) return [Number(flat[0]), Number(flat[1])];
          } catch {}
          return [NaN, NaN];
        }

        const items = (data?.features || [])
          .map((f, i) => {
            const p = f?.properties || {};
            const [lon, lat] = firstLonLat(f?.geometry);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            const start =
              (p.fromdate && Date.parse(p.fromdate)) ||
              (p.eventdate && Date.parse(p.eventdate)) ||
              (p.datemodified && Date.parse(p.datemodified)) ||
              queryFrom.getTime();
            const end =
              (p.todate && Date.parse(p.todate)) ||
              (p.datemodified && Date.parse(p.datemodified)) ||
              start;
            const time = Math.floor((start + end) / 2);

            return {
              id: `${p.eventid ?? p.id ?? i}-${p.episodeid ?? 0}`,
              name: p.name || p.title || p.description || "Flood event",
              level: inferLevel(p),
              lat,
              lon,
              start,
              end,
              time,
              isCurrent: p.iscurrent === true || p.iscurrent === "true",
              country: p.country || p.iso3 || null,
            };
          })
          .filter(Boolean);

        setFloods(items);
      } catch (e) {
        if (!cancel)
          toast({
            title: "Flood data error",
            description: String(e?.message || e),
            type: "error",
          });
      }
    }

    if (isFlood) {
      loadFloodsOnce();
      if (mode === "live") {
        const loop = () => {
          const base = 4 * 60_000;
          const jitter = Math.floor(Math.random() * 60_000);
          timer = setTimeout(async () => {
            await loadFloodsOnce();
            loop();
          }, base + jitter);
        };
        loop();
      }
    }

    return () => {
      cancel = true;
      if (timer) clearTimeout(timer);
    };
  }, [isFlood, mode, historyDate, startISO, endISO, toast]);

  const tmin = rangeStart?.getTime?.() ?? null;
  const tmax = replayTs;

  const displayedQuakes = useMemo(() => {
    if (!isQuake || !tmin || !rangeEnd) return [];
    return quakes.filter(
      (q) => q.mag >= magMin && q.time >= tmin && q.time <= tmax
    );
  }, [isQuake, quakes, magMin, tmin, rangeEnd, tmax]);

  const displayedFloods = useMemo(() => {
    if (!isFlood) return [];
    if (mode === "live") return floods;
    if (!rangeStart || !rangeEnd) return floods;
    const a0 = rangeStart.getTime();
    const a1 = tmax;
    return floods.filter((f) => {
      const s = Number.isFinite(f.start) ? f.start : f.time;
      const e = Number.isFinite(f.end) ? f.end : f.time;
      return s <= a1 && e >= a0;
    });
  }, [isFlood, floods, mode, rangeStart, rangeEnd, tmax]);

  const kpi = useMemo(() => {
    if (!isQuake) return { countHour: 0, maxMag: 0, avgMag: 0 };
    const refNow = rangeEnd ? rangeEnd.getTime() : now;
    const countHour = displayedQuakes.filter(
      (q) => q.time >= refNow - 3600e3 && q.time <= refNow
    ).length;
    const maxMag = displayedQuakes.reduce((m, q) => (q.mag > m ? q.mag : m), 0);
    const avgMag = mean(
      displayedQuakes.map((q) => q.mag).filter((n) => !Number.isNaN(n))
    );
    return { countHour, maxMag, avgMag };
  }, [isQuake, displayedQuakes, now, rangeEnd]);

  const floodKpi = useMemo(() => {
    const nowMs = Date.now();
    const startMs = nowMs - 30 * 86400e3;
    const within = floods.filter((f) => {
      const s = Number.isFinite(f.start) ? f.start : f.time ?? 0;
      const e = Number.isFinite(f.end) ? f.end : f.time ?? 0;
      return s <= nowMs && e >= startMs;
    });
    const red = within.filter((f) => f.level === "red").length;
    const orange = within.filter((f) => f.level === "orange").length;
    const green = within.filter((f) => f.level === "green").length;
    const active = within.filter((f) => f.isCurrent).length;
    return { total: within.length, red, orange, green, active };
  }, [floods]);

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  useEffect(() => {
    return () => setTourOn(false);
  }, []);

useEffect(() => {
  let cancelled = false;
  const token = ++tourTokenRef.current;

  function buildTourList() {
    const nowMs = Date.now();

    if (isQuake) {
      const startMs = nowMs - 24 * 3600e3; // default EQ window = 24h
      const src = Array.isArray(quakes) ? quakes : [];
      const within = src.filter((q) => q.time >= startMs && q.time <= nowMs);
      return within.sort((a, b) => b.mag - a.mag); // strongest first
    } else {
      const startMs = nowMs - 30 * 86400e3; // default Floods window = 30d
      const src = Array.isArray(floods) ? floods : [];
      const within = src.filter((f) => {
        const s = Number.isFinite(f.start) ? f.start : (f.time ?? 0);
        const e = Number.isFinite(f.end) ? f.end : (f.time ?? 0);
        return s <= nowMs && e >= startMs; // interval overlap with last 30d
      });
      const prio = { red: 3, orange: 2, green: 1, "": 0, undefined: 0, null: 0 };
      return within.sort((a, b) => {
        const pa = prio[a.level] ?? 0;
        const pb = prio[b.level] ?? 0;
        if (pb !== pa) return pb - pa; // red → orange → green
        return (b.end ?? b.time ?? 0) - (a.end ?? a.time ?? 0); // newer first
      });
    }
  }

  async function runOnce() {
    const list = buildTourList();

    if (!list.length) {
      toast({
        title: "Nothing to tour",
        description: isQuake
          ? "No earthquakes in the last 24 hours."
          : "No floods in the last 30 days.",
        type: "info",
        duration: 2200,
      });
      setTourOn(false);
      return;
    }

    for (let i = 0; i < list.length; i++) {
      if (!tourOn || cancelled || token !== tourTokenRef.current) break;

      const p = list[i];
      const zoom = isQuake
        ? (p.mag >= 6 ? 8 : 7)
        : (p.level === "red" ? 8 : p.level === "orange" ? 9 : 10);

      userMovedRef.current = false;
      setSelected(isQuake ? p : null);
      setFlyTo({ center: [p.lat, p.lon], zoom });

      if (isQuake) {
        const dur = Math.round(1600 + (p.mag || 4) * 420);
        const intensity = Math.min(2, Math.max(0.6, (p.mag || 4) / 5.5));
        setFxKind("earthquake");
        setFxIntensity(intensity);
        setFxDur(dur);
        setFxTick((t) => t + 1);
        setFxShow(true);
        await new Promise((r) => setTimeout(r, Math.min(dur + 350, 5000)));
        setFxShow(false);
      } else {
        const intensityByLevel = { red: 1.0, orange: 0.75, green: 0.45, "": 0.4 };
        const dur = 2600;
        setFxKind("rain");
        setFxIntensity(intensityByLevel[p.level] ?? 0.4);
        setFxDur(dur);
        setFxTick((t) => t + 1);
        setFxShow(true);
        await new Promise((r) => setTimeout(r, dur));
        setFxShow(false);
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    setFxShow(false);
    setTourOn(false);           // stop after one full pass
    setSelected(null);
    resetToDefaultView();       // revert map to default
  }

  if (tourOn) runOnce();

  return () => {
    cancelled = true;
  };
}, [tourOn, isQuake, quakes, floods, toast]);


  function pickRandomDay() {
    const start = new Date("2000-01-01T00:00:00Z").getTime();
    const end = new Date(Date.now() - 86400e3).getTime();
    const d = new Date(start + Math.random() * (end - start));
    const iso = d.toISOString().slice(0, 10);
    setHistoryDate(iso);
    setMode("historyDay");
    setLive(false);
    setScrubPct(100);
  }

  function endTourNow() {
    tourTokenRef.current += 1;
    setFxShow(false);
    setTourOn(false);
    setSelected(null);
    resetToDefaultView();
  }

  return (
    <div
      className={`h-screen w-screen overflow-hidden ${
        fxKind === "earthquake" && fxShow ? "shake-root" : ""
      }`}
      style={{
        "--shake-duration": `${fxDur}ms`,
        "--shake-intensity": String(fxIntensity),
      }}
    >
      <div className="absolute inset-0 z-0">
        <QuakeMap
          quakes={isQuake ? displayedQuakes : []}
          floods={isFlood ? displayedFloods : []}
          flyTo={flyTo}
          onSelect={setSelected}
          onMove={handleMapMove}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 z-[1000] bg-gradient-to-b from-black/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 z-[1000] bg-gradient-to-t from-black/40 to-transparent" />

      <FXOverlay
        hazard={isFlood ? "floods" : "earthquakes"}
        active={fxShow}
        durationMs={fxDur}
        intensity={fxIntensity}
        k={fxTick}
      />

      <div className="pointer-events-none absolute left-4 right-4 top-4 flex gap-4 z-[1100]">
        <div className="pointer-events-auto panel flex-1 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              QuakePulse
              {mode === "historyDay" && historyDate ? ` • ${historyDate}` : ""}
              {mode === "customRange" && rangeStart && rangeEnd
                ? ` • ${rangeStart.toISOString().slice(0, 16)} → ${rangeEnd
                    .toISOString()
                    .slice(0, 16)}`
                : ""}
            </div>
            {isQuake ? (
              <div className="flex items-center gap-2">
                <span className="badge" suppressHydrationWarning>
                  Last fetch: {mountedTime ? formatClock(mountedTime) : ""}
                </span>
                <span className="badge">
                  Quakes last hour: {toKpi(kpi.countHour)}
                </span>
                <span className="badge">
                  Max mag: {kpi.maxMag ? kpi.maxMag.toFixed(1) : "—"}
                </span>
                <span className="badge">
                  Avg mag: {kpi.avgMag ? kpi.avgMag.toFixed(2) : "—"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="badge" suppressHydrationWarning>
                  Window: last 30 days
                </span>
                <span className="badge">Floods: {toKpi(floodKpi.total)}</span>
                <span className="badge">
                  Red: {floodKpi.red} • Orange: {floodKpi.orange} • Green:{" "}
                  {floodKpi.green}
                </span>
                <span className="badge">Active now: {floodKpi.active}</span>
              </div>
            )}
          </div>
        </div>
        <div className="pointer-events-auto panel p-3">
          <Legend hazard={isFlood ? "floods" : "earthquakes"} />
        </div>
      </div>

      {tourOn && (
        <div className="pointer-events-auto absolute left-4 top-28 z-[1200]">
          <button
            className="rounded-xl bg-white/90 hover:bg-white px-3 py-1.5 text-sm font-medium shadow"
            onClick={endTourNow}
          >
            End Tour
          </button>
        </div>
      )}

      <div className="pointer-events-auto absolute left-4 bottom-4 right-4 z-[1100]">
        <Controls
          hazard={isFlood ? "floods" : "earthquakes"}
          setHazard={(h) => {
            setHazard(h);
            setTourOn(false);
            setSelected(null);
            resetToDefaultView();
          }}
          mode={mode}
          setMode={(m) => {
            setMode(m);
            setTourOn(false);
          }}
          windowKey={windowKey}
          setWindowKey={(w) => {
            setWindowKey(w);
            setTourOn(false);
          }}
          magMin={magMin}
          setMagMin={(v) => {
            setMagMin(v);
          }}
          live={live}
          setLive={setLive}
          scrubPct={scrubPct}
          setScrubPct={setScrubPct}
          tourOn={tourOn}
          setTourOn={(on) => {
            if (on) {
              tourTokenRef.current += 1;
              setTourOn(true);
            } else {
              endTourNow();
            }
          }}
          setFlyTo={setFlyTo}
          now={rangeEnd ? rangeEnd.getTime() : now}
          historyDate={historyDate}
          setHistoryDate={(d) => {
            setHistoryDate(d);
            setTourOn(false);
          }}
          onPickRandomDay={() => {
            pickRandomDay();
            setTourOn(false);
          }}
          startISO={startISO}
          setStartISO={(v) => {
            setStartISO(v);
            setTourOn(false);
          }}
          endISO={endISO}
          setEndISO={(v) => {
            setEndISO(v);
            setTourOn(false);
          }}
          rangeError={rangeError}
        />
      </div>

      {isQuake && selected && (
        <div className="pointer-events-auto absolute right-4 top-24 w-96 max-w-[92vw] z-[1200]">
          <Drawer
            quake={selected}
            onClose={() => setSelected(null)}
            footer={
              selected
                ? `Occurred ${formatAgo(selected.time)} • Depth ${
                    selected.depth?.toFixed?.(1) ?? "—"
                  } km • ${selected.lat?.toFixed?.(
                    3
                  )}, ${selected.lon?.toFixed?.(3)}`
                : ""
            }
          />
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <PageInner />
    </ToastProvider>
  );
}
