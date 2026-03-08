import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Octagon, AlertTriangle, CircleCheck, VideoOff, MapPin, Navigation } from "lucide-react";
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
  distance: number; // meters
  lat: number;
  lng: number;
}

const lightConfig = {
  red: { icon: Octagon, bg: "bg-traffic-red/15", border: "border-traffic-red/40", text: "text-traffic-red", glow: "shadow-[0_0_30px_hsl(var(--traffic-red)/0.3)]" },
  yellow: { icon: AlertTriangle, bg: "bg-traffic-yellow/15", border: "border-traffic-yellow/40", text: "text-traffic-yellow", glow: "shadow-[0_0_30px_hsl(var(--traffic-yellow)/0.3)]" },
  green: { icon: CircleCheck, bg: "bg-traffic-green/15", border: "border-traffic-green/40", text: "text-traffic-green", glow: "shadow-[0_0_30px_hsl(var(--traffic-green)/0.3)]" },
};

const GOOGLE_MAPS_API_KEY = "AIzaSyAZcUF_UZcDJvBV_pE5DfgdaK5x38al32o";

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

const ActionPanel = () => {
  const { cameraActive, routeData, detectionResult } = useDashboard();
  const isActive = cameraActive || !!routeData;
  const useRealDetection = cameraActive && detectionResult && detectionResult.lightState;

  const [current, setCurrent] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [nearestSignal, setNearestSignal] = useState<NearestSignal | null>(null);
  const [signalLoading, setSignalLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const searchDoneRef = useRef(false);

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Find nearest traffic signal using Google Maps Places API
  useEffect(() => {
    if (!userCoords || searchDoneRef.current) return;
    if (!window.google?.maps?.places) return;

    setSignalLoading(true);
    searchDoneRef.current = true;

    // Create a temporary invisible map for PlacesService
    const tempDiv = document.createElement("div");
    const tempMap = new google.maps.Map(tempDiv, {
      center: { lat: userCoords.lat, lng: userCoords.lng },
      zoom: 15,
    });

    const service = new google.maps.places.PlacesService(tempMap);
    service.nearbySearch(
      {
        location: { lat: userCoords.lat, lng: userCoords.lng },
        radius: 2000,
        keyword: "traffic signal traffic light",
      },
      (results, status) => {
        setSignalLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          // Find closest
          let closest: NearestSignal | null = null;
          let minDist = Infinity;
          for (const place of results) {
            const plat = place.geometry?.location?.lat();
            const plng = place.geometry?.location?.lng();
            if (plat == null || plng == null) continue;
            const dist = haversineDistance(userCoords.lat, userCoords.lng, plat, plng);
            if (dist < minDist) {
              minDist = dist;
              closest = { name: place.name || "Traffic Signal", distance: dist, lat: plat, lng: plng };
            }
          }
          setNearestSignal(closest);
        }
      }
    );
  }, [userCoords]);

  // Re-search when user moves significantly (>500m)
  useEffect(() => {
    if (!nearestSignal || !userCoords) return;
    const dist = haversineDistance(userCoords.lat, userCoords.lng, nearestSignal.lat, nearestSignal.lng);
    // Update distance in real-time
    setNearestSignal((prev) => prev ? { ...prev, distance: dist } : null);
    // If user moved far, re-search
    if (dist > 2000) {
      searchDoneRef.current = false;
    }
  }, [userCoords]);

  // Simulated actions fallback
  const simActions: ActionState[] = routeData
    ? [
        { light: "red", message: "STOP", detail: `${routeData.signalCount} signals on route — Next signal ahead`, countdown: 18, density: routeData.signalCount > 10 ? "High" : routeData.signalCount > 5 ? "Medium" : "Low" },
        { light: "yellow", message: "PREPARE TO STOP", detail: `${routeData.signalCount - Math.floor(routeData.signalCount / 3)} signals remaining`, countdown: 4, density: "Medium" },
        { light: "green", message: "PROCEED", detail: `Clear stretch ahead • ETA ${routeData.duration}`, countdown: 0, density: "Low" },
      ]
    : [
        { light: "red", message: "STOP", detail: "Signal detected — Hold position", countdown: 18, density: "High" },
        { light: "yellow", message: "PREPARE TO STOP", detail: "Signal changing soon", countdown: 4, density: "Medium" },
        { light: "green", message: "PROCEED", detail: "Clear road ahead", countdown: 0, density: "Low" },
      ];

  useEffect(() => {
    if (!isActive || useRealDetection) return;
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % simActions.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isActive, simActions.length, useRealDetection]);

  useEffect(() => {
    if (!isActive || useRealDetection) return;
    setCountdown(simActions[current]?.countdown ?? 0);
    if ((simActions[current]?.countdown ?? 0) <= 0) return;
    const interval = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [current, isActive, useRealDetection]);

  if (!isActive) {
    return (
      <div className="glass-panel p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-foreground">⚡ Current Signal</span>
        </div>

        {/* Nearest signal info even when inactive */}
        {nearestSignal && (
          <div className="mb-3 bg-secondary/50 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-primary">
              <MapPin className="w-3 h-3" />
              <span>Nearest Signal</span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{nearestSignal.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <Navigation className="w-3 h-3" />
              <span>{formatDistance(nearestSignal.distance)} away</span>
            </div>
          </div>
        )}
        {signalLoading && (
          <div className="mb-3 text-xs text-muted-foreground font-mono animate-pulse">
            Locating nearest signal...
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <VideoOff className="w-10 h-10" />
          <p className="text-sm text-center">
            Start the camera or enter a route to see live signal status
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

  const action: ActionState = useRealDetection
    ? {
        light: detectionResult.lightState as "red" | "yellow" | "green",
        message: detectionResult.action || "SCANNING",
        detail: detectionResult.detections.length > 0
          ? `Detected: ${detectionResult.detections.map((d) => d.label).join(", ")}`
          : "Analyzing traffic...",
        countdown: detectionResult.countdown || 0,
        density: detectionResult.density || "Low",
      }
    : simActions[current];

  const config = lightConfig[action.light];
  const Icon = config.icon;
  const animKey = useRealDetection
    ? `real-${action.light}-${action.message}`
    : `sim-${current}`;

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-foreground">⚡ Current Signal</span>
        <span className="ml-auto text-[10px] font-mono text-primary flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-traffic-green animate-pulse" />
          {useRealDetection ? "AI DETECTION" : cameraActive ? "CAMERA" : "ROUTE"}
        </span>
      </div>

      {/* Nearest signal info */}
      {nearestSignal && (
        <div className="mb-3 bg-secondary/50 rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">{nearestSignal.name}</span>
          </div>
          <span className="text-xs font-mono text-primary font-bold shrink-0 ml-2">
            {formatDistance(nearestSignal.distance)}
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={animKey}
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
              {useRealDetection ? action.countdown : countdown}s
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
