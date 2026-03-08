/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import { Flame, RefreshCw, Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";

const GOOGLE_MAPS_API_KEY = "AIzaSyAZcUF_UZcDJvBV_pE5DfgdaK5x38al32o";

// Simulated traffic hotspots for Delhi NCR region
const generateHeatmapData = (): { lat: number; lng: number; weight: number }[] => {
  const hotspots = [
    // High traffic zones
    { lat: 28.6139, lng: 77.2090, weight: 10 }, // Connaught Place
    { lat: 28.6280, lng: 77.2190, weight: 9 },  // ITO
    { lat: 28.6353, lng: 77.2250, weight: 8 },   // Pragati Maidan
    { lat: 28.5535, lng: 77.2588, weight: 9 },   // Nehru Place
    { lat: 28.5733, lng: 77.2110, weight: 7 },   // AIIMS
    { lat: 28.6508, lng: 77.2346, weight: 8 },   // ISBT Kashmere Gate
    { lat: 28.6420, lng: 77.0880, weight: 9 },   // Rajouri Garden
    { lat: 28.5700, lng: 77.3216, weight: 7 },   // Noida Sector 18
    { lat: 28.4595, lng: 77.0266, weight: 8 },   // Gurugram Cyber Hub
    { lat: 28.6692, lng: 77.4538, weight: 6 },   // Ghaziabad
    // Medium traffic zones
    { lat: 28.5921, lng: 77.2307, weight: 5 },   // Lodhi Road
    { lat: 28.6862, lng: 77.2217, weight: 5 },   // Civil Lines
    { lat: 28.6304, lng: 77.1720, weight: 4 },   // Rajender Nagar
    { lat: 28.5410, lng: 77.1870, weight: 5 },   // Saket
    { lat: 28.6984, lng: 77.1525, weight: 4 },   // Rohini
    // Spread points
    { lat: 28.5950, lng: 77.1700, weight: 3 },
    { lat: 28.6100, lng: 77.2800, weight: 3 },
    { lat: 28.6800, lng: 77.1400, weight: 3 },
    { lat: 28.5200, lng: 77.2100, weight: 4 },
    { lat: 28.6500, lng: 77.3000, weight: 3 },
  ];

  // Add random jitter for realism on each refresh
  return hotspots.map((h) => ({
    lat: h.lat + (Math.random() - 0.5) * 0.005,
    lng: h.lng + (Math.random() - 0.5) * 0.005,
    weight: Math.max(1, h.weight + Math.floor((Math.random() - 0.5) * 3)),
  }));
};

const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1d23" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1d23" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d3748" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e4d6b" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

const TrafficHeatmap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { detectionResult } = useDashboard();

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps?.visualization) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 28.6139, lng: 77.2090 },
      zoom: 11,
      styles: darkMapStyles,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
    });
    mapInstanceRef.current = map;

    // Traffic layer
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    trafficLayerRef.current = trafficLayer;

    // Heatmap layer with simulated data
    updateHeatmap(map);
  }, []);

  const updateHeatmap = (map?: google.maps.Map) => {
    const targetMap = map || mapInstanceRef.current;
    if (!targetMap || !window.google?.maps?.visualization) return;

    // Remove old heatmap
    heatmapLayerRef.current?.setMap(null);

    const data = generateHeatmapData();
    const heatmapData = data.map(
      (point) => ({
        location: new google.maps.LatLng(point.lat, point.lng),
        weight: point.weight,
      })
    );

    const heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: targetMap,
      radius: 40,
      opacity: 0.7,
      gradient: [
        "rgba(0, 255, 128, 0)",
        "rgba(0, 255, 128, 0.4)",
        "rgba(0, 200, 200, 0.6)",
        "rgba(255, 200, 0, 0.7)",
        "rgba(255, 120, 0, 0.8)",
        "rgba(255, 40, 40, 0.9)",
        "rgba(200, 0, 0, 1)",
      ],
    });

    heatmapLayerRef.current = heatmap;
    setLastRefresh(new Date());
  };

  const handleRefresh = () => {
    updateHeatmap();
  };

  const toggleTraffic = () => {
    if (trafficLayerRef.current) {
      if (showTrafficLayer) {
        trafficLayerRef.current.setMap(null);
      } else {
        trafficLayerRef.current.setMap(mapInstanceRef.current);
      }
      setShowTrafficLayer(!showTrafficLayer);
    }
  };

  const recenter = () => {
    mapInstanceRef.current?.panTo({ lat: 28.6139, lng: 77.2090 });
    mapInstanceRef.current?.setZoom(11);
  };

  useEffect(() => {
    // Check if google maps with visualization is already loaded
    if (window.google?.maps?.visualization) {
      initMap();
      return;
    }

    // Check if script is loading (but without visualization)
    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      // Need to reload with visualization library
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.visualization) {
          clearInterval(checkLoaded);
          initMap();
        }
      }, 200);

      // If visualization not available after script loads, re-add with visualization
      const timeout = setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps?.visualization) {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,visualization`;
          script.async = true;
          script.onload = () => initMap();
          document.head.appendChild(script);
        }
      }, 3000);

      return () => {
        clearInterval(checkLoaded);
        clearTimeout(timeout);
      };
    }

    // First load — include visualization
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,visualization`;
    script.async = true;
    script.defer = true;
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, [initMap]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => updateHeatmap(), 30000);
    return () => clearInterval(interval);
  }, []);

  // Derive density label from context
  const densityLabel = detectionResult?.density || "Medium";
  const densityColor =
    densityLabel === "High"
      ? "text-traffic-red"
      : densityLabel === "Medium"
      ? "text-traffic-yellow"
      : "text-traffic-green";

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Traffic Heatmap</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-mono font-semibold ${densityColor}`}>
            {densityLabel} Density
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" variant="secondary" onClick={handleRefresh} className="h-7 text-xs gap-1.5">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
        <Button size="sm" variant="secondary" onClick={recenter} className="h-7 text-xs gap-1.5">
          <Locate className="w-3 h-3" /> Center
        </Button>
        <Button
          size="sm"
          variant={showTrafficLayer ? "default" : "secondary"}
          onClick={toggleTraffic}
          className="h-7 text-xs"
        >
          {showTrafficLayer ? "Traffic: ON" : "Traffic: OFF"}
        </Button>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">
          Updated {lastRefresh.toLocaleTimeString()}
        </span>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1 rounded-lg overflow-hidden min-h-[280px] bg-secondary" />

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-traffic-green" />
          <span className="text-[10px] text-muted-foreground font-mono">Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-traffic-yellow" />
          <span className="text-[10px] text-muted-foreground font-mono">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-traffic-red" />
          <span className="text-[10px] text-muted-foreground font-mono">High</span>
        </div>
        <div className="h-2 w-24 rounded-full bg-gradient-to-r from-traffic-green via-traffic-yellow to-traffic-red" />
      </div>
    </div>
  );
};

export default TrafficHeatmap;
