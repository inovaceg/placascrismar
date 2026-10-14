import type { Ref } from 'react';
import { priceParts, wrapProduct, type OfferSignData } from '@/lib/offer-sign';

export function MinimalOfferSign({ data, miniature = false, ref, hideCurrency = false, descriptionFontSize }: { data: OfferSignData; miniature?: boolean; ref?: Ref<SVGSVGElement>; hideCurrency?: boolean; descriptionFontSize?: number }) {
  const [whole, cents] = priceParts(data.price);
  const productLines = wrapProduct(data.product || 'SEU PRODUTO', 16).slice(0, 2);
  const descriptionLines = wrapProduct(data.description, 22).slice(0, 2);
  const fontSize = Math.min(52, 720 / Math.max(...productLines.map(line => line.length), 1));
  const priceSize = Math.min(220, 560 / Math.max(whole.length * 0.55, 1));
  const descSize = descriptionFontSize ?? 16;
  
  // Check if we should show 2 signs side by side (for individual sign mode)
  const showTwoUp = !miniature && data.size === 'large';
  
  if (showTwoUp) {
      // Two-up vertical layout for A4 sheet with 2 signs stacked
      return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 848" role="img" aria-label={`Placa simples: ${data.product}, R$ ${data.price}`} className={`offer-sign minimal-sign ${data.colorMode === 'monochrome' ? 'sign-monochrome' : ''}`}>
        <rect width="600" height="848" className="minimal-paper" />
        {/* Top sign */}
        <rect x="20" y="20" width="560" height="360" className="minimal-paper" strokeWidth="2" strokeDasharray="4,4" />
        {!miniature && <>
          {productLines.map((line, index) => <text key={`product-top-${index}`} x="300" y={70 + index * (fontSize + 6)} textAnchor="middle" className="minimal-ink minimal-product" fontSize={fontSize}>{line}</text>)}
          {descriptionLines.map((line, index) => <text key={`desc-top-${index}`} x="300" y={150 + index * (descSize + 4)} textAnchor="middle" className="minimal-ink" fontSize={descSize}>{line}</text>)}
          <text x="300" y={descriptionLines.length > 0 ? 330 : 348} textAnchor="middle" className="minimal-ink minimal-price" fontSize={priceSize}>
            {!hideCurrency && <tspan fontSize={priceSize * .32}>R$</tspan>}{whole}
            <tspan fontSize={priceSize * .42} dy={-priceSize * .32}>,{cents}</tspan>
          </text>
          <text x="300" y={descriptionLines.length > 0 ? 370 : 386} textAnchor="middle" className="minimal-ink" fontSize="16">{data.unit}</text>
        </>}
        {/* Bottom sign */}
        <rect x="20" y="440" width="560" height="360" className="minimal-paper" strokeWidth="2" strokeDasharray="4,4" />
        {!miniature && <>
          {productLines.map((line, index) => <text key={`product-bottom-${index}`} x="300" y={510 + index * (fontSize + 6)} textAnchor="middle" className="minimal-ink minimal-product" fontSize={fontSize}>{line}</text>)}
          {descriptionLines.map((line, index) => <text key={`desc-bottom-${index}`} x="300" y={590 + index * (descSize + 4)} textAnchor="middle" className="minimal-ink" fontSize={descSize}>{line}</text>)}
          <text x="300" y={descriptionLines.length > 0 ? 770 : 788} textAnchor="middle" className="minimal-ink minimal-price" fontSize={priceSize}>
            {!hideCurrency && <tspan fontSize={priceSize * .32}>R$</tspan>}{whole}
            <tspan fontSize={priceSize * .42} dy={-priceSize * .32}>,{cents}</tspan>
          </text>
          <text x="300" y={descriptionLines.length > 0 ? 790 : 808} textAnchor="middle" className="minimal-ink" fontSize="16">{data.unit}</text>
        </>}
        <text x="300" y="830" textAnchor="middle" className="minimal-ink" fontSize="14">Duas placas em uma folha A4</text>
      </svg>;
  }
  
  // Single sign layout
  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" role="img" aria-label={`Placa simples: ${data.product}, R$ ${data.price}`} className={`offer-sign minimal-sign ${data.colorMode === 'monochrome' ? 'sign-monochrome' : ''} ${miniature ? 'sign-miniature' : ''}`}>
    <rect width="600" height="400" className="minimal-paper" />
    {!miniature && <>
      {productLines.map((line, index) => <text key={`product-${index}`} x="300" y={70 + index * (fontSize + 6)} textAnchor="middle" className="minimal-ink minimal-product" fontSize={fontSize}>{line}</text>)}
      {descriptionLines.map((line, index) => <text key={`desc-${index}`} x="300" y={150 + index * (descSize + 4)} textAnchor="middle" className="minimal-ink" fontSize={descSize}>{line}</text>)}
      <text x="300" y={descriptionLines.length > 0 ? 330 : 348} textAnchor="middle" className="minimal-ink minimal-price" fontSize={priceSize}>
        {!hideCurrency && <tspan fontSize={priceSize * .32}>R$</tspan>}{whole}
        <tspan fontSize={priceSize * .42} dy={-priceSize * .32}>,{cents}</tspan>
      </text>
      <text x="300" y={descriptionLines.length > 0 ? 370 : 386} textAnchor="middle" className="minimal-ink" fontSize="16">{data.unit}</text>
    </>}
  </svg>;
}