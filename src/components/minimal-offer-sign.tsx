import type { Ref } from 'react';
import { priceParts, wrapProduct, type OfferSignData } from '@/lib/offer-sign';

export function MinimalOfferSign({ data, miniature = false, hideCurrency = false, ref }: { data: OfferSignData; miniature?: boolean; hideCurrency?: boolean; ref?: Ref<SVGSVGElement> }) {
  const [whole, cents] = priceParts(data.price);
  const productLines = wrapProduct(data.product || 'SEU PRODUTO', 20).slice(0, 2);
  const fontSize = Math.min(34, 520 / Math.max(...productLines.map(line => line.length), 1));
  const priceSize = Math.min(190, 550 / Math.max(whole.length * 0.58, 1));
  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" role="img" aria-label={`Placa simples: ${data.product}, R$ ${data.price}`} className={`offer-sign minimal-sign ${data.colorMode === 'monochrome' ? 'sign-monochrome' : ''} ${miniature ? 'sign-miniature' : ''}`}>
    <rect width="600" height="400" className="minimal-paper" />
    {!miniature && <>
      {productLines.map((line, index) => <text key={`product-${index}`} x="300" y={70 + index * (fontSize + 7)} textAnchor="middle" className="minimal-ink minimal-product" fontSize={fontSize}>{line}</text>)}
      {!hideCurrency && <text x="300" y="280" textAnchor="middle" className="minimal-ink minimal-price" fontSize={priceSize}>{whole}<tspan fontSize={priceSize * .48} dy={-priceSize * .28}>,{cents}</tspan></text>}
      <text x="300" y="320" textAnchor="middle" className="minimal-ink" fontSize="16">{data.unit}</text>
    </>}
  </svg>;
}