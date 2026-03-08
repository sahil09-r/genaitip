import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Octagon, AlertTriangle, CircleCheck, VideoOff, MapPin, Navigation, Loader2 } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";

interface ActionState {
  light: "red" | "yellow" | "green";
  message: string;
  detail: string;
  countdown: number;
  density: "Low" | "Medium" | "High";
}

interface NearestSignal {
  name: string;
  distance: number;
  lat: number;
  lng: number;
}

const lightConfig = {
  red: { icon: Octagon, bg: "bg-traffic-red/15", border: "border-traffic-red/40", text: "text-traffic-red", glow: "shadow-[0_0_30px_hsl(var(--traffic-red)/0.3)]" },
  yellow: { icon: AlertTriangle, bg: "bg-traffic-yellow/15", border: "border-traffic-yellow/40", text: "text-traffic-yellow", glow: "shadow-[0_0_30px_hsl(var(--traffic-yellow)/0.3)]" },
  green: { icon: CircleCheck, bg: "bg-traffic-green/15", border: "border-traffic-green/40", text: "text-traffic-green", glow: "shadow-[0_0_30px_hsl(var(--traffic-green)/0.3)]" },
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

async function fetchNearestSignal(lat: number, lng: number): Promise<NearestSignal | null> {
  const radius = 2000;
  const query = `
    [out:json][timeout:10];
    (
      node["highway"="traffic_signals"](around:${radius},${lat},${lng});
    );
    out body;
  `;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = await res.json();
    if (!data.elements || data.elements.length === 0) return null;
    let closest: NearestSignal | null = null;
    let minDist = Infinity;
    for (const el of data.elements) {
      const dist = haversineDistance(lat, lng, el.lat, el.lon);
      if (dist < minDist) {
        minDist = dist;
        const name = el.tags?.name || el.tags?.["crossing:ref"] || `Signal #${el.id}`;
        closest = { name, distance: dist, lat: el.lat, lng: el.lon };
      }
    }
    return closest;
  } catch {
    return null;
  }
}

// Extracted as a standalone component to avoid ref warnings
const SignalBadge = ({ loading, signal }: { loading: boolean; signal: NearestSignal | null }) => {
  if (loading) {
    return (
      <div className="mb-3 bg-secondary/50 rounded-lg p-2.5 flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-mono">Locating nearest signal...</span>
      </div>
    );
  }
  if (!signal) return null;
  return (
    <div className="mb-3 bg-secondary/50 rounded-lg p-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
        <div className="min-w-0">
          <span className="text-[10px] font-mono text-muted-foreground block">Nearest Signal</span>
          <span className="text-xs font-medium text-foreground truncate block">{signal.name}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <Navigation className="w-3 h-3 text-primary" />
        <span className="text-sm font-mono text-primary font-bold">
          {formatDistance(signal.distance)}
        </span>
      </div>
    </div>
  );
};

const ActionPanel = () => {
  const { cameraActive, detectionResult, setDetectionResult } = useDashboard();
  const isActive = cameraActive || !!detectionResult;
  const hasLightState = !!detectionResult && !!detectionResult.lightState;

  const [realCountdown, setRealCountdown] = useState(0);
  const [nearestSignal, setNearestSignal] = useState<NearestSignal | null>(null);
  const [signalLoading, setSignalLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const lastSearchCoords = useRef<{ lat: number; lng: number } | null>(null);
  const detectionRef = useRef(detectionResult);

  // Keep ref in sync to avoid stale closures
  useEffect(() => {
    detectionRef.current = detectionResult;
  }, [detectionResult]);

  // Sync countdown from detection result
  useEffect(() => {
    if (!hasLightState || !detectionResult) return;
    const defaultCountdowns = { red: 30, yellow: 5, green: 45 };
    const cd = detectionResult.countdown > 0
      ? detectionResult.countdown
      : defaultCountdowns[detectionResult.lightState as "red" | "yellow" | "green"] || 30;
    setRealCountdown(cd);
  }, [detectionResult, hasLightState]);

  // Transition signal when countdown hits 0
  const transitionSignal = useCallback(() => {
    const det = detectionRef.current;
    if (!det || !det.lightState) return;
    const currentLight = det.lightState;
    const nextLight = currentLight === "red" ? "green"
      : currentLight === "green" ? "yellow"
      : "red";
    const nextAction = nextLight === "green" ? "PROCEED"
      : nextLight === "yellow" ? "PREPARE TO STOP"
      : "STOP";
    const nextCountdown = nextLight === "red" ? 30 : nextLight === "yellow" ? 5 : 45;
    setDetectionResult({
      ...det,
      lightState: nextLight,
      action: nextAction,
      countdown: nextCountdown,
    });
  }, [setDetectionResult]);

  // Tick countdown every second
  useEffect(() => {
    if (!hasLightState || realCountdown <= 0) return;
    const timer = setInterval(() => {
      setRealCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          transitionSignal();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [realCountdown, hasLightState, transitionSignal]);

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch nearest traffic signal via Overpass API
  useEffect(() => {
    if (!userCoords) return;
    if (lastSearchCoords.current) {
      const moved = haversineDistance(
        userCoords.lat, userCoords.lng,
        lastSearchCoords.current.lat, lastSearchCoords.current.lng
      );
      if (moved < 500) {
        if (nearestSignal) {
          const newDist = haversineDistance(userCoords.lat, userCoords.lng, nearestSignal.lat, nearestSignal.lng);
          setNearestSignal((prev) => prev ? { ...prev, distance: newDist } : null);
        }
        return;
      }
    }
    setSignalLoading(true);
    lastSearchCoords.current = { ...userCoords };
    fetchNearestSignal(userCoords.lat, userCoords.lng).then((result) => {
      setNearestSignal(result);
      setSignalLoading(false);
    });
  }, [userCoords]);

  // Inactive state
  if (!isActive) {
    return (
      <div className="glass-panel p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-foreground">⚡ Current Signal</span>
        </div>
        <SignalBadge loading={signalLoading} signal={nearestSignal} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <VideoOff className="w-10 h-10" />
          <p className="text-sm text-center">
            Start the camera or upload an image to see live signal status
          </p>
        </div>
        <div className="flex justify-center gap-3 mt-4">
          {(["red", "yellow", "green"] as const).map((light) => (
            <div key={light} className="w-5 h-5 rounded-full bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  // Build action from real AI detection results only
  const action: ActionState = detectionResult
    ? hasLightState
      ? {
          light: detectionResult.lightState as "red" | "yellow" | "green",
          message: detectionResult.action || "SCANNING",
          detail: detectionResult.detections.length > 0
            ? `Detected: ${detectionResult.detections.map((d) => d.label).join(", ")}`
            : "Analyzing traffic...",
          countdown: realCountdown,
          density: detectionResult.density || "Low",
        }
      : {
          light: (detectionResult.density === "High" ? "red" : detectionResult.density === "Medium" ? "yellow" : "green") as "red" | "yellow" | "green",
          message: detectionResult.action || "ANALYZED",
          detail: detectionResult.detections.length > 0
            ? `Detected: ${detectionResult.detections.map((d) => d.label).join(", ")}`
            : "No signal found — density analysis only",
          countdown: 0,
          density: detectionResult.density || "Low",
        }
    : { light: "green" as const, message: "SCANNING", detail: "Waiting for detection...", countdown: 0, density: "Low" as const };

  const config = lightConfig[action.light];
  const Icon = config.icon;
  const sourceLabel = cameraActive ? "LIVE CAMERA" : "IMAGE UPLOAD";

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-foreground">⚡ Current Signal</span>
        <span className="ml-auto text-[10px] font-mono text-primary flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-traffic-green animate-pulse" />
          {sourceLabel}
        </span>
      </div>

      <SignalBadge loading={signalLoading} signal={nearestSignal} />

      <AnimatePresence mode="wait">
        <motion.div
          key={`${action.light}-${action.message}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={`flex-1 rounded-xl border ${config.border} ${config.bg} ${config.glow} p-6 flex flex-col items-center justify-center gap-4`}
        >
          <Icon className={`w-12 h-12 ${config.text}`} />
          <h2 className={`text-3xl font-bold font-mono tracking-wider ${config.text}`}>
            {action.message}
          </h2>
          {action.countdown > 0 && (
            <span className={`text-5xl font-mono font-bold ${config.text} glow-text-cyan`}>
              {action.countdown}s
            </span>
          )}
          <p className="text-sm text-muted-foreground text-center">{action.detail}</p>

          <div className={`px-3 py-1 rounded-full border text-xs font-mono ${
            action.density === "High" ? "border-traffic-red/40 text-traffic-red" :
            action.density === "Medium" ? "border-traffic-yellow/40 text-traffic-yellow" :
            "border-traffic-green/40 text-traffic-green"
          }`}>
            Density: {action.density}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center gap-3 mt-4">
        {(["red", "yellow", "green"] as const).map((light) => (
          <div
            key={light}
            className={`w-5 h-5 rounded-full transition-all duration-500 ${
              action.light === light
                ? `bg-traffic-${light} ${lightConfig[light].glow}`
                : "bg-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ActionPanel;
