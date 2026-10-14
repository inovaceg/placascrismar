import type { CatalogItem } from '@/lib/excel-catalog';

const endpoint = 'https://wiaqzkueanlwcoyzuupl.supabase.co/rest/v1/catalog_items';
const apiKey = 'sb_publishable_pnuhuR44AzUo_WxbUgmRuA_lPDNgty5';

function headers(extra?: Record<string, string>) {
  return { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...extra };
}

export async function loadCatalog(): Promise<CatalogItem[]> {
  const items: CatalogItem[] = [];
  for (let from = 0; from < 10000; from += 1000) {
    const response = await fetch(`${endpoint}?select=barcode,description,price&order=barcode.asc&limit=1000&offset=${from}`, { headers: headers({ Range: `${from}-${from + 999}` }) });
    if (!response.ok) throw new Error('Não foi possível carregar o catálogo salvo.');
    const rows = await response.json() as CatalogItem[];
    if (!Array.isArray(rows) || rows.length === 0) break;
    items.push(...rows);
    if (rows.length < 1000) break;
  }
  return items;
}

export async function replaceCatalog(items: CatalogItem[]) {
  const unique = [...new Map(items.filter(item => item.barcode.trim()).map(item => [item.barcode.trim(), { barcode: item.barcode.trim().slice(0, 32), description: item.description.slice(0, 200), price: item.price.slice(0, 20) }])).values()].slice(0, 10000);
  const cleared = await fetch(`${endpoint}?barcode=not.is.null`, { method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }) });
  if (!cleared.ok) throw new Error('Não foi possível substituir o catálogo anterior.');
  for (let index = 0; index < unique.length; index += 500) {
    const response = await fetch(endpoint, { method: 'POST', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(unique.slice(index, index + 500)) });
    if (!response.ok) throw new Error(`Não foi possível gravar o lote ${index / 500 + 1}.`);
  }
  return unique.length;
}
