import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes";

const formatDuration = (duration?: string) => {
  const seconds = Number(duration?.replace("s", "") || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const mins = Math.round(seconds / 60);
  if (mins >= 60) return `${Math.floor(mins / 60)} hour${Math.floor(mins / 60) !== 1 ? "s" : ""} ${mins % 60} min`;
  return `${mins} min`;
};

const formatDistance = (meters?: number) => {
  if (!meters) return "";
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
  return `${Math.round(meters)} m`;
};

const estimateSignalsAndTolls = (steps: any[], distanceMeters?: number, hasTollInfo?: boolean) => {
  const signalKeywords = ["traffic light", "traffic signal", "signal", "stoplight", "intersection"];
  const tollKeywords = ["toll", "toll plaza", "toll booth", "toll road", "tollway"];
  let signals = 0;
  let tolls = hasTollInfo ? 1 : 0;

  for (const step of steps) {
    const text = String(step?.navigationInstruction?.instructions || "").toLowerCase();
    if (signalKeywords.some((kw) => text.includes(kw))) signals++;
    if (text.includes("turn left") || text.includes("turn right")) signals++;
    if (tollKeywords.some((kw) => text.includes(kw))) tolls++;
  }

  const totalDistanceKm = (distanceMeters || 0) / 1000;
  return {
    signals: Math.max(signals, Math.round(totalDistanceKm / 1.5)),
    tolls,
  };
};

const timeDifference = (primary?: string, alternative?: string) => {
  const primarySeconds = Number(primary?.replace("s", "") || 0);
  const altSeconds = Number(alternative?.replace("s", "") || 0);
  const diff = primarySeconds - altSeconds;
  const label = formatDuration(`${Math.abs(diff)}s`) || "0 min";
  return diff > 0 ? label : `+${label}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { origin, destination } = await req.json();
    if (!origin || !destination || typeof origin !== "string" || typeof destination !== "string") {
      return new Response(JSON.stringify({ error: "Origin and destination are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.navigationInstruction,routes.travelAdvisory.tollInfo",
      },
      body: JSON.stringify({
        origin: { address: origin.trim() },
        destination: { address: destination.trim() },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: true,
        routeModifiers: { avoidTolls: false },
        languageCode: "en-US",
        units: "METRIC",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Google Routes API error:", response.status, JSON.stringify(data));
      const permissionDenied = response.status === 403 || data?.error?.status === "PERMISSION_DENIED";
      return new Response(JSON.stringify({
        error: permissionDenied
          ? "Google Routes API is not enabled or allowed for this key. Enable Routes API on the same Google Cloud project as this Maps key."
          : "Google route service is unavailable.",
        details: data,
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const routes = data.routes || [];
    if (!routes.length) {
      return new Response(JSON.stringify({ error: "Could not find a route for those addresses." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const primary = routes[0];
    const steps = primary.legs?.flatMap((leg: any) => leg.steps || []) || [];
    const counts = estimateSignalsAndTolls(steps, primary.distanceMeters, Boolean(primary.travelAdvisory?.tollInfo));

    return new Response(JSON.stringify({
      origin,
      destination,
      duration: formatDuration(primary.duration),
      distance: formatDistance(primary.distanceMeters),
      signalCount: counts.signals,
      tollCount: counts.tolls,
      polyline: primary.polyline?.encodedPolyline || "",
      altRoutes: routes.slice(1).map((route: any) => ({
        duration: formatDuration(route.duration),
        distance: formatDistance(route.distanceMeters),
        timeSaved: timeDifference(primary.duration, route.duration),
        polyline: route.polyline?.encodedPolyline || "",
      })),
      steps: steps.map((step: any) => ({
        instruction: step?.navigationInstruction?.instructions || "Continue",
        distance: formatDistance(step?.distanceMeters),
        duration: formatDuration(step?.staticDuration),
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("compute-route error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});