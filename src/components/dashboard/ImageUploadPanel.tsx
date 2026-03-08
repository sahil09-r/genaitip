import { useState, useRef, useCallback } from "react";
import { Upload, Scan, X, ImageIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";
import type { DetectionResult, Detection } from "@/contexts/DashboardContext";

const DETECT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-frame`;

const ImageUploadPanel = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [localResult, setLocalResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification, setDetectionResult, setIsDetecting } = useDashboard();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
      setLocalResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const drawOverlay = useCallback((result: DetectionResult | null) => {
    if (!overlayRef.current || !imgRef.current) return;
    const overlay = overlayRef.current;
    const img = imgRef.current;

    overlay.width = img.clientWidth;
    overlay.height = img.clientHeight;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (!result?.detections?.length) return;

    result.detections.forEach((det: Detection) => {
      const x = det.bbox.x * overlay.width;
      const y = det.bbox.y * overlay.height;
      const w = det.bbox.w * overlay.width;
      const h = det.bbox.h * overlay.height;

      const isLight = det.label.toLowerCase().includes("light");
      const isStop = det.label.toLowerCase().includes("stop") || det.label.toLowerCase().includes("red");
      const color = isStop || isLight ? "hsl(0, 85%, 55%)" : "hsl(152, 85%, 45%)";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      const label = `${det.label} ${Math.round(det.confidence * 100)}%`;
      ctx.font = "bold 11px monospace";
      const metrics = ctx.measureText(label);
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 16, metrics.width + 8, 16);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 4, y - 4);
    });
  }, []);

  const detectImage = useCallback(async () => {
    if (!uploadedImage) return;
    setDetecting(true);
    setError(null);
    try {
      const resp = await fetch(DETECT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ image: uploadedImage }),
      });

      if (resp.status === 429) {
        setError("Rate limited. Please wait a moment and try again.");
        return;
      }
      if (resp.status === 402) {
        setError("AI credits exhausted.");
        return;
      }
      if (!resp.ok) {
        setError("Detection failed. Please try again.");
        return;
      }

      const result: DetectionResult = await resp.json();
      setLocalResult(result);

      // Draw bounding boxes
      setTimeout(() => drawOverlay(result), 100);

      // Build summary notification
      const parts: string[] = [];
      if (result.detections.length > 0) {
        parts.push(`${result.detections.length} object(s) detected`);
      }
      if (result.lightState) {
        parts.push(`Signal: ${result.lightState.toUpperCase()}`);
      }
      parts.push(`Density: ${result.density}`);

      addNotification({
        text: `Image analysis: ${parts.join(" • ")}`,
        type: result.lightState === "red" ? "alert" : "info",
      });
    } catch (err) {
      console.error("Detection fetch error:", err);
      setError("Network error. Check your connection.");
    } finally {
      setDetecting(false);
    }
  }, [uploadedImage, addNotification, drawOverlay]);

  const clearImage = () => {
    setUploadedImage(null);
    setLocalResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="glass-panel p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Image Detection</span>
        </div>
        {uploadedImage && (
          <Button size="sm" variant="ghost" onClick={clearImage} className="h-7 text-xs gap-1">
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>

      {!uploadedImage ? (
        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors">
          <Upload className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Drop an image here or click to upload
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            JPG, PNG, WEBP • Traffic scenes, signals, road signs
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden bg-secondary">
            <img
              ref={imgRef}
              src={uploadedImage}
              alt="Uploaded for detection"
              className="w-full max-h-[300px] object-contain"
              onLoad={() => drawOverlay(localResult)}
            />
            <canvas
              ref={overlayRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <Button
            onClick={detectImage}
            disabled={detecting}
            className="w-full h-9 text-xs gap-2"
          >
            {detecting ? (
              <>
                <Scan className="w-3.5 h-3.5 animate-spin" />
                Analyzing with AI...
              </>
            ) : localResult ? (
              <>
                <Scan className="w-3.5 h-3.5" />
                Re-analyze
              </>
            ) : (
              <>
                <Scan className="w-3.5 h-3.5" />
                Run AI Detection
              </>
            )}
          </Button>

          {localResult && (
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2 font-mono text-xs">
              {/* Signal state */}
              {localResult.lightState ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Traffic Signal</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    localResult.lightState === "red"
                      ? "bg-traffic-red/20 text-traffic-red"
                      : localResult.lightState === "yellow"
                      ? "bg-traffic-yellow/20 text-traffic-yellow"
                      : "bg-traffic-green/20 text-traffic-green"
                  }`}>
                    {localResult.lightState.toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Traffic Signal</span>
                  <span className="text-muted-foreground/70">Not detected</span>
                </div>
              )}

              {/* Density */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Traffic Density</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  localResult.density === "High"
                    ? "bg-traffic-red/20 text-traffic-red"
                    : localResult.density === "Medium"
                    ? "bg-traffic-yellow/20 text-traffic-yellow"
                    : "bg-traffic-green/20 text-traffic-green"
                }`}>
                  {localResult.density}
                </span>
              </div>

              {/* Action */}
              {localResult.action && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recommended</span>
                  <span className="text-primary font-bold">{localResult.action}</span>
                </div>
              )}

              {/* Detections list */}
              {localResult.detections.length > 0 ? (
                <div className="pt-2 border-t border-border space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Detected Objects ({localResult.detections.length})
                  </span>
                  {localResult.detections.map((det, i) => (
                    <div key={i} className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                      <span className="text-foreground">{det.label}</span>
                      <span className="text-primary font-bold">{Math.round(det.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground/70">
                    No specific signs or signals detected — density analysis based on vehicle/pedestrian count
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploadPanel;
