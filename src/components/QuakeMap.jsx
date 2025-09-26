"use client";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import { useEffect, useMemo } from "react";
import L from "leaflet";

function Fly({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo(target.center, target.zoom, { duration: 2 });
  }, [map, target]);
  return null;
}

export default function QuakeMap({ quakes, flyTo, onSelect, onMove }) {
  const bounds = useMemo(() => {
    if (!quakes?.length) return null;
    const b = L.latLngBounds(quakes.map((q) => [q.lat, q.lon]));
    return b;
  }, [quakes]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      worldCopyJump
      minZoom={2}
      zoomControl={false}
      whenReady={(m) => m.target.on("movestart", onMove)}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {quakes.map((q) => (
        <CircleMarker
          key={q.id}
          center={[q.lat, q.lon]}
          radius={Math.max(4, q.mag * 2)}
          pathOptions={{ color: colorFor(q.mag), fillOpacity: 0.6, weight: 1 }}
          className={q.isNew ? "pulse" : ""}
          eventHandlers={{ click: () => onSelect(q) }}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={1} sticky>
            <div className="text-xs">
              <div className="font-semibold">M{q.mag?.toFixed?.(1) ?? "—"}</div>
              <div className="opacity-80">{q.place || "Unknown location"}</div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
      {flyTo ? <Fly target={flyTo} /> : null}
    </MapContainer>
  );
}

function colorFor(m) {
  if (m >= 7) return "#ef4444";
  if (m >= 5) return "#f59e0b";
  if (m >= 3) return "#22c55e";
  return "#38bdf8";
}
