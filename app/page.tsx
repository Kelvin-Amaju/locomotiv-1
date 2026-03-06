"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Car,
  CheckCircle,
  ArrowRight,
  X,
  Fuel,
  AlertCircle,
  Ruler,
  Navigation,
  Camera,
  Upload,
  ImagePlus,
  Loader2,
  Scan,
  Zap,
} from "lucide-react";
import Features from "./components/Features";
import MapPanel from "./components/MapPanel";
import JourneyModal from "./components/JourneyModal";

export default function CarLandingPage() {
  const [selection, setSelection] = useState({
    year: "2026",
    make: "",
    model: "",
  });
  const [makes, setMakes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState({ makes: false, models: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [vehicleDetails, setVehicleDetails] = useState<any[]>([]);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [vehicleSpecs, setVehicleSpecs] = useState<any[]>([]);
  const [specsError, setSpecsError] = useState("");
  const [trip, setTrip] = useState({
    origin: "",
    destination: "",
    destinationAddress: "",
    distanceKm: 0,
    duration: "",
  });
  const [fuelData, setFuelData] = useState({
    tankCapacity: 50,
    consumption: 12,
    currentFuel: 50,
    fuelType: "Petrol/Diesel",
    pricePerLiter: 1100,
  });
  const [tripAnalysis, setTripAnalysis] = useState<any>(null);
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  const [journeyStats, setJourneyStats] = useState({
    speed: 0,
    distanceRemaining: 0,
    durationRemaining: "",
  });

  // Camera modal
  const [cameraOpen, setCameraOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchMakes = async () => {
      setLoading((p) => ({ ...p, makes: true }));
      try {
        const res = await fetch(
          "https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json",
        );
        const data = await res.json();
        setMakes(
          data.Results.sort((a: any, b: any) =>
            a.MakeName.localeCompare(b.MakeName),
          ),
        );
      } catch {
      } finally {
        setLoading((p) => ({ ...p, makes: false }));
      }
    };
    fetchMakes();
  }, []);

  useEffect(() => {
    if (selection.make && selection.year) {
      setLoading((p) => ({ ...p, models: true }));
      (async () => {
        try {
          const res = await fetch(
            `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/${encodeURIComponent(selection.make)}/modelyear/${selection.year}?format=json`,
          );
          const data = await res.json();
          const u = Array.from(
            new Map(
              (data.Results || []).map((m: any) => [m.Model_ID, m]),
            ).values(),
          );
          u.sort((a: any, b: any) => a.Model_Name.localeCompare(b.Model_Name));
          setModels(u);
        } catch {
        } finally {
          setLoading((p) => ({ ...p, models: false }));
        }
      })();
    } else setModels([]);
  }, [selection.make, selection.year]);

  useEffect(() => {
    if (
      vehicleSpecs.length > 0 &&
      fuelData.tankCapacity > 0 &&
      fuelData.consumption > 0
    )
      calcTrip();
  }, [fuelData, trip.distanceKm, vehicleSpecs]);

  const calcTrip = () => {
    const full = fuelData.tankCapacity * fuelData.consumption;
    const needed = trip.distanceKm / fuelData.consumption;
    const tanks = Math.ceil(needed / fuelData.tankCapacity);
    const stops = Math.max(0, tanks - 1);
    const safe = full * 0.85;
    setTripAnalysis({
      fullRangeKm: Math.round(full),
      currentRangeKm: Math.round(full * (fuelData.currentFuel / 100)),
      fuelNeededLiters: Math.round(needed * 10) / 10,
      stopsNeeded: stops,
      fullTanksNeeded: tanks,
      fuelCost: Math.round(needed * fuelData.pricePerLiter),
      isSuitable: trip.distanceKm <= safe || stops <= 3,
      suitabilityScore: Math.min(
        100,
        Math.round((safe / trip.distanceKm) * 100 * (stops <= 2 ? 1.3 : 1)),
      ),
      fuelType: vehicleSpecs[0]?.model_engine_fuel || "Petrol/Diesel",
    });
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setSelection((p) => ({
      ...p,
      [name]: value,
      ...(name === "year" && { make: "", model: "" }),
      ...(name === "make" && { model: "" }),
    }));
  };

  const handleSearch = async () => {
    if (!selection.make || !selection.model) return;
    setSidebarOpen(true);
    setDetailsLoading(true);
    setVehicleDetails([]);
    setSpecsError("");
    try {
      const [typesRes, specsData] = await Promise.all([
        fetch(
          `/api/nhtsa?make=${encodeURIComponent(selection.make)}&model=${encodeURIComponent(selection.model)}&year=${encodeURIComponent(selection.year)}`,
        )
          .then(async (r) => ({
            ok: r.ok,
            parsed: await r.json().catch(() => null),
          }))
          .catch(() => ({ ok: false, parsed: null })),
        fetch(
          `/api/carquery?make=${encodeURIComponent(selection.make)}&model=${encodeURIComponent(selection.model)}&year=${encodeURIComponent(selection.year)}`,
        )
          .then(async (r) => (r.ok ? ((await r.json())?.data ?? null) : null))
          .catch(() => null),
      ]);
      setSpecsLoading(true);
      const tr: any = typesRes;
      setVehicleDetails(
        tr?.ok && tr.parsed?.data ? tr.parsed.data.Results || [] : [],
      );
      if (specsData?.Trims?.length > 0) {
        setVehicleSpecs(specsData.Trims);
        const t = specsData.Trims[0];
        if (t) {
          const liters = parseFloat(t.model_fuel_cap_l || "0") * 3.78541;
          const kmpl =
            parseFloat(t.model_lkm_hwy || t.model_lkm_mixed || "0") * 0.425144;
          setFuelData((p) => ({
            ...p,
            fuelType: t.model_engine_fuel || "Petrol/Diesel",
            tankCapacity: liters > 5 ? parseFloat(liters.toFixed(1)) : 50,
            consumption: kmpl > 3 ? parseFloat(kmpl.toFixed(1)) : 12,
            pricePerLiter: (t.model_engine_fuel || "")
              .toLowerCase()
              .includes("diesel")
              ? 1300
              : 1100,
          }));
        }
      } else {
        setVehicleSpecs([]);
        setSpecsError("No trims found.");
      }
    } catch {
      setVehicleDetails([]);
      setVehicleSpecs([]);
      setSpecsError("Failed to load specs");
    } finally {
      setDetailsLoading(false);
      setSpecsLoading(false);
    }
  };

  const years = Array.from(
    { length: 30 },
    (_, i) => new Date().getFullYear() - i,
  );

  const SuitabilityBadge = ({ analysis }: { analysis: any }) => (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border ${analysis?.isSuitable ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30" : "bg-amber-950/60 text-amber-400 border-amber-500/30"}`}
    >
      {analysis?.isSuitable ? (
        <>
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Trip Ready · {trip.distanceKm}km</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{analysis?.stopsNeeded} fuel stops needed</span>
        </>
      )}
    </div>
  );

  const handleMapUpdate = useCallback(
    ({ userPos, target, distanceKm, duration, speed, address }: any) => {
      setTrip((p) => ({
        ...p,
        origin: userPos
          ? `${userPos.lat.toFixed(5)}, ${userPos.lng.toFixed(5)}`
          : p.origin,
        destination: target
          ? `${target.lat.toFixed(5)}, ${target.lng.toFixed(5)}`
          : p.destination,
        destinationAddress: address || p.destinationAddress,
        distanceKm: distanceKm ?? p.distanceKm,
        duration: duration || p.duration,
      }));
      if (speed !== undefined || distanceKm != null)
        setJourneyStats((p) => ({
          speed: speed ?? p.speed,
          distanceRemaining: distanceKm ?? p.distanceRemaining,
          durationRemaining: duration ?? p.durationRemaining,
        }));
    },
    [],
  );

  // Camera handlers
  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) handleFileChange(f);
  };
  const closeCamera = () => {
    setCameraOpen(false);
    setUploadedImage(null);
    setUploadedFileName("");
    setAnalysisError(null);
    setIsAnalyzing(false);
    setAnalysisSuccess(false);
  };

  const handleSubmitPhoto = async () => {
    if (!uploadedImage) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch("/api/analyze-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: uploadedImage }),
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
      }

      if (!res.ok)
        throw new Error(data.details || data.error || "Analysis failed");

      if (!data.isVehicle) {
        setAnalysisError(
          data.reason || "This image does not appear to contain a vehicle.",
        );
        return;
      }

      // Success: Apply detected data
      setSelection({
        year: data.year || "2024",
        make: data.make || "",
        model: data.model || "",
      });

      setFuelData((p) => ({
        ...p,
        tankCapacity: data.tankCapacityLiters || p.tankCapacity,
        consumption: data.highwayConsumptionKmpL || p.consumption,
        fuelType: data.fuelType || p.fuelType,
      }));

      setAnalysisSuccess(true);
      // Automatically trigger search after a brief delay
      setTimeout(() => {
        closeCamera();
        handleSearch();
      }, 1500);
    } catch (err: any) {
      setAnalysisError(err.message || "Something went wrong during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&family=JetBrains+Mono:wght@400;500&display=swap');
        :root { --bg:#080C10;--surface:#0D1219;--surface2:#111924;--border:rgba(255,255,255,0.07);--border-hi:rgba(255,255,255,0.14);--text:#E8EDF2;--muted:#5E6E82;--accent:#3B7FFF;--accent-glow:rgba(59,127,255,0.25);--green:#22C97A;--amber:#F59E0B;--red:#EF4444; }
        *{box-sizing:border-box}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border-hi);border-radius:2px}
        .font-display{font-family:'Bebas Neue',sans-serif;letter-spacing:0.04em}.font-mono{font-family:'JetBrains Mono',monospace}
        .glass{background:var(--surface);border:1px solid var(--border);backdrop-filter:blur(20px)}
        .noise::after{content:'';position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");pointer-events:none;border-radius:inherit}
        .glow-line::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0.6}
        select{appearance:none;background:var(--surface2);color:var(--text);border:1px solid var(--border-hi);border-radius:10px;padding:12px 40px 12px 16px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;width:100%;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235E6E82' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;transition:border-color 0.2s,box-shadow 0.2s;outline:none}
        select:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}select:disabled{opacity:0.4;cursor:not-allowed}select option{background:#141B26}
        input[type="number"],input[type="text"]{background:var(--surface2);color:var(--text);border:1px solid var(--border-hi);border-radius:10px;padding:10px 14px;font-family:'DM Sans',sans-serif;font-size:14px;width:100%;outline:none;transition:border-color 0.2s,box-shadow 0.2s}
        input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
        input[type="range"]{-webkit-appearance:none;appearance:none;height:4px;background:var(--border-hi);border-radius:2px;width:100%;cursor:pointer;outline:none}
        input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid var(--bg);box-shadow:0 0 8px var(--accent-glow);cursor:pointer}
        .metric-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:28px;position:relative;overflow:hidden;transition:border-color 0.25s,transform 0.25s}
        .metric-card:hover{border-color:var(--border-hi);transform:translateY(-2px)}
        .metric-value{font-family:'Bebas Neue',sans-serif;font-size:2.8rem;letter-spacing:0.04em;line-height:1;color:var(--text)}
        .metric-label{font-size:11px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-top:6px}
        .progress-track{background:rgba(255,255,255,0.06);border-radius:100px;height:4px;margin-top:16px;overflow:hidden}
        .progress-fill{height:100%;border-radius:100px;transition:width 0.6s ease}
        .btn-primary{background:var(--accent);color:#fff;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;width:100%;justify-content:center;transition:opacity 0.2s,box-shadow 0.2s,transform 0.15s;box-shadow:0 4px 20px rgba(59,127,255,0.35)}
        .btn-primary:hover:not(:disabled){opacity:0.92;box-shadow:0 6px 28px rgba(59,127,255,0.5);transform:translateY(-1px)}.btn-primary:disabled{opacity:0.35;cursor:not-allowed;box-shadow:none}
        .btn-journey{background:linear-gradient(135deg,#1A3F8F 0%,var(--accent) 100%);color:#fff;font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:0.1em;padding:18px 48px;border-radius:100px;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:12px;box-shadow:0 8px 40px rgba(59,127,255,0.4);transition:box-shadow 0.3s,transform 0.3s}
        .btn-journey:hover{transform:scale(1.04);box-shadow:0 12px 56px rgba(59,127,255,0.6)}
        .sidebar{background:var(--surface);border-left:1px solid var(--border)}
        .spec-pill{background:rgba(59,127,255,0.1);border:1px solid rgba(59,127,255,0.2);border-radius:8px;padding:10px 14px;font-size:12px;color:#93AECF;line-height:1.5}
        .spec-pill strong{color:var(--text);font-weight:500}
        .divider{height:1px;background:var(--border);margin:24px 0}
        .scanlines{background-image:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .animate-fade-up{animation:fadeUp 0.6s ease forwards}.delay-1{animation-delay:0.1s;opacity:0}.delay-2{animation-delay:0.2s;opacity:0}.delay-3{animation-delay:0.3s;opacity:0}
        .dot-grid{background-image:radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px);background-size:28px 28px}
        .form-label{display:block;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}

        /* ── Camera FAB ──────────────────────────────── */
        .cam-fab{position:fixed;bottom:32px;right:32px;z-index:60;width:56px;height:56px;border-radius:16px;background:var(--surface2);border:1px solid var(--border-hi);color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.04);transition:transform 0.2s,box-shadow 0.2s,border-color 0.2s,background 0.2s}
        .cam-fab:hover{transform:translateY(-3px) scale(1.06);border-color:var(--accent);background:rgba(59,127,255,0.14);box-shadow:0 14px 44px rgba(0,0,0,0.5),0 0 24px var(--accent-glow)}
        .cam-fab:active{transform:scale(0.95)}
        .cam-fab-tip{position:absolute;right:calc(100% + 10px);top:50%;transform:translateY(-50%);background:var(--surface2);border:1px solid var(--border-hi);border-radius:8px;padding:5px 11px;font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.18s}
        .cam-fab:hover .cam-fab-tip{opacity:1}

        /* ── Camera Modal ────────────────────────────── */
        @keyframes modalIn{from{opacity:0;transform:translateY(18px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        .cam-backdrop{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,0.78);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;padding:16px}
        @media(min-width:540px){.cam-backdrop{align-items:center}}
        .cam-modal{background:var(--surface);border:1px solid var(--border-hi);border-radius:24px;width:100%;max-width:468px;overflow:hidden;animation:modalIn 0.32s cubic-bezier(0.34,1.4,0.64,1) forwards;box-shadow:0 40px 100px rgba(0,0,0,0.75);position:relative}
        .cam-modal::before{content:'';position:absolute;top:0;left:14%;right:14%;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0.65}
        .cam-header{padding:22px 22px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .cam-title{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:0.05em;color:var(--text);line-height:1}
        .cam-sub{font-size:13px;color:var(--muted);font-weight:300;margin-top:3px;line-height:1.5}
        .cam-close{width:34px;height:34px;flex-shrink:0;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border-hi);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s,color 0.2s,border-color 0.2s}
        .cam-close:hover{background:rgba(239,68,68,0.15);color:var(--red);border-color:rgba(239,68,68,0.3)}
        .cam-body{padding:18px 22px 22px;display:flex;flex-direction:column;gap:13px}
        .cam-steps{display:flex;flex-direction:column;gap:7px}
        .cam-step{display:flex;align-items:flex-start;gap:11px;padding:10px 13px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:11px}
        .cam-step-num{width:22px;height:22px;border-radius:6px;flex-shrink:0;background:rgba(59,127,255,0.14);border:1px solid rgba(59,127,255,0.28);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:500;color:var(--accent)}
        .cam-step-text{font-size:13px;color:var(--muted);line-height:1.5}.cam-step-text strong{color:var(--text);font-weight:500}
        .cam-dropzone{border:1.5px dashed var(--border-hi);border-radius:14px;padding:28px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;cursor:pointer;transition:border-color 0.2s,background 0.2s;background:rgba(255,255,255,0.02);text-align:center}
        .cam-dropzone:hover,.cam-dropzone.drag-on{border-color:var(--accent);background:rgba(59,127,255,0.06)}
        .cam-dz-icon{width:46px;height:46px;border-radius:13px;background:rgba(59,127,255,0.1);border:1px solid rgba(59,127,255,0.2);display:flex;align-items:center;justify-content:center;margin-bottom:2px}
        .cam-dz-title{font-size:14px;font-weight:500;color:var(--text)}.cam-dz-hint{font-size:12px;color:var(--muted);line-height:1.5}
        .cam-or{display:flex;align-items:center;gap:9px;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted)}
        .cam-or::before,.cam-or::after{content:'';flex:1;height:1px;background:var(--border-hi)}
        .cam-capture{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border-hi);border-radius:11px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:background 0.2s,border-color 0.2s}
        .cam-capture:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.2)}
        .cam-preview{border-radius:13px;overflow:hidden;border:1px solid var(--border-hi);position:relative}
        .cam-preview img{width:100%;height:190px;object-fit:cover;display:block}
        .cam-preview-bar{position:absolute;inset:0;background:linear-gradient(to top,rgba(8,12,16,0.82) 0%,transparent 55%);display:flex;align-items:flex-end;padding:11px 13px;gap:8px}
        .cam-fname{font-size:12px;color:rgba(255,255,255,0.8);font-family:'JetBrains Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
        .cam-clear{width:27px;height:27px;border-radius:7px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.3);color:var(--red);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.2s}
        .cam-clear:hover{background:rgba(239,68,68,0.36)}
        .cam-submit{width:100%;padding:14px;background:var(--accent);border:none;border-radius:12px;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;box-shadow:0 4px 20px rgba(59,127,255,0.4);transition:opacity 0.2s,transform 0.15s,box-shadow 0.2s}
        .cam-submit:hover:not(:disabled){opacity:0.9;transform:translateY(-1px);box-shadow:0 6px 28px rgba(59,127,255,0.55)}.cam-submit:disabled{opacity:0.3;cursor:not-allowed;box-shadow:none}
      `}</style>

      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        {/* HERO */}
        {!isJourneyActive && (
          <section
            style={{
              position: "relative",
              overflow: "hidden",
              paddingTop: 80,
              paddingBottom: 100,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(59,127,255,0.18) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div
              className="dot-grid scanlines"
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.4,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background:
                  "linear-gradient(90deg,transparent 0%,rgba(59,127,255,0.5) 30%,rgba(59,127,255,0.5) 70%,transparent 100%)",
              }}
            />

            <div
              style={{
                maxWidth: 1120,
                margin: "0 auto",
                padding: "0 24px",
                position: "relative",
              }}
            >
              <div
                className="animate-fade-up"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(59,127,255,0.1)",
                  border: "1px solid rgba(59,127,255,0.25)",
                  borderRadius: 100,
                  padding: "6px 16px",
                  marginBottom: 32,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    boxShadow: "0 0 8px var(--accent)",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                  }}
                >
                  Vehicle Intelligence Platform
                </span>
              </div>

              <h1
                className="font-display animate-fade-up delay-1"
                style={{
                  fontSize: "clamp(56px,9vw,120px)",
                  lineHeight: 0.92,
                  color: "var(--text)",
                  marginBottom: 28,
                }}
              >
                Know Your
                <br />
                <span style={{ color: "var(--accent)" }}>Vehicle.</span>
                <br />
                Own The Road.
              </h1>
              <p
                className="animate-fade-up delay-2"
                style={{
                  fontSize: 18,
                  fontWeight: 300,
                  color: "var(--muted)",
                  maxWidth: 440,
                  lineHeight: 1.7,
                  marginBottom: 56,
                }}
              >
                Full specs, live trip analysis, and real-time fuel intelligence
                — all in one precision dashboard.
              </p>

              <div
                className="glass glow-line noise animate-fade-up delay-3"
                style={{
                  borderRadius: 24,
                  padding: 32,
                  position: "relative",
                  maxWidth: 860,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                    gap: 16,
                    alignItems: "end",
                  }}
                >
                  <div>
                    <label className="form-label">Year</label>
                    <select
                      name="year"
                      value={selection.year}
                      onChange={handleChange}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Make</label>
                    <select
                      name="make"
                      value={selection.make}
                      disabled={loading.makes}
                      onChange={handleChange}
                    >
                      <option value="">Select make</option>
                      {makes.map((m) => (
                        <option key={m.MakeId} value={m.MakeName}>
                          {m.MakeName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Model</label>
                    <select
                      name="model"
                      value={selection.model}
                      disabled={!selection.make || loading.models}
                      onChange={handleChange}
                    >
                      <option value="">Select model</option>
                      {models.map((m) => (
                        <option key={m.Model_ID} value={m.Model_Name}>
                          {m.Model_Name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <button
                      className="btn-primary"
                      onClick={handleSearch}
                      disabled={!selection.make || !selection.model}
                    >
                      <Search style={{ width: 16, height: 16 }} />
                      <span>Search Specs</span>
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 32,
                    marginTop: 28,
                    paddingTop: 24,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {[
                    ["10,000+", "Vehicles"],
                    ["Real-time", "Fuel Data"],
                    ["Live", "Navigation"],
                  ].map(([v, l]) => (
                    <div
                      key={l}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          color: "var(--text)",
                        }}
                      >
                        {v}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--muted)",
                        }}
                      >
                        {l}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TRIP SECTION */}
        {(selection.make || selection.model) && (
          <section
            style={{
              background: isJourneyActive ? "transparent" : "var(--bg)",
              padding: isJourneyActive ? 0 : "64px 0",
              borderTop: isJourneyActive ? "none" : "1px solid var(--border)",
            }}
          >
            <div
              style={{
                maxWidth: isJourneyActive ? "100%" : 1120,
                margin: "0 auto",
                padding: isJourneyActive ? 0 : "0 24px",
              }}
            >
              {!isJourneyActive && (
                <div style={{ marginBottom: 48 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 16,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "var(--accent)",
                          marginBottom: 8,
                        }}
                      >
                        Trip Intelligence
                      </p>
                      <h2
                        className="font-display"
                        style={{
                          fontSize: "clamp(36px,5vw,60px)",
                          lineHeight: 1,
                          color: "var(--text)",
                          margin: 0,
                        }}
                      >
                        {selection.make} {selection.model}
                      </h2>
                    </div>
                    {trip.distanceKm > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 6,
                        }}
                      >
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 28,
                            fontWeight: 500,
                            color: "var(--text)",
                          }}
                        >
                          {trip.distanceKm}{" "}
                          <span style={{ fontSize: 14, color: "var(--muted)" }}>
                            km
                          </span>
                        </span>
                        {trip.duration && (
                          <span style={{ fontSize: 13, color: "var(--muted)" }}>
                            {trip.duration}
                          </span>
                        )}
                        {trip.destinationAddress && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--muted)",
                              background: "var(--surface2)",
                              border: "1px solid var(--border)",
                              borderRadius: 100,
                              padding: "4px 12px",
                              maxWidth: 280,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            📍 {trip.destinationAddress}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {!trip.distanceKm && (
                    <p
                      style={{
                        fontSize: 14,
                        color: "var(--muted)",
                        marginTop: 12,
                      }}
                    >
                      Drop a pin on the map below to calculate route & fuel
                      costs →
                    </p>
                  )}
                </div>
              )}

              {tripAnalysis && trip.distanceKm > 0 && !isJourneyActive && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                    gap: 20,
                    marginBottom: 40,
                  }}
                >
                  <div className="metric-card">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: "rgba(34,201,122,0.12)",
                          border: "1px solid rgba(34,201,122,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ruler
                          style={{
                            width: 18,
                            height: 18,
                            color: "var(--green)",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--muted)",
                        }}
                      >
                        Full Tank
                      </span>
                    </div>
                    <div className="metric-value">
                      {tripAnalysis.fullRangeKm}
                      <span
                        style={{
                          fontSize: "1.2rem",
                          fontFamily: "DM Sans",
                          fontWeight: 300,
                          color: "var(--muted)",
                          marginLeft: 6,
                        }}
                      >
                        km
                      </span>
                    </div>
                    <div className="metric-label">Maximum range</div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, (tripAnalysis.fullRangeKm / (trip.distanceKm * 1.5)) * 100)}%`,
                          background:
                            "linear-gradient(90deg,var(--green),#4ADE80)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="metric-card" style={{ position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 20,
                        background: tripAnalysis.isSuitable
                          ? "radial-gradient(circle at 80% 20%,rgba(34,201,122,0.06) 0%,transparent 60%)"
                          : "radial-gradient(circle at 80% 20%,rgba(245,158,11,0.06) 0%,transparent 60%)",
                      }}
                    />
                    <div style={{ marginBottom: 16 }}>
                      <SuitabilityBadge analysis={tripAnalysis} />
                    </div>
                    <div
                      className="metric-value"
                      style={{
                        color: tripAnalysis.isSuitable
                          ? "var(--green)"
                          : "var(--amber)",
                      }}
                    >
                      {tripAnalysis.suitabilityScore}
                      <span
                        style={{
                          fontSize: "1.2rem",
                          fontFamily: "DM Sans",
                          fontWeight: 300,
                          color: "var(--muted)",
                          marginLeft: 4,
                        }}
                      >
                        %
                      </span>
                    </div>
                    <div className="metric-label">Suitability score</div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${tripAnalysis.suitabilityScore}%`,
                          background: tripAnalysis.isSuitable
                            ? "linear-gradient(90deg,var(--green),#4ADE80)"
                            : "linear-gradient(90deg,var(--amber),#FCD34D)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="metric-card">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: "rgba(245,158,11,0.1)",
                          border: "1px solid rgba(245,158,11,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Fuel
                          style={{
                            width: 18,
                            height: 18,
                            color: "var(--amber)",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--muted)",
                        }}
                      >
                        Est. Cost
                      </span>
                    </div>
                    <div
                      className="metric-value"
                      style={{ fontSize: "2.2rem" }}
                    >
                      ₦{(tripAnalysis.fuelCost / 1000).toFixed(1)}
                      <span
                        style={{
                          fontSize: "1rem",
                          fontFamily: "DM Sans",
                          fontWeight: 300,
                          color: "var(--muted)",
                          marginLeft: 4,
                        }}
                      >
                        k
                      </span>
                    </div>
                    <div className="metric-label">
                      Fuel spend · {tripAnalysis.stopsNeeded} stop
                      {tripAnalysis.stopsNeeded !== 1 ? "s" : ""}
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 11,
                          background: "rgba(245,158,11,0.1)",
                          border: "1px solid rgba(245,158,11,0.2)",
                          borderRadius: 6,
                          padding: "3px 8px",
                          color: "#FCD34D",
                        }}
                      >
                        {tripAnalysis.fuelNeededLiters}L needed
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {tripAnalysis && trip.distanceKm > 0 && !isJourneyActive && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 48,
                  }}
                >
                  <button
                    className="btn-journey"
                    onClick={() => setIsJourneyActive(true)}
                  >
                    <Navigation style={{ width: 22, height: 22 }} />
                    Start Live Journey
                  </button>
                </div>
              )}

              <div
                style={
                  isJourneyActive
                    ? { position: "fixed", inset: 0, zIndex: 0 }
                    : {
                        borderRadius: 24,
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                        boxShadow: "0 0 60px rgba(0,0,0,0.5)",
                        marginBottom: 24,
                      }
                }
              >
                <MapPanel
                  onUpdate={handleMapUpdate}
                  isJourneyActive={isJourneyActive}
                />
              </div>
              {isJourneyActive && (
                <JourneyModal
                  speed={journeyStats.speed}
                  distanceRemaining={journeyStats.distanceRemaining}
                  durationRemaining={journeyStats.durationRemaining}
                  onStop={() => setIsJourneyActive(false)}
                />
              )}
            </div>
          </section>
        )}

        {/* SIDEBAR */}
        <div
          aria-hidden={!sidebarOpen}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            pointerEvents: sidebarOpen ? "auto" : "none",
          }}
        >
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(4px)",
              opacity: sidebarOpen ? 1 : 0,
              transition: "opacity 0.3s",
              pointerEvents: sidebarOpen ? "auto" : "none",
            }}
          />
          <aside
            className="sidebar"
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              height: "100%",
              width: "100%",
              maxWidth: 420,
              transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                padding: "24px 28px 20px",
                borderBottom: "1px solid var(--border)",
                position: "sticky",
                top: 0,
                background: "var(--surface)",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                      marginBottom: 4,
                    }}
                  >
                    Specifications
                  </p>
                  <h3
                    className="font-display"
                    style={{ fontSize: 26, color: "var(--text)", margin: 0 }}
                  >
                    {selection.year} {selection.make} {selection.model}
                  </h3>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--surface2)",
                    border: "1px solid var(--border-hi)",
                    color: "var(--muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 28,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 12,
                  }}
                >
                  Vehicle Types
                </p>
                {detailsLoading ? (
                  <p style={{ fontSize: 13, color: "var(--muted)" }}>
                    Loading…
                  </p>
                ) : vehicleDetails.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--muted)" }}>
                    No types available
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      maxHeight: 140,
                      overflowY: "auto",
                    }}
                  >
                    {vehicleDetails.map((t, i) => (
                      <div key={i} className="spec-pill">
                        <strong>
                          {t.VehicleTypeName ||
                            t.VehicleType ||
                            JSON.stringify(t)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="divider" style={{ margin: 0 }} />
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 12,
                  }}
                >
                  Engine Specs
                </p>
                {specsLoading ? (
                  <p style={{ fontSize: 13, color: "var(--muted)" }}>
                    Loading…
                  </p>
                ) : vehicleSpecs.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--muted)" }}>
                    {specsError || "No specs available"}
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      maxHeight: 180,
                      overflowY: "auto",
                    }}
                  >
                    {vehicleSpecs.slice(0, 3).map((s, i) => (
                      <div key={i} className="spec-pill">
                        <strong>{s.model_name || s.model_trim}</strong>
                        <br />
                        Fuel: <strong>{s.model_engine_fuel || "—"}</strong> ·
                        Engine:{" "}
                        {s.model_engine_type || s.model_engine_cc || "—"}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="divider" style={{ margin: 0 }} />
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <Fuel
                    style={{ width: 14, height: 14, color: "var(--accent)" }}
                  />
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      margin: 0,
                    }}
                  >
                    Fuel Parameters
                  </p>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div>
                    <label className="form-label">Tank Capacity (liters)</label>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      step="5"
                      value={fuelData.tankCapacity}
                      onChange={(e) =>
                        setFuelData({
                          ...fuelData,
                          tankCapacity: +e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Highway Efficiency (km/L)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="25"
                      step="0.5"
                      value={fuelData.consumption}
                      onChange={(e) =>
                        setFuelData({
                          ...fuelData,
                          consumption: +e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <label className="form-label" style={{ margin: 0 }}>
                        Current Fuel Level
                      </label>
                      <span
                        className="font-mono"
                        style={{ fontSize: 13, color: "var(--text)" }}
                      >
                        {fuelData.currentFuel}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={fuelData.currentFuel}
                      onChange={(e) =>
                        setFuelData({
                          ...fuelData,
                          currentFuel: +e.target.value,
                        })
                      }
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 6,
                      }}
                    >
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>
                        Empty
                      </span>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>
                        Full
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              style={{
                padding: "20px 28px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {tripAnalysis && <SuitabilityBadge analysis={tripAnalysis} />}
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border-hi)",
                  color: "var(--text)",
                  borderRadius: 10,
                  padding: 12,
                  width: "100%",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "DM Sans",
                }}
              >
                Close Panel
              </button>
            </div>
          </aside>
        </div>

        {!isJourneyActive && <Features />}

        {/* ── CAMERA FAB ───────────────────────────────────────────── */}
        <button
          className="cam-fab"
          onClick={() => setCameraOpen(true)}
          aria-label="Upload vehicle photo"
        >
          <Camera style={{ width: 22, height: 22 }} />
          <span className="cam-fab-tip">Upload Photo</span>
        </button>

        {/* ── CAMERA MODAL ─────────────────────────────────────────── */}
        {cameraOpen && (
          <div
            className="cam-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeCamera();
            }}
          >
            <div className="cam-modal">
              <div className="cam-header">
                <div>
                  <div className="cam-title">Upload Photo</div>
                  <div className="cam-sub">
                    Snap or upload a vehicle photo for identification
                  </div>
                </div>
                <button className="cam-close" onClick={closeCamera}>
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>

              <div className="cam-body">
                {/* Steps */}
                <div className="cam-steps">
                  {(
                    [
                      [
                        "01",
                        <>
                          <strong>Position the vehicle</strong> — ensure good
                          lighting and a clear angle
                        </>,
                      ],
                      [
                        "02",
                        <>
                          <strong>Take or choose</strong> a photo from your
                          device
                        </>,
                      ],
                      [
                        "03",
                        <>
                          <strong>Submit</strong> to identify make, model, or
                          damage
                        </>,
                      ],
                    ] as [string, React.ReactNode][]
                  ).map(([n, t]) => (
                    <div key={n} className="cam-step">
                      <div className="cam-step-num">{n}</div>
                      <div className="cam-step-text">{t}</div>
                    </div>
                  ))}
                </div>

                {uploadedImage ? (
                  <div className="cam-preview">
                    <img src={uploadedImage} alt="Preview" />
                    <div className="cam-preview-bar">
                      <span className="cam-fname">{uploadedFileName}</span>
                      <button
                        className="cam-clear"
                        onClick={() => {
                          setUploadedImage(null);
                          setUploadedFileName("");
                        }}
                        title="Remove"
                      >
                        <X style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={`cam-dropzone${dragOver ? " drag-on" : ""}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                    >
                      <div className="cam-dz-icon">
                        <ImagePlus
                          style={{
                            width: 22,
                            height: 22,
                            color: "var(--accent)",
                          }}
                        />
                      </div>
                      <div className="cam-dz-title">
                        Drop image here or click to browse
                      </div>
                      <div className="cam-dz-hint">
                        Supports JPG, PNG, WEBP · Max 20MB
                      </div>
                    </div>
                    <div className="cam-or">or</div>
                    <button
                      className="cam-capture"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera
                        style={{
                          width: 17,
                          height: 17,
                          color: "var(--accent)",
                        }}
                      />
                      Take a Photo with Camera
                    </button>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] ?? null)
                  }
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] ?? null)
                  }
                />

                {analysisError && (
                  <div
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 12,
                      padding: "12px 16px",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      color: "var(--red)",
                      fontSize: 13,
                    }}
                  >
                    <AlertCircle
                      style={{ width: 18, height: 18, flexShrink: 0 }}
                    />
                    <p style={{ margin: 0 }}>{analysisError}</p>
                  </div>
                )}

                {analysisSuccess && (
                  <div
                    style={{
                      background: "rgba(34,201,122,0.1)",
                      border: "1px solid rgba(34,201,122,0.2)",
                      borderRadius: 12,
                      padding: "12px 16px",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      color: "var(--green)",
                      fontSize: 13,
                    }}
                  >
                    <CheckCircle
                      style={{ width: 18, height: 18, flexShrink: 0 }}
                    />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        Vehicle Identified!
                      </p>
                      <p style={{ margin: 0, opacity: 0.8 }}>
                        {selection.year} {selection.make} {selection.model}{" "}
                        detected.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  className="cam-submit"
                  disabled={!uploadedImage || isAnalyzing || analysisSuccess}
                  onClick={handleSubmitPhoto}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    opacity: analysisSuccess ? 0.7 : 1,
                  }}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2
                        className="animate-spin"
                        style={{ width: 18, height: 18 }}
                      />
                      <span>Analyzing via Intelligence API...</span>
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          height: 2,
                          background: "white",
                          animation: "analysisProgress 3s ease-in-out infinite",
                        }}
                      />
                    </>
                  ) : analysisSuccess ? (
                    <>
                      <Zap style={{ width: 18, height: 18 }} />
                      <span>Syncing Specs...</span>
                    </>
                  ) : (
                    <>
                      <Scan style={{ width: 18, height: 18 }} />
                      <span>
                        {uploadedImage ? "Analyze Vehicle" : "Select Photo"}
                      </span>
                    </>
                  )}
                </button>

                <style>{`
                  @keyframes analysisProgress {
                    0% { width: 0%; left: 0% }
                    50% { width: 40%; left: 30% }
                    100% { width: 0%; left: 100% }
                  }
                  .animate-spin {
                    animation: spin 1s linear infinite;
                  }
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
