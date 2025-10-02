"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";

const ReactRain = dynamic(() => import("react-rain-animation"), { ssr: false });

export default function RainPortal({
    active,
    intensity = 1,
    color = "rgba(0,153,255,1)",
    z = 999999,
}) {
    const [mounted, setMounted] = useState(false);
    const hostRef = useRef(null);


    useEffect(() => {
        setMounted(true);
        let host = document.getElementById("rain-root");
        if (!host) {
            host = document.createElement("div");
            host.id = "rain-root";
            document.body.appendChild(host);
        }
        hostRef.current = host;
        return () => {
        };
    }, []);

    const numDrops = useMemo(() => {
        return Math.max(80, Math.min(1400, Math.round(600 * intensity)));
    }, [intensity]);

    if (!mounted || !hostRef.current || !active) return null;

    return createPortal(
        <div
            className="rain-portal fixed inset-0 pointer-events-none"
            style={{ zIndex: z }}
            aria-hidden
        >
            <ReactRain numDrops={numDrops} />
            {/* Safety styles to ensure visibility regardless of app CSS */}
            <style jsx global>{`
        /* The package mounts a .rain container with absolutely positioned .drop children */
        .rain-portal,
        .rain-portal .rain {
          position: fixed !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          pointer-events: none !important;
          contain: layout paint style; /* prevent weird interactions */
        }
        .rain-portal .drop {
          background: linear-gradient(to bottom, rgba(255,255,255,0), ${color}) !important;
          width: 3px !important;
          height: 18px !important;
          opacity: 0.95 !important;
          filter: drop-shadow(0 0 3px ${color}) !important;
        }
      `}</style>
        </div>,
        hostRef.current
    );
}
