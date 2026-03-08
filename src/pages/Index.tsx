import { motion } from "framer-motion";
import { Radio, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { DashboardProvider } from "@/contexts/DashboardContext";
import LiveFeedPanel from "@/components/dashboard/LiveFeedPanel";
import ActionPanel from "@/components/dashboard/ActionPanel";
import RoutePanel from "@/components/dashboard/RoutePanel";
import StatsBar from "@/components/dashboard/StatsBar";
import WeatherPanel from "@/components/dashboard/WeatherPanel";
import DensityPanel from "@/components/dashboard/DensityPanel";
import NotificationsPanel from "@/components/dashboard/NotificationsPanel";
import NotificationSubscription from "@/components/dashboard/NotificationSubscription";
import AIChatbot from "@/components/dashboard/AIChatbot";

const Index = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <DashboardProvider>
    <div className="min-h-screen bg-background p-4 md:p-6 flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center glow-cyan">
            <Radio className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              GenAI-YOLO
            </h1>
            <p className="text-[11px] text-muted-foreground font-mono">
              Traffic Intelligence Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-traffic-green animate-pulse" />
            <span className="text-muted-foreground">System Online</span>
            <span className="text-primary ml-2">v2.4.1</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Stats + Weather */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <div className="md:col-span-3">
          <StatsBar />
        </div>
        <div>
          <WeatherPanel />
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Left: Live Feed */}
        <div className="lg:col-span-2">
          <LiveFeedPanel />
        </div>

        {/* Right: Action */}
        <div>
          <ActionPanel />
        </div>

        {/* Bottom row */}
        <div>
          <RoutePanel />
        </div>
        <div className="flex flex-col gap-4">
          <DensityPanel />
          <div className="flex-1">
            <NotificationsPanel />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <NotificationSubscription />
        </div>
      </div>

      <AIChatbot />

      {/* Footer */}
      <footer className="mt-6 pt-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground font-mono">
          © {new Date().getFullYear()} GenAI-YOLO Traffic Intelligence Platform. All rights reserved.
        </p>
        <p className="text-[10px] text-muted-foreground/70 font-mono mt-1">
          Admin: Sahil Sinha
        </p>
      </footer>
    </div>
    </DashboardProvider>
  );
};

export default Index;
