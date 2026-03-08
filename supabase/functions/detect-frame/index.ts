import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a real-time traffic detection AI for Indian roads. Analyze the provided camera frame and detect:

1. **Traffic Lights**: Identify any traffic signals and their state (red, yellow, green).
2. **Indian Road Signs**: Detect signs from these categories:
   - Speed Limit (20, 30, 40, 50, 60, 70, 80, 100 km/h)
   - Stop Sign
   - No Parking / No Stopping
   - No Entry
   - One Way
   - No U-Turn / No Left Turn / No Right Turn
   - School Zone / Children Crossing
   - Hospital Zone
   - Railway Crossing (manned/unmanned)
   - Pedestrian Crossing / Zebra Crossing
   - Roundabout
   - Speed Breaker / Road Hump
   - No Horn
   - No Overtaking
   - Road Work / Men at Work
   - Narrow Road Ahead
   - Steep Incline / Decline
   - Give Way / Yield
   - Dangerous Curve (left/right)
   - T-Intersection / Y-Intersection
   - Truck Prohibited / Heavy Vehicle Prohibited
3. **Traffic Density**: Estimate crowd/vehicle density as Low, Medium, or High.

For bounding boxes, estimate normalized coordinates (0-1 range) as {x, y, w, h} where x,y is the top-left corner.

If no traffic elements are visible, return empty detections with null light state.`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { image, routeContext } = await req.json();
    if (!image) {
      return new Response(
        JSON.stringify({ error: "Missing 'image' (base64)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userPrompt = "Analyze this traffic camera frame. Detect all traffic lights, Indian road signs, and estimate traffic density.";
    if (routeContext) {
      userPrompt += ` Route context: Currently at signal ${routeContext.currentSignal} of ${routeContext.totalSignals} total signals on route.`;
    }

    const requestBody = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: {
                url: image.startsWith("data:")
                  ? image
                  : `data:image/jpeg;base64,${image}`,
              },
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_detections",
            description:
              "Report all detected traffic elements from the camera frame",
            parameters: {
              type: "object",
              properties: {
                detections: {
                  type: "array",
                  description: "All detected signs, lights, objects",
                  items: {
                    type: "object",
                    properties: {
                      label: {
                        type: "string",
                        description:
                          "Name of detected object e.g. 'Stop Sign', 'Speed Limit 40', 'Traffic Light Red'",
                      },
                      confidence: {
                        type: "number",
                        description: "Confidence 0-1",
                      },
                      bbox: {
                        type: "object",
                        description:
                          "Normalized bounding box (0-1 range)",
                        properties: {
                          x: { type: "number" },
                          y: { type: "number" },
                          w: { type: "number" },
                          h: { type: "number" },
                        },
                        required: ["x", "y", "w", "h"],
                      },
                    },
                    required: ["label", "confidence", "bbox"],
                  },
                },
                lightState: {
                  type: "string",
                  enum: ["red", "yellow", "green"],
                  description:
                    "Primary traffic light state if visible, omit if none",
                },
                density: {
                  type: "string",
                  enum: ["Low", "Medium", "High"],
                  description: "Estimated traffic/crowd density",
                },
                action: {
                  type: "string",
                  description:
                    "Recommended action e.g. 'STOP', 'PROCEED', 'SLOW DOWN'",
                },
                countdown: {
                  type: "number",
                  description:
                    "Estimated wait time in seconds if applicable, 0 otherwise",
                },
              },
              required: [
                "detections",
                "density",
                "action",
                "countdown",
              ],
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "report_detections" },
      },
    };

    let response: Response | null = null;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status !== 429 || attempt === maxAttempts) break;

      const waitMs = 1200 * attempt;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    if (!response) throw new Error("Detection response missing");

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Detection service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({
          detections: [],
          lightState: null,
          density: "Low",
          action: "SCANNING",
          countdown: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        detections: result.detections || [],
        lightState: result.lightState || null,
        density: result.density || "Low",
        action: result.action || "SCANNING",
        countdown: result.countdown || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("detect-frame error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
