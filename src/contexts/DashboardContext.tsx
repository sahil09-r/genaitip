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

export interface Detection {
  label: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
}

export interface DetectionResult {
  detections: Detection[];
  lightState: "red" | "yellow" | "green" | null;
  density: "Low" | "Medium" | "High";
  action: string;
  countdown: number;
}

export interface DashboardNotification {
  id: number;
  time: string;
  text: string;
  type: "alert" | "warning" | "info";
}

interface DashboardContextType {
  cameraActive: boolean;
  setCameraActive: (v: boolean) => void;
  routeData: RouteData | null;
  setRouteData: (v: RouteData | null) => void;
  notifications: DashboardNotification[];
  addNotification: (n: Omit<DashboardNotification, "id" | "time">) => void;
  detectionResult: DetectionResult | null;
  setDetectionResult: (v: DetectionResult | null) => void;
  isDetecting: boolean;
  setIsDetecting: (v: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType>({
  cameraActive: false,
  setCameraActive: () => {},
  routeData: null,
  setRouteData: () => {},
  notifications: [],
  addNotification: () => {},
  detectionResult: null,
  setDetectionResult: () => {},
  isDetecting: false,
  setIsDetecting: () => {},
});

let notifId = 0;

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const addNotification = (n: Omit<DashboardNotification, "id" | "time">) => {
    notifId++;
    setNotifications((prev) => [
      { ...n, id: notifId, time: "Just now" },
      ...prev,
    ]);
  };

  return (
    <DashboardContext.Provider
      value={{
        cameraActive, setCameraActive,
        routeData, setRouteData,
        notifications, addNotification,
        detectionResult, setDetectionResult,
        isDetecting, setIsDetecting,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
