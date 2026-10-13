import { forwardRef } from 'react';
import { type OfferSignData, priceParts, wrapProduct } from '@/lib/offer-sign';

export const OfferSign = forwardRef<SVGSVGElement, { data: OfferSignData; miniature?: boolean }>(function OfferSign({ data, miniature = false }, ref) {
  const [whole, cents] = priceParts(data.price);
  const lines = wrapProduct(data.product || 'SEU PRODUTO');
  const hot = data.model === 'hot';
  const productFont = Math.min(44, 500 / Math.max(...lines.map(line => line.length), 1));
  const priceFont = Math.min(150, 360 / Math.max(whole.length * .57, 1));
  const productStart = hot ? 235 : 210;
  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 848" preserveAspectRatio={data.size === 'compact' ? 'none' : 'xMidYMid meet'} role="img" aria-label={`Placa de oferta: ${data.product}, R$ ${data.price}`} className={`offer-sign ${hot ? 'sign-hot' : 'sign-classic'} ${data.colorMode === 'monochrome' ? 'sign-monochrome' : ''} ${miniature ? 'sign-miniature' : ''} sign-size-${data.size}`}>
    <rect width="600" height="848" className="sign-yellow" />
    {hot ? <>
      <path d="M0 0H600V240C550 277 512 295 466 287C505 250 489 216 481 203C454 248 402 254 370 242C408 208 402 175 391 157C384 211 309 221 230 224C141 226 49 254 0 283Z" className="sign-red sign-flame" />
      <text x="294" y="107" textAnchor="middle" className="sign-white sign-title hot-title" fontSize="88" transform="rotate(-5 294 107)">OFERTA</text>
      <text x="333" y="180" textAnchor="middle" className="sign-white hot-title" fontSize="72" transform="rotate(-5 333 180)">Quente!</text>
      <path d="M69 44L94 19L119 68ZM462 65L487 102L451 115ZM84 138L48 154L68 180Z" className="sign-yellow" />
    </> : <>
      <rect x="23" y="25" width="554" height="147" rx="27" fill="none" className="sign-outline" strokeWidth="5" />
      <rect x="32" y="35" width="536" height="127" rx="20" className="sign-red" />
      <text x="300" y="132" textAnchor="middle" fontSize="104" className="sign-white sign-title">OFERTA</text>
    </>}
    {!miniature && <>
      {lines.map((line, i) => <text key={i} x="300" y={productStart + 58 + i * (productFont + 8)} textAnchor="middle" className="sign-ink sign-product" fontSize={productFont}>{line}</text>)}
      <text x="300" y={productStart + 94 + lines.length * (productFont + 8)} textAnchor="middle" className="sign-ink" fontSize={Math.min(24, 880 / Math.max(data.description.length, 1))}>{data.description}</text>
      {data.previousPrice && <text x="300" y="438" textAnchor="middle" className="sign-ink" fontSize="25">De R$ <tspan textDecoration="line-through">{data.previousPrice}</tspan> por</text>}
      <text x="69" y="510" className="sign-red-text sign-product" fontSize="37">R$</text>
      <text x="300" y="589" textAnchor="middle" className="sign-red-text sign-price" fontSize={priceFont}>{whole}<tspan fontSize={priceFont * .55} dy={-priceFont * .29}>,{cents}</tspan></text>
      <text x="300" y="641" textAnchor="middle" className="sign-ink" fontSize="25">/ {data.unit}</text>
    </>}
    {hot ? <path d="M0 744C100 826 204 829 288 790C380 747 420 706 493 738C535 756 553 774 600 740V848H0Z" className="sign-red" /> : <path d="M0 780C220 792 377 741 600 776V848H0Z" className="sign-red" />}
    {hot && <text x="555" y="813" textAnchor="end" className="sign-yellow-text hot-title" fontSize="37">Aproveite!</text>}
    {!miniature && data.showFooter && <text x="300" y={hot ? 835 : 816} textAnchor="middle" className="sign-white" fontSize={Math.min(15, 840 / Math.max(data.footer.length, 1))}>{data.footer}</text>}
  </svg>;
});