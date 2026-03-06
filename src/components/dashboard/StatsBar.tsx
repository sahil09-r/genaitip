import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, Gauge, Shield, Wifi } from "lucide-react";

const StatsBar = () => {
  const [precision, setPrecision] = useState(96.2);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrecision(95.8 + Math.random() * 1.0);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { icon: Eye, label: "Detection", value: `${precision.toFixed(1)}%`, sub: "mAP Score" },
    { icon: Gauge, label: "Processing", value: "30 fps", sub: "Real-time" },
    { icon: Wifi, label: "Latency", value: "18ms", sub: "Edge Device" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-panel p-4 glow-cyan"
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <div className="text-xl font-bold font-mono text-foreground">{stat.value}</div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{stat.sub}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsBar;
