import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

const DensityPanel = () => {
  const [density, setDensity] = useState(62);

  useEffect(() => {
    const interval = setInterval(() => {
      setDensity((d) => Math.max(10, Math.min(95, d + (Math.random() - 0.5) * 10)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const level = density < 35 ? "Low" : density < 70 ? "Medium" : "High";
  const color = density < 35 ? "text-traffic-green" : density < 70 ? "text-traffic-yellow" : "text-traffic-red";
  const barColor = density < 35 ? "bg-traffic-green" : density < 70 ? "bg-traffic-yellow" : "bg-traffic-red";

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Crowd Density</span>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <div className={`text-3xl font-bold font-mono ${color}`}>{level}</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">
            CNN-LSTM • {Math.round(density)}% congestion
          </div>
          <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${barColor}`}
              animate={{ width: `${density}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Mini bars */}
        <div className="flex items-end gap-1 h-12">
          {Array.from({ length: 8 }).map((_, i) => {
            const h = 20 + Math.random() * 80;
            return (
              <motion.div
                key={i}
                className={`w-1.5 rounded-full ${barColor}/60`}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DensityPanel;
