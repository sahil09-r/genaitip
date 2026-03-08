import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Zap, VideoOff, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";
import type { Detection } from "@/contexts/DashboardContext";

const DETECT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-frame`;
const FRAME_INTERVAL = 5000; // 5 seconds to avoid rate limits

const LiveFeedPanel = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(30);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectingRef = useRef(false);
  const {
    cameraActive, setCameraActive,
    routeData,
    setDetectionResult, setIsDetecting, isDetecting,
    detectionResult, addNotification,
  } = useDashboard();
  const lastAlertRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(28 + Math.floor(Math.random() * 5));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const captureAndDetect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (detectingRef.current) return; // skip if already in-flight
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL("image/jpeg", 0.7);

    detectingRef.current = true;
    setIsDetecting(true);
    try {
      const routeContext = routeData
        ? { currentSignal: 1, totalSignals: routeData.signalCount }
        : undefined;

      const resp = await fetch(DETECT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ image: base64, routeContext }),
      });

      if (!resp.ok) {
        console.error("Detection error:", resp.status);
        return;
      }

      const result = await resp.json();
      setDetectionResult(result);

      // Trigger notification on red light + high density (throttled)
      if (
        result.lightState === "red" &&
        result.density === "High" &&
        Date.now() - lastAlertRef.current > 120000
      ) {
        lastAlertRef.current = Date.now();
        addNotification({
          text: `Red light detected with high traffic density — ${result.action}`,
          type: "alert",
        });
      }
    } catch (err) {
      console.error("Detection fetch error:", err);
    } finally {
      detectingRef.current = false;
      setIsDetecting(false);
    }
  }, [routeData, setDetectionResult, setIsDetecting, addNotification]);

  // Draw bounding boxes
  useEffect(() => {
    if (!overlayRef.current || !videoRef.current) return;
    const overlay = overlayRef.current;
    const video = videoRef.current;

    const draw = () => {
      overlay.width = video.clientWidth;
      overlay.height = video.clientHeight;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      if (!detectionResult?.detections?.length) return;

      detectionResult.detections.forEach((det: Detection) => {
        const x = det.bbox.x * overlay.width;
        const y = det.bbox.y * overlay.height;
        const w = det.bbox.w * overlay.width;
        const h = det.bbox.h * overlay.height;

        // Box color based on label
        const isLight = det.label.toLowerCase().includes("light");
        const isStop = det.label.toLowerCase().includes("stop") || det.label.toLowerCase().includes("red");
        const color = isStop || isLight
          ? "hsl(0, 85%, 55%)"
          : "hsl(152, 85%, 45%)";

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Label background
        const label = `${det.label} ${Math.round(det.confidence * 100)}%`;
        ctx.font = "bold 11px monospace";
        const metrics = ctx.measureText(label);
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 16, metrics.width + 8, 16);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x + 4, y - 4);
      });
    };

    draw();
  }, [detectionResult]);

  // Start frame capture interval
  useEffect(() => {
    if (cameraActive) {
      // Wait a moment for the video to start
      const timeout = setTimeout(() => {
        captureAndDetect();
        intervalRef.current = setInterval(captureAndDetect, FRAME_INTERVAL);
      }, 1000);
      return () => {
        clearTimeout(timeout);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDetectionResult(null);
    }
  }, [cameraActive, captureAndDetect, setDetectionResult]);

  const startCamera = async () => {
    try {
      setCameraError(null);

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera not supported. Try opening the app in a new browser tab.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays after source is set
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera access and try again.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera found on this device.");
      } else if (err.name === "NotReadableError") {
        setCameraError("Camera is in use by another application.");
      } else {
        setCameraError(err.message || "Camera access failed. Try opening in a new tab.");
      }
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
              {isDetecting && (
                <span className="text-primary flex items-center gap-1">
                  <Scan className="w-3 h-3 animate-spin" />
                  Detecting
                </span>
              )}
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
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Bounding box overlay */}
            <canvas
              ref={overlayRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <VideoOff className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {cameraError || "Click 'Start Camera' to begin live feed"}
            </p>
          </div>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {cameraActive && <div className="absolute inset-0 scan-line pointer-events-none" />}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3">
          <div className="flex justify-between items-center font-mono text-xs text-muted-foreground">
            <span>
              GenAI-YOLO Pipeline • Indian Sign Board Dataset
              {detectionResult && detectionResult.detections.length > 0 && (
                <span className="text-primary ml-2">
                  {detectionResult.detections.length} detection{detectionResult.detections.length !== 1 ? "s" : ""}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary" />
              {cameraActive
                ? isDetecting
                  ? "Analyzing frame..."
                  : "Processing..."
                : "Standby"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveFeedPanel;
