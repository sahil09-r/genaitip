/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    google: typeof google;
  }
}
import { MapPin, Navigation, Clock, AlertTriangle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const GOOGLE_MAPS_API_KEY = "AIzaSyAZcUF_UZcDJvBV_pE5DfgdaK5x38al32o";

interface RouteInfo {
  origin: string;
  destination: string;
  duration: string;
  distance: string;
  steps: { instruction: string; distance: string; duration: string }[];
}

const RoutePanel = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (document.getElementById("google-maps-script")) return;
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => initMap();
    document.head.appendChild(script);

    return () => {};
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.google) return;
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 28.6139, lng: 77.209 },
      zoom: 12,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1a1d23" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a1d23" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d3748" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e4d6b" }] },
      ],
      disableDefaultUI: true,
      zoomControl: true,
    });
    mapInstanceRef.current = map;
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map,
      polylineOptions: { strokeColor: "#00c9db", strokeWeight: 4 },
    });
  };

  useEffect(() => {
    if (window.google && mapRef.current && !mapInstanceRef.current) initMap();
  });

  const calculateRoute = async () => {
    if (!origin || !destination || !window.google) return;
    setLoading(true);
    setError(null);

    const directionsService = new google.maps.DirectionsService();
    try {
      const result = await directionsService.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      if (result.routes.length > 0) {
        directionsRendererRef.current?.setDirections(result);
        const leg = result.routes[0].legs[0];
        setRouteInfo({
          origin: leg.start_address,
          destination: leg.end_address,
          duration: leg.duration?.text || "",
          distance: leg.distance?.text || "",
          steps: leg.steps.map((s) => ({
            instruction: s.instructions.replace(/<[^>]*>/g, ""),
            distance: s.distance?.text || "",
            duration: s.duration?.text || "",
          })),
        });
      }
    } catch (err: any) {
      setError("Could not find route. Check your addresses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Route Analysis</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">Google Maps API</span>
      </div>

      {/* Search inputs */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <MapPin className="absolute left-2.5 top-2 w-3.5 h-3.5 text-traffic-green" />
          <Input
            placeholder="Origin address"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="pl-8 bg-secondary border-border h-8 text-xs"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-2.5 top-2 w-3.5 h-3.5 text-traffic-red" />
          <Input
            placeholder="Destination address"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="pl-8 bg-secondary border-border h-8 text-xs"
          />
        </div>
        <Button size="sm" onClick={calculateRoute} disabled={loading} className="w-full h-8 text-xs">
          <Search className="w-3 h-3 mr-1" />
          {loading ? "Calculating..." : "Find Route"}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive mb-2">{error}</p>}

      {/* Route info */}
      {routeInfo && (
        <div className="bg-secondary/50 rounded-lg p-3 mb-3">
          <div className="flex gap-4 font-mono text-xs">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary" />
              <span className="text-foreground font-semibold">ETA {routeInfo.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-traffic-yellow" />
              <span className="text-foreground">{routeInfo.distance}</span>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div ref={mapRef} className="flex-1 rounded-lg overflow-hidden min-h-[200px] bg-secondary" />

      {/* Steps */}
      {routeInfo && (
        <div className="mt-2 max-h-[120px] overflow-y-auto space-y-1 pr-1">
          {routeInfo.steps.slice(0, 8).map((step, i) => (
            <div key={i} className="flex items-start gap-2 p-1.5 rounded hover:bg-secondary/30 text-xs">
              <span className="text-primary font-mono font-bold min-w-[18px]">{i + 1}</span>
              <span className="text-foreground flex-1 truncate">{step.instruction}</span>
              <span className="text-muted-foreground font-mono">{step.distance}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoutePanel;
