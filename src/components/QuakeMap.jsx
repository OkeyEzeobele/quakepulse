"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
const LEVEL_COLOR = { green: "#22c55e", orange: "#f59e0b", red: "#ef4444" };

function FlyTo({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (!flyTo) return;
    const { center, zoom } = flyTo;
    if (
      Array.isArray(center) &&
      Number.isFinite(center[0]) &&
      Number.isFinite(center[1])
    ) {
      map.flyTo(center, zoom ?? map.getZoom(), { duration: 1.1 });
    }
  }, [flyTo, map]);
  return null;
}

function BoundsHandler({ onMove }) {
  const map = useMap();
  useEffect(() => {
    function handleMove() {
      onMove?.();
    }
    map.on("movestart", handleMove);
    return () => {
      map.off("movestart", handleMove);
    };
  }, [map, onMove]);
  return null;
}

function magColor(m = 0) {
  if (m >= 7) return "rgba(220,38,38,0.95)";
  if (m >= 6) return "rgba(244,63,94,0.95)";
  if (m >= 5) return "rgba(249,115,22,0.95)";
  if (m >= 4) return "rgba(234,179,8,0.95)";
  return "rgba(59,130,246,0.95)";
}
function magFill(m = 0) {
  if (m >= 7) return "rgba(220,38,38,0.55)";
  if (m >= 6) return "rgba(244,63,94,0.55)";
  if (m >= 5) return "rgba(249,115,22,0.55)";
  if (m >= 4) return "rgba(234,179,8,0.55)";
  return "rgba(59,130,246,0.55)";
}
function magRadius(m = 0) {
  const mm = Math.max(0, m);
  return Math.max(4, Math.min(24, 3 + mm * 3.2));
}

export default function QuakeMap({
  quakes = [],
  floods = [],
  flyTo,
  onSelect,
  onMove,
}) {
  const eq = useMemo(() => quakes ?? [], [quakes]);
  const fl = useMemo(() => floods ?? [], [floods]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      zoomControl={false}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
      preferCanvas
    >
      <TileLayer
        attribution=""
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyTo flyTo={flyTo} />
      <BoundsHandler onMove={onMove} />

      {eq.map((q) => (
        <CircleMarker
          key={`eq-${q.id}`}
          center={[q.lat, q.lon]}
          radius={magRadius(q.mag)}
          pathOptions={{
            color: magColor(q.mag),
            weight: 1.5,
            fillColor: magFill(q.mag),
            fillOpacity: 0.7,
          }}
          eventHandlers={{ click: () => onSelect?.(q) }}
        >
          <Popup>
            <div className="text-xs">
              <div className="font-semibold">M{(q.mag ?? 0).toFixed(1)}</div>
              <div>{q.place || "Unknown location"}</div>
              <div>
                {(q.lat ?? 0).toFixed(3)}, {(q.lon ?? 0).toFixed(3)}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {fl.map((f) => {
        const lvl = (f.level ?? f.alertlevel ?? "").toString().toLowerCase();
        const color = LEVEL_COLOR[lvl] ?? "#0ea5e9";
        return (
          <CircleMarker
            key={`fl-${f.id ?? `${f.lat},${f.lon}`}`}
            center={[f.lat, f.lon]}
            radius={9}
            pathOptions={{
              color,
              weight: 1.6,
              fillColor: color,
              fillOpacity: 0.8,
            }}
            eventHandlers={{ click: () => onSelect?.(f) }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{f.name || "Flood event"}</div>
                <div className="opacity-80 capitalize">{lvl || "—"}</div>
                <div>
                  {(f.lat ?? 0).toFixed(3)}, {(f.lon ?? 0).toFixed(3)}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
