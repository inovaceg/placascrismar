import type { CatalogItem } from '@/lib/excel-catalog';

const apiKey = 'sb_publishable_pnuhuR44AzUo_WxbUgmRuA_lPDNgty5';

async function callCatalogFunction(name: string, body?: unknown) {
  const response = await fetch(`https://wiaqzkueanlwcoyzuupl.supabase.co/functions/v1/${name}`, {
    method: 'POST',
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await response.json().catch(() => ({})) as { items?: CatalogItem[]; count?: number; error?: string };
  if (!response.ok) throw new Error(payload.error || 'Não foi possível acessar o banco.');
  return payload;
}

export async function loadCatalog(): Promise<CatalogItem[]> {
  const payload = await callCatalogFunction('load-catalog');
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function replaceCatalog(items: CatalogItem[]) {
  const limited = items.slice(0, 10000);
  const payload = await callCatalogFunction('replace-catalog', { items: limited });
  return payload.count ?? limited.length;
}
