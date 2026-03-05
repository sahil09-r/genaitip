import { Bell } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";

const typeStyles = {
  alert: "border-l-traffic-red bg-traffic-red/5",
  warning: "border-l-traffic-yellow bg-traffic-yellow/5",
  info: "border-l-primary bg-primary/5",
};

const defaultNotifications = [
  { id: -1, time: "Waiting", text: "Enter a route to receive real-time notifications", type: "info" as const },
];

const NotificationsPanel = () => {
  const { notifications } = useDashboard();
  const displayNotifications = notifications.length > 0 ? notifications : defaultNotifications;

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Notifications</span>
        <span className="ml-auto bg-primary/20 text-primary text-[10px] font-mono px-2 py-0.5 rounded-full">
          {notifications.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {displayNotifications.map((n) => (
          <div
            key={n.id}
            className={`border-l-2 ${typeStyles[n.type]} rounded-r-lg p-2.5`}
          >
            <div className="text-xs text-foreground">{n.text}</div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPanel;
