import { Bell } from "lucide-react";

const notifications = [
  { id: 1, time: "0:02", text: "Signal ahead — prepare to stop", type: "warning" as const },
  { id: 2, time: "0:18", text: "Heavy traffic detected on Main St", type: "alert" as const },
  { id: 3, time: "0:45", text: "Route recalculated — 2 min faster", type: "info" as const },
  { id: 4, time: "1:12", text: "Speed limit changed to 40 km/h", type: "info" as const },
  { id: 5, time: "2:30", text: "Fog detected — GenAI enhancement active", type: "warning" as const },
];

const typeStyles = {
  alert: "border-l-traffic-red bg-traffic-red/5",
  warning: "border-l-traffic-yellow bg-traffic-yellow/5",
  info: "border-l-primary bg-primary/5",
};

const NotificationsPanel = () => (
  <div className="glass-panel p-4 flex flex-col h-full">
    <div className="flex items-center gap-2 mb-3">
      <Bell className="w-4 h-4 text-primary" />
      <span className="text-sm font-semibold text-foreground">Notifications</span>
      <span className="ml-auto bg-primary/20 text-primary text-[10px] font-mono px-2 py-0.5 rounded-full">
        {notifications.length}
      </span>
    </div>

    <div className="flex-1 overflow-y-auto space-y-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`border-l-2 ${typeStyles[n.type]} rounded-r-lg p-2.5`}
        >
          <div className="text-xs text-foreground">{n.text}</div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">{n.time} ago</div>
        </div>
      ))}
    </div>
  </div>
);

export default NotificationsPanel;
