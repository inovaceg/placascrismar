export type SignSize = 'small' | 'medium' | 'large';
export type SignModel = 'classic' | 'hot';
export type SignColorMode = 'color' | 'monochrome';
export interface OfferSignData {
  product: string;
  description: string;
  price: string;
  unit: string;
  previousPrice: string;
  footer: string;
  showFooter: boolean;
  model: SignModel;
  colorMode: SignColorMode;
  size: SignSize;
}
export const signSizes = {
  small: { label: 'Pequena', format: 'A6', width: 105, height: 148 },
  medium: { label: 'Média', format: 'A5', width: 148, height: 210 },
  large: { label: 'Grande', format: 'A4', width: 210, height: 297 },
} as const;
export const initialOffer: OfferSignData = {
  product: 'ARROZ BRANCO', description: 'Tipo 1 • Pacote de 5 kg', price: '19,90', unit: 'unidade',
  previousPrice: '24,90', footer: 'Oferta válida enquanto durarem os estoques.', showFooter: true,
  model: 'classic', size: 'medium', colorMode: 'color',
};
export function priceParts(value: string): [string, string] {
  const parsed = Number(value.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0) return ['0', '00'];
  const [whole = '0', cents = '00'] = parsed.toFixed(2).split('.');
  return [whole, cents];
}
export function wrapProduct(value: string, limit = 18): string[] {
  const words = value.trim().toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > limit) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}