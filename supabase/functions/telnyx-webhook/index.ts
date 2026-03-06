import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const eventType = payload?.data?.event_type;

    console.log("Telnyx webhook received:", eventType, JSON.stringify(payload));

    if (eventType === "message.finalized") {
      const status = payload.data.payload?.to?.[0]?.status;
      const msgId = payload.data.payload?.id;
      console.log(`Message ${msgId} status: ${status}`);
    }

    if (eventType === "message.received") {
      const from = payload.data.payload?.from?.phone_number;
      const text = payload.data.payload?.text;
      console.log(`Inbound message from ${from}: ${text}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Telnyx webhook error:", e);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
