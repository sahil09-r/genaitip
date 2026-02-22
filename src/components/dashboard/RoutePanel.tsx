import { MapPin, Navigation, Clock, AlertTriangle } from "lucide-react";

const signals = [
  { id: 1, name: "Main St & 5th Ave", status: "green" as const, wait: 0 },
  { id: 2, name: "Broadway & Oak", status: "red" as const, wait: 22 },
  { id: 3, name: "Park Blvd & Elm", status: "green" as const, wait: 0 },
  { id: 4, name: "Highway 101 Ramp", status: "yellow" as const, wait: 5 },
  { id: 5, name: "Central & Market", status: "red" as const, wait: 15 },
  { id: 6, name: "Riverside Dr & 3rd", status: "green" as const, wait: 0 },
  { id: 7, name: "Destination Exit", status: "green" as const, wait: 0 },
];

const statusColors = {
  red: "bg-traffic-red",
  yellow: "bg-traffic-yellow",
  green: "bg-traffic-green",
};

const RoutePanel = () => {
  const totalWait = signals.reduce((sum, s) => sum + s.wait, 0);

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Route Analysis</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">Google Maps API</span>
      </div>

      {/* Route header */}
      <div className="bg-secondary/50 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <MapPin className="w-3 h-3" />
          <span>Downtown Office → Airport Terminal 2</span>
        </div>
        <div className="flex gap-4 font-mono text-xs mt-2">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary" />
            <span className="text-foreground font-semibold">ETA 14 min</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-traffic-yellow" />
            <span className="text-foreground">{signals.length} signals</span>
          </div>
          <div>
            <span className="text-muted-foreground">Wait: </span>
            <span className="text-traffic-red font-semibold">{totalWait}s</span>
          </div>
        </div>
      </div>

      {/* Signal list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {signals.map((signal, i) => (
          <div
            key={signal.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
          >
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-2.5 h-2.5 rounded-full ${statusColors[signal.status]}`} />
              {i < signals.length - 1 && <div className="w-px h-4 bg-border" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-foreground truncate block">{signal.name}</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {signal.wait > 0 ? `${signal.wait}s` : "GO"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoutePanel;
