// src/components/FXOverlay.jsx
"use client";

export default function FXOverlay(props) {
  const kind =
    props.kind ??
    (props.hazard === "flood" || props.hazard === "floods"
      ? "rain"
      : props.hazard === "earthquake" || props.hazard === "earthquakes"
      ? "earthquake"
      : "none");

  const show = props.show ?? props.active ?? false;
  const durationMs = props.durationMs ?? 1200;
  const intensity = props.intensity ?? 1;

  if (!show || kind === "none") return null;

  const style = {
    animationDuration: `${Math.max(200, durationMs)}ms`,
    "--fx-intensity": String(Math.max(0.3, Math.min(2, intensity))),
  };

  if (kind === "earthquake") {
    return <div className="fx-quake" style={style} />;
  }

  if (kind === "rain") {
    return (
      <div className="fx-rain" style={style}>
        <div className="fx-rain-layer" />
        <div className="fx-rain-mist" />
      </div>
    );
  }

  return null;
}
