import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    console.log("[load-catalog] loading catalog")
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")
    const items: { barcode: string; description: string; price: string }[] = []
    for (let from = 0; from < 10000; from += 1000) {
      const { data, error } = await supabase.from("catalog_items").select("barcode,description,price").order("barcode").range(from, from + 999)
      if (error) throw error
      items.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    return new Response(JSON.stringify({ items }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error) {
    console.error("[load-catalog] error", { error: error instanceof Error ? error.message : String(error) })
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Falha ao carregar o catálogo" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
