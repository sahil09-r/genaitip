import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Octagon, AlertTriangle, CircleCheck } from "lucide-react";

interface ActionState {
  light: "red" | "yellow" | "green";
  message: string;
  detail: string;
  countdown: number;
  density: "Low" | "Medium" | "High";
}

const actions: ActionState[] = [
  { light: "red", message: "STOP", detail: "High density ahead — Hold position", countdown: 18, density: "High" },
  { light: "yellow", message: "PREPARE TO STOP", detail: "2 signals remaining on route", countdown: 4, density: "Medium" },
  { light: "green", message: "PROCEED", detail: "Low density, clear route ahead", countdown: 0, density: "Low" },
];

const lightConfig = {
  red: { icon: Octagon, bg: "bg-traffic-red/15", border: "border-traffic-red/40", text: "text-traffic-red", glow: "shadow-[0_0_30px_hsl(var(--traffic-red)/0.3)]" },
  yellow: { icon: AlertTriangle, bg: "bg-traffic-yellow/15", border: "border-traffic-yellow/40", text: "text-traffic-yellow", glow: "shadow-[0_0_30px_hsl(var(--traffic-yellow)/0.3)]" },
  green: { icon: CircleCheck, bg: "bg-traffic-green/15", border: "border-traffic-green/40", text: "text-traffic-green", glow: "shadow-[0_0_30px_hsl(var(--traffic-green)/0.3)]" },
};

const ActionPanel = () => {
  const [current, setCurrent] = useState(0);
  const [countdown, setCountdown] = useState(actions[0].countdown);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % actions.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCountdown(actions[current].countdown);
    if (actions[current].countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [current]);

  const action = actions[current];
  const config = lightConfig[action.light];
  const Icon = config.icon;

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-foreground">⚡ Current Action</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
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
          {countdown > 0 && (
            <span className={`text-5xl font-mono font-bold ${config.text} glow-text-cyan`}>
              {countdown}s
            </span>
          )}
          <p className="text-sm text-muted-foreground text-center">{action.detail}</p>

          {/* Density badge */}
          <div className={`px-3 py-1 rounded-full border text-xs font-mono ${
            action.density === "High" ? "border-traffic-red/40 text-traffic-red" :
            action.density === "Medium" ? "border-traffic-yellow/40 text-traffic-yellow" :
            "border-traffic-green/40 text-traffic-green"
          }`}>
            Density: {action.density}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Traffic light indicator */}
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
