"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchQuakes, fetchQuakesRangeUTC } from "@/lib/usgs";
import { formatAgo, formatClock, mean, toKpi } from "@/lib/time";
import Controls from "@/components/Controls";
import Drawer from "@/components/Drawer";
import Legend from "@/components/Legend";

const QuakeMap = dynamic(() => import("@/components/QuakeMap"), { ssr: false });

export default function Page() {
  const [source, setSource] = useState("live");
  const [historyDate, setHistoryDate] = useState("");
  const [windowKey, setWindowKey] = useState("day");
  const [magMin, setMagMin] = useState(0);
  const [quakes, setQuakes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [live, setLive] = useState(true);
  const [scrubPct, setScrubPct] = useState(100);
  const seenRef = useRef(new Set());
  const tourRef = useRef(null);
  const [tourOn, setTourOn] = useState(false);
  const [mountedTime, setMountedTime] = useState(null);

  useEffect(() => {
    setMountedTime(new Date());
    const id = setInterval(() => setMountedTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancel = false;
    async function loadLive() {
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
    }
    if (source === "live") {
      loadLive();
      const id = setInterval(loadLive, 60000);
      return () => {
        cancel = true;
        clearInterval(id);
      };
    }
    return () => {
      cancel = true;
    };
  }, [source, windowKey]);

  useEffect(() => {
    let cancel = false;
    async function loadHistory(day) {
      if (!day) return;
      const start = new Date(`${day}T00:00:00.000Z`).toISOString();
      const end = new Date(`${day}T23:59:59.999Z`).toISOString();
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
    }
    if (source === "history") loadHistory(historyDate);
    return () => {
      cancel = true;
    };
  }, [source, historyDate]);

  const now = Date.now();
  const windowMs =
    source === "history"
      ? 24 * 3600e3
      : windowKey === "hour"
      ? 3600e3
      : 86400e3;

  const liveStart =
    source === "history"
      ? new Date(`${historyDate || "1970-01-01"}T00:00:00.000Z`).getTime()
      : now - windowMs;

  const liveEnd =
    source === "history"
      ? new Date(`${historyDate || "1970-01-01"}T23:59:59.999Z`).getTime()
      : now;

  const replayTs = live
    ? liveEnd
    : liveStart + (scrubPct / 100) * (liveEnd - liveStart);

  const displayed = useMemo(() => {
    const tmin =
      source === "history" ? liveStart : live ? liveStart : now - windowMs;
    const tmax = source === "history" ? replayTs : live ? now : replayTs;
    return quakes.filter(
      (q) => q.mag >= magMin && q.time >= tmin && q.time <= tmax
    );
  }, [
    quakes,
    magMin,
    live,
    source,
    liveStart,
    liveEnd,
    replayTs,
    now,
    windowMs,
  ]);

  const kpi = useMemo(() => {
    const refNow = source === "history" ? liveEnd : now;
    const countHour = quakes.filter(
      (q) => q.time >= refNow - 3600e3 && q.time <= refNow
    ).length;
    const maxMag = quakes.reduce((m, q) => (q.mag > m ? q.mag : m), 0);
    const avgMag = mean(
      quakes.map((q) => q.mag).filter((n) => !Number.isNaN(n))
    );
    return { countHour, maxMag, avgMag };
  }, [quakes, now, source, liveEnd]);

  useEffect(() => {
    if (!tourOn) {
      if (tourRef.current) {
        clearInterval(tourRef.current);
        tourRef.current = null;
      }
      return;
    }
    const top = [...displayed].sort((a, b) => b.mag - a.mag).slice(0, 3);
    let i = 0;
    if (!top.length) return;
    const step = () => {
      const q = top[i % top.length];
      setFlyTo({ center: [q.lat, q.lon], zoom: q.mag >= 6 ? 6 : 5 });
      setSelected(q);
      i += 1;
    };
    step();
    tourRef.current = setInterval(step, 4200);
    return () => {
      clearInterval(tourRef.current);
      tourRef.current = null;
    };
  }, [tourOn, displayed]);

  function pickRandomDay() {
    const start = new Date("2000-01-01T00:00:00Z").getTime();
    const end = new Date(Date.now() - 86400e3).getTime();
    const d = new Date(start + Math.random() * (end - start));
    const iso = d.toISOString().slice(0, 10);
    setHistoryDate(iso);
    setSource("history");
    setLive(false);
    setScrubPct(100);
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <QuakeMap
          quakes={displayed}
          flyTo={flyTo}
          onSelect={setSelected}
          onMove={() => setFlyTo(null)}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 z-[1000] bg-gradient-to-b from-black/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 z-[1000] bg-gradient-to-t from-black/40 to-transparent" />

      <div className="pointer-events-none absolute left-4 right-4 top-4 flex gap-4 z-[1100]">
        <div className="pointer-events-auto panel flex-1 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              QuakePulse
              {source === "history" && historyDate ? ` • ${historyDate}` : ""}
            </div>
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
          </div>
        </div>
        <div className="pointer-events-auto panel p-3">
          <Legend />
        </div>
      </div>

      <div className="pointer-events-auto absolute left-4 bottom-4 right-4 z-[1100]">
        <Controls
          windowKey={windowKey}
          setWindowKey={setWindowKey}
          magMin={magMin}
          setMagMin={setMagMin}
          live={live}
          setLive={setLive}
          scrubPct={scrubPct}
          setScrubPct={setScrubPct}
          tourOn={tourOn}
          setTourOn={setTourOn}
          setFlyTo={setFlyTo}
          now={source === "history" ? liveEnd : now}
          source={source}
          setSource={setSource}
          historyDate={historyDate}
          setHistoryDate={setHistoryDate}
          onPickRandomDay={pickRandomDay}
        />
      </div>

      <div className="pointer-events-auto absolute right-4 top-24 w-96 max-w-[92vw] z-[1200]">
        <Drawer
          quake={selected}
          onClose={() => setSelected(null)}
          footer={
            selected
              ? `Occurred ${formatAgo(selected.time)} • Depth ${
                  selected.depth?.toFixed?.(1) ?? "—"
                } km`
              : ""
          }
        />
      </div>
    </div>
  );
}
