import { useState, useEffect, useRef } from "react";
import { Camera, Zap, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const LiveFeedPanel = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fps, setFps] = useState(30);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(28 + Math.floor(Math.random() * 5));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(err.message || "Camera access denied");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Live Camera Feed</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          {cameraActive && (
            <>
              <span className="text-primary pulse-glow flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-traffic-green animate-pulse" />
                LIVE
              </span>
              <span className="text-muted-foreground">{fps} FPS</span>
            </>
          )}
          <Button
            size="sm"
            variant={cameraActive ? "destructive" : "default"}
            onClick={cameraActive ? stopCamera : startCamera}
            className="h-7 text-xs"
          >
            {cameraActive ? "Stop" : "Start Camera"}
          </Button>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden flex-1 min-h-[280px] bg-secondary">
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <VideoOff className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {cameraError || "Click 'Start Camera' to begin live feed"}
            </p>
          </div>
        )}

        {/* Scan line effect */}
        {cameraActive && <div className="absolute inset-0 scan-line pointer-events-none" />}

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3">
          <div className="flex justify-between items-center font-mono text-xs text-muted-foreground">
            <span>YOLOv8 Enhanced • GenAI Pipeline</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary" />
              {cameraActive ? "Processing..." : "Standby"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveFeedPanel;
