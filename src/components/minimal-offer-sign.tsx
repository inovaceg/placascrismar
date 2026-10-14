import type { Ref } from 'react';
import { priceParts, wrapProduct, type OfferSignData } from '@/lib/offer-sign';

export function MinimalOfferSign({ data, miniature = false, ref }: { data: OfferSignData; miniature?: boolean; ref?: Ref<SVGSVGElement> }) {
  const [whole, cents] = priceParts(data.price);
  const productLines = wrapProduct(data.product || 'SEU PRODUTO', 20).slice(0, 2);
  const fontSize = Math.min(46, 620 / Math.max(...productLines.map(line => line.length), 1));
  const priceSize = Math.min(220, 560 / Math.max(whole.length * 0.55, 1));
  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" role="img" aria-label={`Placa simples: ${data.product}, R$ ${data.price}`} className={`offer-sign minimal-sign ${data.colorMode === 'monochrome' ? 'sign-monochrome' : ''} ${miniature ? 'sign-miniature' : ''}`}>
    <rect width="600" height="400" className="minimal-paper" />
    {!miniature && <>
      {productLines.map((line, index) => <text key={`product-${index}`} x="300" y={78 + index * (fontSize + 8)} textAnchor="middle" className="minimal-ink minimal-product" fontSize={fontSize}>{line}</text>)}
      <text x="300" y="348" textAnchor="middle" className="minimal-ink minimal-price" fontSize={priceSize}><tspan fontSize={priceSize * .32}>R$</tspan>{whole}<tspan fontSize={priceSize * .42} dy={-priceSize * .32}>,{cents}</tspan></text>
            <text x="300" y="386" textAnchor="middle" className="minimal-ink" fontSize="16">{data.unit}</text>
    </>}
  </svg>;
}
