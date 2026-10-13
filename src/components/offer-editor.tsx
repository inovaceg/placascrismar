import { useRef, useState } from 'react';
import { ArrowDownToLine, Check, ChevronDown, ChevronRight, CircleHelp, FilePlus2, Image, Maximize, Minus, Plus, Printer, Tag, Type, Palette, Contrast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { OfferSign } from '@/components/offer-sign';
import { BulkOfferSheet } from '@/components/bulk-offer-sheet';
import { initialOffer, signSizes, type OfferSignData, type SignSize, type SignModel } from '@/lib/offer-sign';

export function OfferEditor() {
  const [data, setData] = useState<OfferSignData>(initialOffer);
  const [zoom, setZoom] = useState(100);
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const [help, setHelp] = useState(false);
  const [section, setSection] = useState<'single' | 'sheet'>('single');
  const svgRef = useRef<SVGSVGElement>(null);
  const size = signSizes[data.size];
  function update<K extends keyof OfferSignData>(key: K, value: OfferSignData[K]) { setData(current => ({ ...current, [key]: value })); setNotice(''); }
  function reset() { if (window.confirm('Começar uma nova placa? As alterações atuais serão descartadas.')) { setData(initialOffer); setNotice('Nova placa criada.'); } }
  async function download() {
    const svg = svgRef.current;
    if (!svg) return;
    setExporting(true);
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      const originals = [svg, ...Array.from(svg.querySelectorAll('*'))];
      const copies = [clone, ...Array.from(clone.querySelectorAll('*'))];
      originals.forEach((element, index) => {
        const copy = copies[index];
        if (!copy) return;
        const computed = getComputedStyle(element);
        for (const property of ['font-family', 'font-weight', 'font-style', 'fill', 'stroke', 'stroke-width']) {
          copy.setAttribute(property, computed.getPropertyValue(property));
        }
      });
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = Array.from(document.styleSheets).flatMap(sheet => { try { return Array.from(sheet.cssRules).filter(rule => rule.cssText.includes('sign-')).map(rule => rule.cssText); } catch { return []; } }).join('\n');
      clone.prepend(style);
      clone.setAttribute('width', String(Math.round(size.width / 25.4 * 300)));
      clone.setAttribute('height', String(Math.round(size.height / 25.4 * 300)));
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
      try {
        const image = new window.Image();
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('image')); image.src = url; });
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas');
        ctx.drawImage(image, 0, 0);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('export')), 'image/png'));
        const output = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = output; link.download = `oferta-${data.product.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${size.format}${data.colorMode === 'monochrome' ? '-preto-e-branco' : ''}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(output), 2000);
        setNotice('Imagem baixada com sucesso.');
      } finally { URL.revokeObjectURL(url); }
    } catch { setNotice('Não foi possível baixar. Tente novamente.'); }
    finally { setExporting(false); }
  }
  function print() {
    const style = document.createElement('style'); style.textContent = `@page { size: ${size.width}mm ${size.height}mm; margin: 0; }`; document.head.appendChild(style); window.print(); style.remove();
  }
  return <div className="editor-app">
    <header className="app-header">
      <a href="/" className="brand" aria-label="Ofertou, início"><span className="brand-symbol"><Tag size={22} strokeWidth={2.4} /></span>ofertou<span className="brand-dot">.</span></a>
      <span className="header-divider" /><span className="studio-label">Estúdio de ofertas</span>
      <div className="header-right"><span className="session-badge"><span /> Edição livre</span><Button variant="ghost" size="icon" aria-label="Ajuda" title="Ajuda" onClick={() => setHelp(!help)}><CircleHelp /></Button></div>
    </header>
    <main className="main-shell">
      <div className="section-tabs" role="tablist" aria-label="Tipo de criação"><button className={section === 'single' ? 'section-tab active' : 'section-tab'} onClick={() => setSection('single')} role="tab" aria-selected={section === 'single'}>Placa individual</button><button className={section === 'sheet' ? 'section-tab active' : 'section-tab'} onClick={() => setSection('sheet')} role="tab" aria-selected={section === 'sheet'}>Folha com 16 placas</button></div>
      {section === 'sheet' ? <BulkOfferSheet /> : <>
      <div className="page-heading"><div><div className="breadcrumb">Estúdio <ChevronRight size={12} /> Nova placa</div><h1>Criar placa de oferta</h1></div><Button variant="outline" onClick={reset}><FilePlus2 />Nova placa</Button></div>
      {help && <div className="help-banner">Edite os dados do produto e escolha o tamanho. Baixe a imagem ou imprima em escala de 100%. Pequena 6×4: 6 × 4 cm; pequena: A6; média: A5; grande: A4.</div>}
      <div className="workspace">
        <aside className="settings-panel">
          <section className="settings-section"><h2><span className="step-number">1</span> Escolha o modelo</h2>
          <div className="color-mode-options" role="group" aria-label="Cor da placa">
            <Button variant={data.colorMode === 'color' ? 'default' : 'outline'} aria-pressed={data.colorMode === 'color'} onClick={() => update('colorMode', 'color')}><Palette />Colorido</Button>
            <Button variant={data.colorMode === 'monochrome' ? 'default' : 'outline'} aria-pressed={data.colorMode === 'monochrome'} onClick={() => update('colorMode', 'monochrome')}><Contrast />Preto e branco</Button>
          </div><div className="model-grid">
            {(['classic', 'hot'] as SignModel[]).map(model => <Button key={model} variant="model" className={data.model === model ? 'model-selected' : ''} onClick={() => update('model', model)} aria-pressed={data.model === model}><span className="model-image"><OfferSign data={{ ...data, model }} miniature /></span><span className="model-name">{model === 'classic' ? 'Oferta clássica' : 'Oferta quente'}{data.model === model && <span className="model-check"><Check size={11} /></span>}</span></Button>)}
          </div></section>
          <section className="settings-section"><h2><span className="step-number">2</span> Dados do produto</h2>
            <label className="field-label" htmlFor="product">Nome do produto</label><div className="input-wrap"><Type size={16} /><input id="product" value={data.product} maxLength={64} onChange={e => update('product', e.target.value)} placeholder="Ex.: Arroz branco" /></div>
            <label className="field-label" htmlFor="description">Descrição <span>opcional</span></label><input className="editor-input" id="description" value={data.description} maxLength={90} onChange={e => update('description', e.target.value)} placeholder="Ex.: Pacote de 5 kg" />
            <div className="fields-row"><div><label className="field-label" htmlFor="price">Preço da oferta</label><div className="input-wrap price-input"><span>R$</span><input id="price" inputMode="decimal" value={data.price} maxLength={10} onChange={e => { if (/^[\d.,]*$/.test(e.target.value)) update('price', e.target.value); }} /></div></div><div><label className="field-label" htmlFor="unit">Unidade</label><div className="select-wrap"><select id="unit" value={data.unit} onChange={e => update('unit', e.target.value)}><option value="unidade">Unidade</option><option value="kg">Quilo (kg)</option><option value="litro">Litro</option><option value="pacote">Pacote</option><option value="caixa">Caixa</option></select><ChevronDown size={14} /></div></div></div>
            <label className="field-label" htmlFor="previous">Preço anterior <span>opcional</span></label><div className="input-wrap"><span className="currency-prefix">R$</span><input id="previous" inputMode="decimal" value={data.previousPrice} maxLength={10} onChange={e => { if (/^[\d.,]*$/.test(e.target.value)) update('previousPrice', e.target.value); }} /></div>
          </section>
          <section className="settings-section"><h2><span className="step-number">3</span> Tamanho da placa</h2><div className="size-options">{(Object.keys(signSizes) as SignSize[]).map(key => <Button key={key} variant="sizeOption" className={data.size === key ? 'size-selected' : ''} aria-pressed={data.size === key} onClick={() => update('size', key)}><span className={`paper-icon paper-${key}`} /><strong>{signSizes[key].label}</strong><span>{signSizes[key].format}</span></Button>)}</div><p className="dimension-note">{size.format === '6 × 4 cm' ? size.format : `${size.width} × ${size.height} mm`} <span>•</span> {size.width > size.height ? 'Paisagem' : 'Retrato'}</p></section>
          <section className="settings-section footer-section"><div className="footer-toggle"><label htmlFor="footer-toggle">Mensagem no rodapé</label><Switch id="footer-toggle" checked={data.showFooter} onCheckedChange={checked => update('showFooter', checked)} /></div>{data.showFooter && <textarea aria-label="Mensagem no rodapé" className="editor-input" rows={2} maxLength={100} value={data.footer} onChange={e => update('footer', e.target.value)} />}</section>
        </aside>
        <section className="preview-panel" aria-label="Pré-visualização da placa"><div className="preview-heading"><div><span className="preview-status" />Pré-visualização</div><span>{size.format} <span className="preview-separator">/</span> {size.width} × {size.height} mm</span></div>
          <div className="canvas-area" data-zoom={zoom}><div className={`paper-preview paper-preview-${data.size}`}><OfferSign ref={svgRef} data={data} /></div><div className="zoom-controls"><Button variant="ghost" size="icon" aria-label="Diminuir zoom" title="Diminuir zoom" disabled={zoom <= 75} onClick={() => setZoom(v => v - 25)}><Minus /></Button><span>{zoom}%</span><Button variant="ghost" size="icon" aria-label="Aumentar zoom" title="Aumentar zoom" disabled={zoom >= 125} onClick={() => setZoom(v => v + 25)}><Plus /></Button><span className="zoom-divider" /><Button variant="ghost" size="icon" aria-label="Restaurar zoom" title="Restaurar zoom" onClick={() => setZoom(100)}><Maximize /></Button></div></div>
          <div className="export-bar"><div className="export-info"><span className="export-icon"><Image size={18} /></span><div><strong>Pronta para chamar atenção</strong><span>Alta resolução · 300 dpi</span></div></div><div className="export-actions"><Button variant="outline" onClick={print}><Printer />Imprimir</Button><Button onClick={download} disabled={exporting}><ArrowDownToLine />{exporting ? 'Baixando…' : 'Baixar placa'}</Button></div></div>
          <div className="notice" role="status">{notice || <><Check size={13} /> Sua placa é atualizada em tempo real</>}</div>
        </section>
      </div>
      </>}
      <footer className="app-footer"><span>Feito para destacar suas melhores ofertas.</span><span><Tag size={13} /> ofertou.</span></footer>
    </main>
  </div>;
}