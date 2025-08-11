import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, limit = 30, scrapeOptions = { formats: ["markdown", "html"] } } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured: FIRECRAWL_API_KEY missing" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const fcRes = await fetch("https://api.firecrawl.dev/v1/crawl", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, limit, scrapeOptions }),
    });

    const text = await fcRes.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }

    return new Response(JSON.stringify(body), {
      status: fcRes.ok ? 200 : fcRes.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
