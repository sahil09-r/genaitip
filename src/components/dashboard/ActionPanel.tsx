import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Octagon, AlertTriangle, CircleCheck, VideoOff } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";

interface ActionState {
  light: "red" | "yellow" | "green";
  message: string;
  detail: string;
  countdown: number;
  density: "Low" | "Medium" | "High";
}

const lightConfig = {
  red: { icon: Octagon, bg: "bg-traffic-red/15", border: "border-traffic-red/40", text: "text-traffic-red", glow: "shadow-[0_0_30px_hsl(var(--traffic-red)/0.3)]" },
  yellow: { icon: AlertTriangle, bg: "bg-traffic-yellow/15", border: "border-traffic-yellow/40", text: "text-traffic-yellow", glow: "shadow-[0_0_30px_hsl(var(--traffic-yellow)/0.3)]" },
  green: { icon: CircleCheck, bg: "bg-traffic-green/15", border: "border-traffic-green/40", text: "text-traffic-green", glow: "shadow-[0_0_30px_hsl(var(--traffic-green)/0.3)]" },
};

const ActionPanel = () => {
  const { cameraActive, routeData, detectionResult } = useDashboard();
  const isActive = cameraActive || !!routeData;

  // Use real detection when camera is active and we have results
  const useRealDetection = cameraActive && detectionResult && detectionResult.lightState;

  const [current, setCurrent] = useState(0);
  const [countdown, setCountdown] = useState(0);

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

  // Build current action from real detection or simulation
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
