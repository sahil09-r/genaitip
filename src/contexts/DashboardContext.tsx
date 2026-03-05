import { createContext, useContext, useState, ReactNode } from "react";

export interface RouteData {
  origin: string;
  destination: string;
  duration: string;
  distance: string;
  signalCount: number;
  tollCount: number;
  steps: { instruction: string; distance: string; duration: string }[];
  altRoutes: { duration: string; distance: string; timeSaved: string }[];
}

interface DashboardContextType {
  cameraActive: boolean;
  setCameraActive: (v: boolean) => void;
  routeData: RouteData | null;
  setRouteData: (v: RouteData | null) => void;
  notifications: DashboardNotification[];
  addNotification: (n: Omit<DashboardNotification, "id" | "time">) => void;
}

export interface DashboardNotification {
  id: number;
  time: string;
  text: string;
  type: "alert" | "warning" | "info";
}

const DashboardContext = createContext<DashboardContextType>({
  cameraActive: false,
  setCameraActive: () => {},
  routeData: null,
  setRouteData: () => {},
  notifications: [],
  addNotification: () => {},
});

let notifId = 0;

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);

  const addNotification = (n: Omit<DashboardNotification, "id" | "time">) => {
    notifId++;
    setNotifications((prev) => [
      { ...n, id: notifId, time: "Just now" },
      ...prev,
    ]);
  };

  return (
    <DashboardContext.Provider
      value={{ cameraActive, setCameraActive, routeData, setRouteData, notifications, addNotification }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
