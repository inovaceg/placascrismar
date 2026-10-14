import type { CatalogItem } from '@/lib/excel-catalog';

const endpoint = 'https://wiaqzkueanlwcoyzuupl.supabase.co/rest/v1/catalog_items';
const apiKey = 'sb_publishable_pnuhuR44AzUo_WxbUgmRuA_lPDNgty5';

function headers(extra?: Record<string, string>) {
  return { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...extra };
}

export async function loadCatalog(): Promise<CatalogItem[]> {
  const items: CatalogItem[] = [];
  for (let from = 0; ; from += 1000) {
    const response = await fetch(`${endpoint}?select=barcode,description,price&order=barcode`, { headers: headers({ Range: `${from}-${from + 999}`, Prefer: 'count=exact' }) });
    if (!response.ok) throw new Error('Não foi possível carregar o catálogo salvo.');
    const rows = await response.json() as CatalogItem[];
    items.push(...(Array.isArray(rows) ? rows : []));
    if (!Array.isArray(rows) || rows.length < 1000) return items;
  }
}

export async function replaceCatalog(items: CatalogItem[]) {
  const unique = [...new Map(items.filter(item => item.barcode).map(item => [item.barcode, { barcode: item.barcode, description: item.description, price: item.price }])).values()];
  const cleared = await fetch(`${endpoint}?barcode=not.is.null`, { method: 'DELETE', headers: headers() });
  if (!cleared.ok) throw new Error('Não foi possível substituir o catálogo anterior.');
  for (let index = 0; index < unique.length; index += 400) {
    const response = await fetch(endpoint, { method: 'POST', headers: headers({ Prefer: 'return=minimal,resolution=ignore-duplicates' }), body: JSON.stringify(unique.slice(index, index + 400)) });
    if (!response.ok) throw new Error('Não foi possível gravar todos os produtos no banco.');
  }
}
