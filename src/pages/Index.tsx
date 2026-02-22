import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import LiveFeedPanel from "@/components/dashboard/LiveFeedPanel";
import ActionPanel from "@/components/dashboard/ActionPanel";
import RoutePanel from "@/components/dashboard/RoutePanel";
import StatsBar from "@/components/dashboard/StatsBar";
import DensityPanel from "@/components/dashboard/DensityPanel";
import NotificationsPanel from "@/components/dashboard/NotificationsPanel";

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
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

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-traffic-green animate-pulse" />
          <span className="text-muted-foreground">System Online</span>
          <span className="text-primary ml-2">v2.4.1</span>
        </div>
      </motion.header>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <StatsBar />
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
        <div className="lg:hidden">
          {/* On mobile, notifications show inline */}
        </div>
      </div>
    </div>
  );
};

export default Index;
