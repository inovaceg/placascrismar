import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Printer, RotateCcw } from 'lucide-react';
import { OfferSign } from '@/components/offer-sign';
import { Button } from '@/components/ui/button';
import { loadCatalog, replaceCatalog } from '@/lib/catalog-store';
import { readExcelCatalog, type CatalogItem } from '@/lib/excel-catalog';
import { initialOffer, type SignModel } from '@/lib/offer-sign';

type BulkItem = { barcode: string; product: string; price: string };
const emptyItem = (): BulkItem => ({ barcode: '', product: '', price: '' });

export function BulkOfferSheet() {
  const [items, setItems] = useState(() => Array.from({ length: 16 }, emptyItem));
  const [colorMode, setColorMode] = useState<'color' | 'monochrome'>('color');
  const [model, setModel] = useState<SignModel>('minimal');
  const [sheetCount, setSheetCount] = useState<9 | 16>(16);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogNotice, setCatalogNotice] = useState('');

  useEffect(() => {
    let active = true;
    loadCatalog().then(loaded => {
      if (!active) return;
      setCatalog(loaded);
      if (loaded.length) setCatalogNotice(`${loaded.length} produtos disponíveis para consulta.`);
    }).catch(() => { if (active) setCatalogNotice('Não foi possível carregar o catálogo salvo.'); });
    return () => { active = false; };
  }, []);

  async function importCatalog(file: File) {
    try {
      const loaded = await readExcelCatalog(file);
      const saved = await replaceCatalog(loaded);
      const available = await loadCatalog();
      setCatalog(available);
      setCatalogNotice(saved ? `${available.length} de ${saved} produtos gravados e disponíveis.` : 'Nenhum produto encontrado. Confira as colunas B, D e F.');
    } catch (error) {
      setCatalog([]);
      setCatalogNotice(error instanceof Error ? `Erro ao importar: ${error.message}` : 'Não foi possível ler este arquivo Excel.');
    }
  }

  function update(index: number, key: keyof BulkItem, value: string) {
    setItems(current => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const match = key === 'barcode' ? catalog.find(entry => entry.barcode === value.trim()) : undefined;
      return match ? { barcode: value, product: match.description, price: match.price } : { ...item, [key]: value };
    }));
  }

  function reset() { setItems(Array.from({ length: 16 }, emptyItem)); }

  return <div className="bulk-page">
    <div className="bulk-heading">
      <div>
        <span className="breadcrumb">Estúdio <span>›</span> Folha de preços</span>
        <h1>Preencher folha de preços</h1>
        <p>Monte uma folha A4 com placas pequenas organizadas em grade.</p>
      </div>
      <div className="bulk-actions">
        <Button variant="outline" asChild><Link to="/inventario">Inventário de preços</Link></Button>
        <Button variant="outline" onClick={reset}><RotateCcw />Limpar tudo</Button>
        <Button onClick={() => window.print()}><Printer />Imprimir folha A4</Button>
      </div>
    </div>
    <div className="bulk-import-notice" role="status">{catalogNotice || (catalog.length ? `${catalog.length} produtos disponíveis para consulta.` : 'Importe o cadastro Excel para preencher pelo código de barras.')}</div>
    <div className="bulk-layout">
      <section className="bulk-form">
        <div className="bulk-form-header">
          <div><strong>Produtos e preços</strong><span>Preencha os campos que quiser</span></div>
          <label className="bulk-import"><span>Importar arquivo Excel</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void importCatalog(file); }} /></label>
          <label className="bulk-font-choice">Quantidade<select value={sheetCount} onChange={event => setSheetCount(Number(event.target.value) as 9 | 16)}><option value="9">9 placas</option><option value="16">16 placas</option></select></label>
          <label className="bulk-font-choice">Modelo<select value={model} onChange={event => setModel(event.target.value as SignModel)}><option value="minimal">Modelo simples</option><option value="classic">Oferta clássica</option></select></label>
          <label className="bulk-font-choice">Cor da folha<select value={colorMode} onChange={event => setColorMode(event.target.value as 'color' | 'monochrome')}><option value="color">Colorido</option><option value="monochrome">Preto e branco</option></select></label>
        </div>
        <div className="bulk-fields">{items.map((item, index) => <div className="bulk-field" key={index}>
          <span className="bulk-number">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <label htmlFor={`bulk-barcode-${index}`}>Código de barras</label>
            <input id={`bulk-barcode-${index}`} value={item.barcode} onChange={event => update(index, 'barcode', event.target.value)} placeholder="Digite o código" />
            <label htmlFor={`bulk-product-${index}`}>Produto</label>
            <input id={`bulk-product-${index}`} value={item.product} maxLength={32} onChange={event => update(index, 'product', event.target.value)} placeholder="Ex.: Arroz" />
            <label htmlFor={`bulk-price-${index}`}>Preço</label>
            <div className="bulk-price"><span>R$</span><input id={`bulk-price-${index}`} inputMode="decimal" value={item.price} maxLength={10} onChange={event => { if (/^[\d.,]*$/.test(event.target.value)) update(index, 'price', event.target.value); }} placeholder="0,00" /></div>
          </div>
        </div>)}</div>
      </section>
      <section className="sheet-preview">
        <div className="sheet-preview-heading"><strong>Pré-visualização da folha</strong><span>{sheetCount === 9 ? 'A4 · 3 × 3 placas' : 'A4 · 4 × 4 placas'}</span></div>
        <div className={`a4-sheet sheet-count-${sheetCount}`}>{items.slice(0, sheetCount).map((item, index) => <div className="sheet-cell" key={index}><OfferSign data={{ ...initialOffer, product: item.product, price: item.price, previousPrice: '', showFooter: false, size: 'compact', colorMode, model }} /></div>)}</div>
      </section>
    </div>
  </div>;
}
