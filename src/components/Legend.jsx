// src/components/Legend.jsx
"use client";

export default function Legend({ hazard = "earthquakes" }) {
  if (hazard === "floods") {
    return (
      <div className="text-xs">
        <div className="mb-2 font-semibold">Flood alert level</div>
        <div className="flex items-center gap-3">
          <Swatch c="#22c55e" label="Green" />
          <Swatch c="#f59e0b" label="Orange" />
          <Swatch c="#ef4444" label="Red" />
        </div>
      </div>
    );
  }
  return (
    <div className="text-xs">
      <div className="mb-2 font-semibold">Magnitude</div>
      <div className="flex items-center gap-3">
        <Swatch c="#38bdf8" label="< 3" />
        <Swatch c="#22c55e" label="3 – 5" />
        <Swatch c="#f59e0b" label="5 – 7" />
        <Swatch c="#ef4444" label="≥ 7" />
      </div>
    </div>
  );
}

function Swatch({ c, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />
      <span>{label}</span>
    </div>
  );
}
