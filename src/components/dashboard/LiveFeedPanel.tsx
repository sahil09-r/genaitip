import { useState, useEffect } from "react";
import { Camera, Zap } from "lucide-react";
import dashcamFeed from "@/assets/dashcam-feed.jpg";

interface Detection {
  id: number;
  label: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: "red" | "yellow" | "green" | "cyan";
}

const mockDetections: Detection[] = [
  { id: 1, label: "Traffic Light (GREEN)", confidence: 97.1, x: 48, y: 22, w: 6, h: 14, color: "green" },
  { id: 2, label: "Speed Limit 60", confidence: 94.8, x: 15, y: 30, w: 8, h: 12, color: "cyan" },
  { id: 3, label: "Traffic Light (RED)", confidence: 96.5, x: 78, y: 18, w: 5, h: 13, color: "red" },
];

const colorMap = {
  red: "border-traffic-red text-traffic-red",
  yellow: "border-traffic-yellow text-traffic-yellow",
  green: "border-traffic-green text-traffic-green",
  cyan: "border-primary text-primary",
};

const LiveFeedPanel = () => {
  const [fps, setFps] = useState(30);
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(28 + Math.floor(Math.random() * 5));
      setFrameCount((c) => c + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Live Camera Feed</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-primary pulse-glow flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-traffic-green animate-pulse" />
            LIVE
          </span>
          <span className="text-muted-foreground">{fps} FPS</span>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden flex-1 min-h-[280px]">
        <img src={dashcamFeed} alt="Dashcam feed" className="w-full h-full object-cover" />
        
        {/* Scan line effect */}
        <div className="absolute inset-0 scan-line pointer-events-none" />

        {/* Detection boxes */}
        {mockDetections.map((det) => (
          <div
            key={det.id}
            className={`absolute border-2 ${colorMap[det.color]} rounded-sm`}
            style={{
              left: `${det.x}%`,
              top: `${det.y}%`,
              width: `${det.w}%`,
              height: `${det.h}%`,
            }}
          >
            <span className="absolute -top-5 left-0 text-[10px] font-mono whitespace-nowrap bg-background/80 px-1 rounded">
              {det.label} {det.confidence}%
            </span>
          </div>
        ))}

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3">
          <div className="flex justify-between items-center font-mono text-xs text-muted-foreground">
            <span>YOLOv8 Enhanced • GenAI Pipeline</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary" />
              {mockDetections.length} detections
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveFeedPanel;
