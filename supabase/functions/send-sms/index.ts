import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const TELNYX_API_KEY = Deno.env.get("TELNYX_API_KEY");
    if (!TELNYX_API_KEY) throw new Error("TELNYX_API_KEY not configured");

    const { to, text, from } = await req.json();
    if (!to || !text) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'text'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TELNYX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || Deno.env.get("TELNYX_FROM_NUMBER") || "+10000000000",
        to,
        text,
        webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/telnyx-webhook`,
        webhook_failover_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/telnyx-webhook-failure`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Telnyx API error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Failed to send SMS", details: data }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: data.data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-sms error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
