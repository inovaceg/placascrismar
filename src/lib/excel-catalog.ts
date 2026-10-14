export type CatalogItem = { barcode: string; description: string; price: string };

function readText(bytes: Uint8Array) { return new TextDecoder().decode(bytes); }
function columnNumber(reference: string) { let value = 0; for (const char of reference) value = value * 26 + char.charCodeAt(0) - 64; return value - 1; }
function decodeXml(value: string) {
  const amp = String.fromCharCode(38);
  return value.split(amp + 'amp;').join(amp).split(amp + 'lt;').join('<').split(amp + 'gt;').join('>').split(amp + 'quot;').join('"');
}
function formatBarcode(value: string) {
  const trimmed = value.trim();
  if (/e\+|e-/i.test(trimmed)) { const parsed = Number(trimmed); if (Number.isFinite(parsed)) return String(Math.round(parsed)); }
  return trimmed.replace(/\.0$/, '');
}
export function formatPrice(value: string) {
  const normalized = value.trim().replace(/\s/g, '');
  if (!normalized) return '';
  if (normalized.includes(',') && normalized.includes('.')) return normalized.replace(/\./g, '');
  if (normalized.includes('.')) return normalized.replace('.', ',');
  if (normalized.includes(',')) return normalized;
  return `${normalized},00`;
}

async function unzipEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer); const view = new DataView(buffer); const entries = new Map<string, Uint8Array>(); let end = -1;
  for (let i = bytes.length - 22; i >= 0; i--) if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error('Arquivo Excel inválido. Use um arquivo .xlsx.');
  const centralOffset = view.getUint32(end + 16, true); const count = view.getUint16(end + 10, true); let offset = centralOffset;
  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true); const compressed = view.getUint32(offset + 20, true); const nameLength = view.getUint16(offset + 28, true); const extraLength = view.getUint16(offset + 30, true); const commentLength = view.getUint16(offset + 32, true); const name = readText(bytes.slice(offset + 46, offset + 46 + nameLength)); const local = view.getUint32(offset + 42, true); const localNameLength = view.getUint16(local + 26, true); const localExtraLength = view.getUint16(local + 28, true); const payload = bytes.slice(local + 30 + localNameLength + localExtraLength, local + 30 + localNameLength + localExtraLength + compressed);
    if (method === 0) entries.set(name, payload); else { const decompressed = await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer(); entries.set(name, new Uint8Array(decompressed)); }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export async function readExcelCatalog(file: File): Promise<CatalogItem[]> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Envie a planilha no formato .xlsx.');
  const entries = await unzipEntries(await file.arrayBuffer());
  const sheet = entries.get('xl/worksheets/sheet1.xml') ?? [...entries.entries()].find(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))?.[1];
  if (!sheet) throw new Error('Planilha não encontrada');
  const shared = entries.get('xl/sharedStrings.xml');
  const sharedValues = shared ? [...readText(shared).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => decodeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(part => part[1] ?? '').join(''))) : [];
  const items: CatalogItem[] = [];
  for (const row of readText(sheet).matchAll(/<row\b[\s\S]*?<\/row>/g)) {
    const values: string[] = [];
    for (const cell of row[0].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cell[1] ?? '';
      const reference = attributes.match(/\br="([A-Z]+)\d+"/)?.[1];
      const raw = cell[2]?.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? [...(cell[2] ?? '').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(part => part[1] ?? '').join('');
      const value = attributes.includes('t="s"') ? sharedValues[Number(raw)] ?? '' : decodeXml(raw);
      if (reference) values[columnNumber(reference)] = value;
    }
    const barcode = formatBarcode(values[5] ?? '');
    if (barcode) items.push({ barcode, description: values[1] ?? '', price: formatPrice(values[3] ?? '') });
  }
  return items;
}
