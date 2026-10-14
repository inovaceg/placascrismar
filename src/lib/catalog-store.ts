import type { CatalogItem } from '@/lib/excel-catalog';

const endpoint = 'https://wiaqzkueanlwcoyzuupl.supabase.co/rest/v1/rpc';
const apiKey = 'sb_publishable_pnuhuR44AzUo_WxbUgmRuA_lPDNgty5';
const maxItems = 10000;

async function callFunction<T>(name: string, body: unknown) {
  const response = await fetch(`${endpoint}/${name}`, {
    method: 'POST',
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text() || 'Não foi possível acessar o banco.');
  return await response.json() as T;
}

export async function loadCatalog(): Promise<CatalogItem[]> {
  const rows = await callFunction<CatalogItem[]>('get_catalog', {});
  return Array.isArray(rows) ? rows.slice(0, maxItems) : [];
}

export async function replaceCatalog(items: CatalogItem[]) {
  const unique = [...new Map(items.filter(item => item.barcode.trim()).map(item => [item.barcode.trim(), item])).values()].slice(0, maxItems);
  for (let index = 0; index < Math.max(unique.length, 1); index += 500) {
    await callFunction<number>('save_catalog_batch', { items: unique.slice(index, index + 500), reset: index === 0 });
    if (unique.length === 0) break;
  }
  return unique.length;
}
