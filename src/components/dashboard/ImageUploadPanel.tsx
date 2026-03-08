import { useState, useRef, useCallback } from "react";
import { Upload, Scan, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";
import type { Detection } from "@/contexts/DashboardContext";

const DETECT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-frame`;

const ImageUploadPanel = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    routeData,
    setDetectionResult,
    detectionResult,
    addNotification,
  } = useDashboard();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
      setDetectionResult(null);
    };
    reader.readAsDataURL(file);
  };

  const detectImage = useCallback(async () => {
    if (!uploadedImage) return;
    setDetecting(true);
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
        body: JSON.stringify({ image: uploadedImage, routeContext }),
      });

      if (!resp.ok) {
        console.error("Detection error:", resp.status);
        addNotification({ text: "Detection failed. Please try again.", type: "warning" });
        return;
      }

      const result = await resp.json();
      setDetectionResult(result);

      addNotification({
        text: `Image analyzed: ${result.detections?.length || 0} object(s) detected — ${result.density} density`,
        type: "info",
      });
    } catch (err) {
      console.error("Detection fetch error:", err);
      addNotification({ text: "Detection request failed.", type: "warning" });
    } finally {
      setDetecting(false);
    }
  }, [uploadedImage, routeData, setDetectionResult, addNotification]);

  const drawOverlay = useCallback(() => {
    if (!overlayRef.current || !imgRef.current || !detectionResult?.detections?.length) return;
    const overlay = overlayRef.current;
    const img = imgRef.current;

    overlay.width = img.clientWidth;
    overlay.height = img.clientHeight;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    detectionResult.detections.forEach((det: Detection) => {
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
  }, [detectionResult]);

  const clearImage = () => {
    setUploadedImage(null);
    setDetectionResult(null);
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
            JPG, PNG, WEBP supported
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
              onLoad={drawOverlay}
            />
            <canvas
              ref={overlayRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </div>

          <Button
            onClick={detectImage}
            disabled={detecting}
            className="w-full h-9 text-xs gap-2"
          >
            {detecting ? (
              <>
                <Scan className="w-3.5 h-3.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Scan className="w-3.5 h-3.5" />
                Run Detection
              </>
            )}
          </Button>

          {detectionResult && (
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Detections</span>
                <span className="text-primary font-bold">{detectionResult.detections.length}</span>
              </div>
              {detectionResult.lightState && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Signal</span>
                  <span className={`font-bold ${
                    detectionResult.lightState === "red" ? "text-traffic-red" :
                    detectionResult.lightState === "yellow" ? "text-traffic-yellow" :
                    "text-traffic-green"
                  }`}>
                    {detectionResult.lightState.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Density</span>
                <span className="text-foreground">{detectionResult.density}</span>
              </div>
              {detectionResult.action && (
                <div className="pt-1 border-t border-border">
                  <span className="text-muted-foreground">Action: </span>
                  <span className="text-foreground">{detectionResult.action}</span>
                </div>
              )}
              {detectionResult.detections.length > 0 && (
                <div className="pt-1 border-t border-border space-y-1">
                  {detectionResult.detections.map((det, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-foreground">{det.label}</span>
                      <span className="text-primary">{Math.round(det.confidence * 100)}%</span>
                    </div>
                  ))}
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
