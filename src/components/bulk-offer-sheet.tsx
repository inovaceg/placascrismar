import { useState } from 'react';
import { Printer, RotateCcw } from 'lucide-react';
import { OfferSign } from '@/components/offer-sign';
import { Button } from '@/components/ui/button';
import { initialOffer, type OfferSignData } from '@/lib/offer-sign';

const emptyItem = (): Pick<OfferSignData, 'product' | 'description' | 'price'> => ({ product: '', description: '', price: '' });

export function BulkOfferSheet() {
  const [items, setItems] = useState(() => Array.from({ length: 16 }, emptyItem));
  const [descriptionFontSize, setDescriptionFontSize] = useState(18);
  function update(index: number, key: 'product' | 'description' | 'price', value: string) {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }
  function reset() { setItems(Array.from({ length: 16 }, emptyItem)); }
  return <div className="bulk-page">
    <div className="bulk-heading"><div><span className="breadcrumb">Estúdio <span>›</span> Folha de preços</span><h1>Preencher folha de preços</h1><p>Monte uma folha A4 com 16 placas pequenas, organizadas em 4 colunas × 4 linhas.</p></div><div className="bulk-actions"><Button variant="outline" onClick={reset}><RotateCcw />Limpar tudo</Button><Button onClick={() => window.print()}><Printer />Imprimir folha A4</Button></div></div>
    <div className="bulk-layout"><section className="bulk-form"><div className="bulk-form-header"><div><strong>Produtos e preços</strong><span>Preencha os campos que quiser</span></div><label className="bulk-font-choice">Fonte da descrição<select value={descriptionFontSize} onChange={event => setDescriptionFontSize(Number(event.target.value))}><option value="14">Pequena</option><option value="18">Média</option><option value="22">Grande</option></select></label></div><div className="bulk-fields">{items.map((item, index) => <div className="bulk-field" key={index}><span className="bulk-number">{String(index + 1).padStart(2, '0')}</span><div><label htmlFor={`bulk-product-${index}`}>Produto</label><input id={`bulk-product-${index}`} value={item.product} maxLength={32} onChange={event => update(index, 'product', event.target.value)} placeholder="Ex.: Arroz" /><label htmlFor={`bulk-description-${index}`}>Descrição</label><input id={`bulk-description-${index}`} value={item.description} maxLength={42} onChange={event => update(index, 'description', event.target.value)} placeholder="Opcional" /><label htmlFor={`bulk-price-${index}`}>Preço</label><div className="bulk-price"><span>R$</span><input id={`bulk-price-${index}`} inputMode="decimal" value={item.price} maxLength={10} onChange={event => { if (/^[\d.,]*$/.test(event.target.value)) update(index, 'price', event.target.value); }} placeholder="0,00" /></div></div></div>)}</div></section><section className="sheet-preview"><div className="sheet-preview-heading"><strong>Pré-visualização da folha</strong><span>A4 · 4 × 4 placas</span></div><div className="a4-sheet">{items.map((item, index) => <div className="sheet-cell" key={index}><OfferSign data={{ ...initialOffer, ...item, size: 'compact' }} hideCurrency descriptionFontSize={descriptionFontSize} /></div>)}</div></section></div>
  </div>;
}
