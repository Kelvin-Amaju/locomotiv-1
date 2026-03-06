import React, { useEffect, useState } from "react";
import { X, Navigation, Clock, MapPin, Gauge } from "lucide-react";

interface JourneyModalProps {
  speed: number | null;
  distanceRemaining: number | null;
  durationRemaining: string | null;
  onStop: () => void;
}

export default function JourneyModal({
  speed,
  distanceRemaining,
  durationRemaining,
  onStop,
}: JourneyModalProps) {
  const speedKmh = speed ? Math.round(speed * 3.6) : 0;
  const speedPct = Math.min(100, (speedKmh / 160) * 100);

  // Pulse ring for the live indicator
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 1400);
    return () => clearInterval(id);
  }, []);

  // Speed zone color
  const speedColor =
    speedKmh < 60
      ? "#22C97A"
      : speedKmh < 100
        ? "#3B7FFF"
        : speedKmh < 130
          ? "#F59E0B"
          : "#EF4444";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .jm-root {
          position: fixed;
          inset-x: 0;
          bottom: 0;
          z-index: 50;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        @media (min-width: 768px) {
          .jm-root {
            top: 0;
            right: 0;
            left: auto;
            width: 380px;
            height: 100%;
            justify-content: flex-start;
          }
        }

        .jm-panel {
          pointer-events: auto;
          background: #080C10;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 32px 28px 36px;
          border-radius: 28px 28px 0 0;
          position: relative;
          overflow: hidden;
          box-shadow: 0 -24px 80px rgba(0,0,0,0.8);
        }

        @media (min-width: 768px) {
          .jm-panel {
            height: 100%;
            border-radius: 0;
            border-top: none;
            border-left: 1px solid rgba(255,255,255,0.08);
            display: flex;
            flex-direction: column;
            padding: 40px 32px;
            box-shadow: -24px 0 80px rgba(0,0,0,0.6);
          }
        }

        /* Ambient glow layer */
        .jm-panel::before {
          content: '';
          position: absolute;
          top: -60px; left: 50%; transform: translateX(-50%);
          width: 280px; height: 280px;
          border-radius: 50%;
          background: var(--jm-speed-color, #3B7FFF);
          opacity: 0.06;
          filter: blur(60px);
          pointer-events: none;
          transition: background 0.8s ease;
        }

        /* Top drag handle */
        .jm-handle {
          width: 40px; height: 4px;
          background: rgba(255,255,255,0.12);
          border-radius: 100px;
          margin: 0 auto 28px;
        }

        @media (min-width: 768px) {
          .jm-handle { display: none; }
        }

        /* Header */
        .jm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 36px;
        }

        .jm-live-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(59,127,255,0.1);
          border: 1px solid rgba(59,127,255,0.25);
          border-radius: 100px;
          padding: 6px 14px 6px 10px;
        }

        .jm-live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #3B7FFF;
          transition: box-shadow 0.4s, opacity 0.4s;
        }

        .jm-live-dot.active {
          box-shadow: 0 0 10px #3B7FFF, 0 0 20px rgba(59,127,255,0.5);
        }

        .jm-live-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #3B7FFF;
        }

        .jm-close {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: #5E6E82;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }
        .jm-close:hover {
          background: rgba(239,68,68,0.15);
          border-color: rgba(239,68,68,0.3);
          color: #EF4444;
        }

        /* Speedometer */
        .jm-speedo {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 40px;
        }

        .jm-speed-number {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 110px;
          line-height: 0.85;
          letter-spacing: -0.01em;
          transition: color 0.8s ease;
        }

        .jm-speed-unit {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.16em;
          color: #5E6E82;
          text-transform: uppercase;
          margin-top: 10px;
        }

        /* Arc track */
        .jm-arc-wrap {
          width: 100%;
          margin-top: 20px;
          position: relative;
        }

        .jm-arc-track {
          height: 3px;
          background: rgba(255,255,255,0.07);
          border-radius: 100px;
          overflow: hidden;
          position: relative;
        }

        .jm-arc-fill {
          height: 100%;
          border-radius: 100px;
          transition: width 0.4s cubic-bezier(0.4,0,0.2,1), background 0.8s;
          position: relative;
        }

        .jm-arc-fill::after {
          content: '';
          position: absolute;
          right: 0; top: 50%;
          transform: translateY(-50%);
          width: 8px; height: 8px;
          border-radius: 50%;
          background: inherit;
          box-shadow: 0 0 12px currentColor;
        }

        /* Tick marks */
        .jm-ticks {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
        }
        .jm-tick {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.2);
        }

        /* Stats grid */
        .jm-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 28px;
        }

        .jm-stat {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          transition: border-color 0.2s;
        }
        .jm-stat:hover {
          border-color: rgba(255,255,255,0.12);
        }

        .jm-stat-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }

        .jm-stat-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px;
          line-height: 1;
          letter-spacing: 0.02em;
          color: #E8EDF2;
        }

        .jm-stat-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #5E6E82;
        }

        /* Stop button */
        .jm-stop {
          width: 100%;
          padding: 16px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 14px;
          color: #EF4444;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 0.12em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .jm-stop:hover {
          background: rgba(239,68,68,0.18);
          box-shadow: 0 0 32px rgba(239,68,68,0.2);
          transform: translateY(-1px);
        }
        .jm-stop:active {
          transform: scale(0.98);
        }

        @media (min-width: 768px) {
          .jm-stats { flex: 1; }
        }
      `}</style>

      <div
        className="jm-root"
        style={{ "--jm-speed-color": speedColor } as React.CSSProperties}
      >
        <div className="jm-panel">
          <div className="jm-handle" />

          {/* Header */}
          <div className="jm-header">
            <div className="jm-live-badge">
              <div className={`jm-live-dot ${pulse ? "active" : ""}`} />
              <span className="jm-live-text">Live Journey</span>
            </div>
            <button className="jm-close" onClick={onStop} title="End journey">
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>

          {/* Speedometer */}
          <div className="jm-speedo">
            <div className="jm-speed-number" style={{ color: speedColor }}>
              {speedKmh}
            </div>
            <div className="jm-speed-unit">km / h</div>

            <div className="jm-arc-wrap">
              <div className="jm-arc-track">
                <div
                  className="jm-arc-fill"
                  style={{
                    width: `${speedPct}%`,
                    background: `linear-gradient(90deg, rgba(59,127,255,0.6), ${speedColor})`,
                  }}
                />
              </div>
              <div className="jm-ticks">
                {["0", "40", "80", "120", "160"].map((v) => (
                  <span key={v} className="jm-tick">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="jm-stats">
            <div className="jm-stat">
              <div
                className="jm-stat-icon"
                style={{
                  background: "rgba(34,201,122,0.1)",
                  border: "1px solid rgba(34,201,122,0.2)",
                }}
              >
                <MapPin
                  style={{ width: "15px", height: "15px", color: "#22C97A" }}
                />
              </div>
              <div className="jm-stat-value">
                {distanceRemaining !== null ? distanceRemaining : "—"}
              </div>
              <div className="jm-stat-label">km remaining</div>
            </div>

            <div className="jm-stat">
              <div
                className="jm-stat-icon"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <Clock
                  style={{ width: "15px", height: "15px", color: "#F59E0B" }}
                />
              </div>
              <div
                className="jm-stat-value"
                style={{
                  fontSize:
                    durationRemaining && durationRemaining.length > 5
                      ? "22px"
                      : "32px",
                }}
              >
                {durationRemaining || "—"}
              </div>
              <div className="jm-stat-label">time left</div>
            </div>
          </div>

          {/* Stop */}
          <button className="jm-stop" onClick={onStop}>
            <X style={{ width: "16px", height: "16px" }} />
            End Journey
          </button>
        </div>
      </div>
    </>
  );
}
