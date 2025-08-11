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
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured: PERPLEXITY_API_KEY missing" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { role: "system", content: "Be precise and concise." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 900,
        frequency_penalty: 1,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const errTxt = await response.text();
      return new Response(JSON.stringify({ error: errTxt || "Upstream error" }), {
        status: response.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const data = await response.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ content: content ?? "" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
