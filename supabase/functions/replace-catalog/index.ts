import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const raw = Array.isArray(body?.items) ? body.items : []
    const unique = new Map<string, { barcode: string; reduced_code: string; description: string; price: string }>()
    for (const item of raw) {
      const barcode = String(item?.barcode ?? "").trim().slice(0, 32)
      if (!barcode) continue
      unique.set(barcode, {
        barcode,
        reduced_code: String(item?.reducedCode ?? "").trim().slice(0, 32),
        description: String(item?.description ?? "").slice(0, 200),
        price: String(item?.price ?? "").slice(0, 20),
      })
      if (unique.size >= 10000) break
    }
    const items = [...unique.values()]
    console.log("[replace-catalog] replacing catalog", { count: items.length })
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")
    const { error: deleteError } = await supabase.from("catalog_items").delete().neq("barcode", "")
        if (deleteError) throw deleteError
    for (let index = 0; index < items.length; index += 500) {
      const { error } = await supabase.from("catalog_items").insert(items.slice(index, index + 500))
      if (error) throw error
    }
    return new Response(JSON.stringify({ count: items.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error) {
    console.error("[replace-catalog] error", { error: error instanceof Error ? error.message : String(error) })
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Falha ao gravar o catálogo" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
