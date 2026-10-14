import type { CatalogItem } from '@/lib/excel-catalog';

const endpoint = 'https://wiaqzkueanlwcoyzuupl.supabase.co/rest/v1/catalog_items';
const apiKey = 'sb_publishable_pnuhuR44AzUo_WxbUgmRuA_lPDNgty5';
const pageSize = 1000;
const maxItems = 10000;

function headers(extra?: Record<string, string>) {
  return { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...extra };
}

async function readPage(after = '') {
  const filter = after ? `&barcode=gt.${encodeURIComponent(after)}` : '';
  const response = await fetch(`${endpoint}?select=barcode,description,price&order=barcode.asc&limit=${pageSize}${filter}`, { headers: headers({ Range: `0-${pageSize - 1}` }) });
  if (!response.ok) throw new Error('Não foi possível carregar o catálogo salvo.');
  const rows = await response.json() as CatalogItem[];
  return Array.isArray(rows) ? rows : [];
}

export async function loadCatalog(): Promise<CatalogItem[]> {
  const items: CatalogItem[] = [];
  let after = '';
  while (items.length < maxItems) {
    const rows = await readPage(after);
    if (rows.length === 0) break;
    items.push(...rows);
    after = rows[rows.length - 1]?.barcode ?? '';
    if (rows.length < pageSize || !after) break;
  }
  return items.slice(0, maxItems);
}

export async function replaceCatalog(items: CatalogItem[]) {
  const unique = [...new Map(items.filter(item => item.barcode.trim()).map(item => [item.barcode.trim(), { barcode: item.barcode.trim().slice(0, 32), description: item.description.slice(0, 200), price: item.price.slice(0, 20) }])).values()].slice(0, maxItems);
  for (let page = 0; page < 20; page += 1) {
    const existing = await readPage();
    if (existing.length === 0) break;
    const list = existing.map(item => item.barcode).join(',');
    const cleared = await fetch(`${endpoint}?barcode=in.(${list})`, { method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }) });
    if (!cleared.ok) throw new Error('Não foi possível substituir o catálogo anterior.');
  }
  for (let index = 0; index < unique.length; index += 500) {
    const response = await fetch(endpoint, { method: 'POST', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(unique.slice(index, index + 500)) });
    if (!response.ok) throw new Error(`Não foi possível gravar o lote ${index / 500 + 1}.`);
  }
  return unique.length;
}
