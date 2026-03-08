/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Clock, AlertTriangle, Search, TrafficCone, Landmark, Route } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";

declare global {
  interface Window {
    google: typeof google;
  }
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAZcUF_UZcDJvBV_pE5DfgdaK5x38al32o";

const RoutePanel = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const altRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const { setRouteData, addNotification } = useDashboard();

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
      polylineOptions: { strokeColor: "#00c9db", strokeWeight: 5 },
      suppressMarkers: false,
    });
    altRendererRef.current = new google.maps.DirectionsRenderer({
      map,
      polylineOptions: { strokeColor: "#6b7280", strokeWeight: 3, strokeOpacity: 0.5 },
      suppressMarkers: true,
    });
  };

  useEffect(() => {
    if (window.google && mapRef.current && !mapInstanceRef.current) initMap();
  });

  const countSignalsAndTolls = (steps: google.maps.DirectionsStep[]) => {
    let signals = 0;
    let tolls = 0;
    const signalKeywords = ["traffic light", "traffic signal", "signal", "stoplight", "intersection"];
    const tollKeywords = ["toll", "toll plaza", "toll booth", "toll road", "tollway"];

    steps.forEach((step) => {
      const text = step.instructions.toLowerCase();
      if (signalKeywords.some((kw) => text.includes(kw))) signals++;
      // Count turns at intersections as potential signals
      if (text.includes("turn left") || text.includes("turn right")) signals++;
    });

    steps.forEach((step) => {
      const text = step.instructions.toLowerCase();
      if (tollKeywords.some((kw) => text.includes(kw))) tolls++;
    });

    // Estimate additional signals based on distance (roughly 1 signal per 1.5km in urban areas)
    const totalDistanceKm = steps.reduce((sum, s) => sum + (s.distance?.value || 0), 0) / 1000;
    const estimatedSignals = Math.max(signals, Math.round(totalDistanceKm / 1.5));

    return { signals: estimatedSignals, tolls };
  };

  const parseDurationSeconds = (durationText: string): number => {
    let total = 0;
    const hours = durationText.match(/(\d+)\s*hour/);
    const mins = durationText.match(/(\d+)\s*min/);
    if (hours) total += parseInt(hours[1]) * 3600;
    if (mins) total += parseInt(mins[1]) * 60;
    return total;
  };

  const formatTimeSaved = (seconds: number): string => {
    if (seconds <= 0) return "0 min";
    const mins = Math.round(seconds / 60);
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins} min`;
  };

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
        provideRouteAlternatives: true,
        avoidTolls: false,
      });

      if (result.routes.length > 0) {
        directionsRendererRef.current?.setDirections(result);

        // Show alternative route if available
        if (result.routes.length > 1 && altRendererRef.current) {
          const altResult = { ...result, routes: [result.routes[1]] };
          altRendererRef.current.setDirections(altResult as google.maps.DirectionsResult);
          altRendererRef.current.setRouteIndex(0);
        }

        const leg = result.routes[0].legs[0];
        const { signals, tolls } = countSignalsAndTolls(leg.steps);
        const primaryDuration = parseDurationSeconds(leg.duration?.text || "");

        // Build alternative routes info
        const altRoutes = result.routes.slice(1).map((route) => {
          const altLeg = route.legs[0];
          const altDuration = parseDurationSeconds(altLeg.duration?.text || "");
          const timeDiff = primaryDuration - altDuration;
          return {
            duration: altLeg.duration?.text || "",
            distance: altLeg.distance?.text || "",
            timeSaved: timeDiff > 0 ? formatTimeSaved(timeDiff) : `+${formatTimeSaved(Math.abs(timeDiff))}`,
          };
        });

        const routeData = {
          origin: leg.start_address,
          destination: leg.end_address,
          duration: leg.duration?.text || "",
          distance: leg.distance?.text || "",
          signalCount: signals,
          tollCount: tolls,
          steps: leg.steps.map((s) => ({
            instruction: s.instructions.replace(/<[^>]*>/g, ""),
            distance: s.distance?.text || "",
            duration: s.duration?.text || "",
          })),
          altRoutes,
        };

        setRouteData(routeData);

        // Add real notifications
        addNotification({
          text: `Route calculated: ${leg.start_address.split(",")[0]} → ${leg.end_address.split(",")[0]}`,
          type: "info",
        });
        addNotification({
          text: `${signals} traffic signals and ${tolls} toll plaza${tolls !== 1 ? "s" : ""} on route`,
          type: "warning",
        });
        if (altRoutes.length > 0) {
          addNotification({
            text: `Alternative route available — ${altRoutes[0].duration} (${altRoutes[0].timeSaved} difference)`,
            type: "info",
          });
        }
      }
    } catch (err: any) {
      setError("Could not find route. Check your addresses.");
    } finally {
      setLoading(false);
    }
  };

  const { routeData } = useDashboard();

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

      {/* Route info with signals and tolls */}
      {routeData && (
        <div className="bg-secondary/50 rounded-lg p-3 mb-3 space-y-2">
          <div className="flex gap-4 font-mono text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary" />
              <span className="text-foreground font-semibold">ETA {routeData.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Route className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground">{routeData.distance}</span>
            </div>
          </div>
          <div className="flex gap-4 font-mono text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <TrafficCone className="w-3 h-3 text-traffic-yellow" />
              <span className="text-foreground">{routeData.signalCount} Signals</span>
            </div>
            <div className="flex items-center gap-1">
              <Landmark className="w-3 h-3 text-traffic-red" />
              <span className="text-foreground">{routeData.tollCount} Toll Plaza{routeData.tollCount !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Alternative routes */}
          {routeData.altRoutes.length > 0 && (
            <div className="border-t border-border pt-2 mt-2">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Alternative Routes</span>
              {routeData.altRoutes.map((alt, i) => (
                <div key={i} className="flex items-center justify-between mt-1 text-xs font-mono">
                  <span className="text-muted-foreground">Route {i + 2}: {alt.distance} • {alt.duration}</span>
                  <span className={`font-semibold ${alt.timeSaved.startsWith("+") ? "text-traffic-red" : "text-traffic-green"}`}>
                    {alt.timeSaved.startsWith("+") ? alt.timeSaved + " slower" : alt.timeSaved + " faster"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div ref={mapRef} className="flex-1 rounded-lg overflow-hidden min-h-[200px] bg-secondary" />

      {/* Steps */}
      {routeData && (
        <div className="mt-2 max-h-[120px] overflow-y-auto space-y-1 pr-1">
          {routeData.steps.slice(0, 8).map((step, i) => (
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
