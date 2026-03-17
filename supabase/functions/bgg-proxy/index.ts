import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    // Read BGG token from app_config table
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "bgg_token")
      .single();
    const bggToken = data?.value || "";

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const q = url.searchParams.get("q") || "";
    const id = url.searchParams.get("id") || "";

    let bggUrl = "";
    if (action === "search") {
      bggUrl = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(q)}`;
    } else if (action === "thing") {
      bggUrl = `https://boardgamegeek.com/xmlapi2/thing?stats=1&id=${encodeURIComponent(id)}`;
    } else {
      return new Response("Missing action param", { status: 400, headers: CORS });
    }

    const headers: Record<string, string> = { "Accept": "application/xml" };
    if (bggToken) headers["Authorization"] = `Bearer ${bggToken}`;

    // BGG sometimes returns 202 (queued) – retry up to 3 times
    let bggRes: Response | null = null;
    for (let i = 0; i < 3; i++) {
      bggRes = await fetch(bggUrl, { headers });
      if (bggRes.status !== 202) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!bggRes || !bggRes.ok) {
      return new Response(`BGG error: ${bggRes?.status}`, { status: 502, headers: CORS });
    }

    const xml = await bggRes.text();
    return new Response(xml, {
      headers: { ...CORS, "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: CORS });
  }
});
