import React from "react";
import { X, Navigation, Clock, MapPin } from "lucide-react";

interface JourneyModalProps {
  speed: number | null; // m/s
  distanceRemaining: number | null; // km
  durationRemaining: string | null;
  onStop: () => void;
}

export default function JourneyModal({
  speed,
  distanceRemaining,
  durationRemaining,
  onStop,
}: JourneyModalProps) {
  // Convert speed from m/s to km/h
  const speedKmh = speed ? Math.round(speed * 3.6) : 0;

  // Calculate progress percentage?
  // We'd need total distance for that. For now just show remaining stats.

  return (
    <div className="fixed inset-x-0 bottom-0 md:top-0 md:right-0 md:left-auto md:w-[400px] md:h-full z-50 pointer-events-none flex flex-col justify-end md:justify-start">
      {/* Mobile: Bottom Sheet style / Desktop: Side Panel style */}
      {/* Container itself is pointer-events-none so map interaction works behind (if visible) */}
      {/* Use pointer-events-auto for the actual card */}

      <div className="bg-white/95 backdrop-blur-md shadow-2xl p-6 md:h-full md:border-l border-slate-200 pointer-events-auto rounded-t-3xl md:rounded-none transition-transform duration-300 transform translate-y-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 md:mb-12">
          <div className="flex items-center space-x-2 text-blue-600">
            <Navigation className="w-6 h-6 animate-pulse" />
            <span className="font-bold text-lg uppercase tracking-wider">
              Live Journey
            </span>
          </div>
          <button
            onClick={onStop}
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full transition-colors"
            title="End Journey"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Speedometer */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="relative">
            <div className="text-8xl font-black text-slate-900 tracking-tighter">
              {speedKmh}
            </div>
            <div className="absolute -right-8 top-2 text-xl font-bold text-slate-400">
              km/h
            </div>
          </div>
          {/* Speed Visualizer Bar */}
          <div className="w-full max-w-[200px] h-2 bg-slate-200 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, (speedKmh / 160) * 100)}%` }} // Assume 160km/h max for visual
            />
          </div>
        </div>

        {/* Route Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
            <MapPin className="w-6 h-6 text-emerald-500 mb-2" />
            <div className="text-2xl font-bold text-slate-800">
              {distanceRemaining !== null ? distanceRemaining : "--"}
            </div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wide">
              km left
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
            <Clock className="w-6 h-6 text-orange-500 mb-2" />
            <div className="text-2xl font-bold text-slate-800">
              {durationRemaining || "--"}
            </div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wide">
              time left
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto md:mt-auto">
          <button
            onClick={onStop}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 transition-all transform active:scale-95"
          >
            Stop Journey
          </button>
        </div>
      </div>
    </div>
  );
}
