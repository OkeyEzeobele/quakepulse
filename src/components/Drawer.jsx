"use client";

export default function Drawer({ quake, onClose, footer }) {
  if (!quake) return null;
  return (
    <div className="panel max-h-[80vh] overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-start gap-3">
        <div className="flex-1">
          <div className="text-sm uppercase tracking-wide opacity-70">
            Earthquake
          </div>
          <div className="text-lg font-semibold">
            M{quake.mag?.toFixed?.(1) ?? "—"} •{" "}
            {quake.place || "Unknown location"}
          </div>
          <div className="text-xs opacity-70">
            Lat {quake.lat.toFixed(3)} • Lon {quake.lon.toFixed(3)}
          </div>
        </div>
        <button onClick={onClose} className="badge">
          Close
        </button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat name="Magnitude" value={quake.mag?.toFixed?.(1) ?? "—"} />
          <Stat name="Depth (km)" value={quake.depth?.toFixed?.(1) ?? "—"} />
          <Stat name="ID" value={quake.id} mono />
          <Stat name="Time" value={new Date(quake.time).toLocaleString()} />
        </div>
      </div>
      <div className="px-4 py-3 border-t border-white/10 text-xs opacity-80">
        {footer}
      </div>
    </div>
  );
}

function Stat({ name, value, mono }) {
  return (
    <div className="panel p-3">
      <div className="text-xs opacity-70">{name}</div>
      <div className={mono ? "font-mono text-sm break-all" : "text-sm"}>
        {value}
      </div>
    </div>
  );
}
