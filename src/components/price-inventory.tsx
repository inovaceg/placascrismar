import { useEffect, useMemo, useRef, useState } from 'react';
import { Barcode, Download, FileDown, Printer, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadCatalog } from '@/lib/catalog-store';
import type { CatalogItem } from '@/lib/excel-catalog';

type ChangedPrice = { reducedCode: string; barcode: string; description: string; currentPrice: string; newPrice: string };

function normalizedBarcode(value: string) {
  return value.trim().replace(/\s/g, '');
}

function priceNumber(value: string) {
  const compact = value.trim().replace(/\s/g, '');
  const normalized = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function samePrice(first: string, second: string) {
  const firstValue = priceNumber(first);
  const secondValue = priceNumber(second);
  return firstValue !== null && secondValue !== null && firstValue === secondValue;
}

export function PriceInventory() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [changes, setChanges] = useState<ChangedPrice[]>([]);
  const [notice, setNotice] = useState('Carregando produtos do catálogo…');
  const [loading, setLoading] = useState(true);
  const [activeProduct, setActiveProduct] = useState<CatalogItem | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const catalogByBarcode = useMemo(() => new Map(catalog.map(item => [normalizedBarcode(item.barcode), item])), [catalog]);

  useEffect(() => {
    let active = true;
    loadCatalog().then(items => {
      if (!active) return;
      setCatalog(items);
      setNotice(items.length ? `${items.length.toLocaleString('pt-BR')} produtos carregados. Digite ou leia um código de barras.` : 'O catálogo está vazio. Importe primeiro a planilha na guia “Folha com 16 placas”.');
    }).catch(() => {
      if (active) setNotice('Não foi possível carregar o catálogo. Verifique a conexão e tente novamente.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function findProduct(value: string) {
    const item = catalogByBarcode.get(normalizedBarcode(value));
    setActiveProduct(item ?? null);
    setNewPrice('');
    setNotice(item ? 'Produto encontrado. Informe o novo preço para registrar a alteração.' : value.trim() ? 'Código não encontrado no catálogo importado.' : `${catalog.length.toLocaleString('pt-BR')} produtos disponíveis.`);
  }

  function addChange() {
    const item = activeProduct;
    const value = newPrice.trim().replace(/\s/g, '');
    const parsed = priceNumber(value);
    if (!item || parsed === null || parsed < 0 || !/[0-9]/.test(value)) {
      setNotice('Informe um novo preço válido para o produto encontrado.');
      return;
    }
    if (samePrice(item.price, value)) {
      setNotice('O novo preço é igual ao preço atual; nenhuma alteração foi adicionada.');
      return;
    }
    setChanges(current => {
      const existing = current.findIndex(change => normalizedBarcode(change.barcode) === normalizedBarcode(item.barcode));
      const updated = { reducedCode: item.reducedCode, barcode: item.barcode, description: item.description, currentPrice: item.price, newPrice: value };
      if (existing < 0) return [...current, updated];
      return current.map((change, index) => index === existing ? updated : change);
    });
    setNotice(`Novo preço registrado para ${item.description || item.barcode}.`);
    setBarcode('');
    setNewPrice('');
    setActiveProduct(null);
    barcodeRef.current?.focus();
  }

  function removeChange(barcodeToRemove: string) {
    setChanges(current => current.filter(change => normalizedBarcode(change.barcode) !== normalizedBarcode(barcodeToRemove)));
  }

  function exportCsv() {
    const rows = [['Código reduzido', 'Código de barras', 'Produto', 'Preço atual', 'Novo preço'], ...changes.map(change => [change.reducedCode, change.barcode, change.description, change.currentPrice, change.newPrice])];
    const csv = '\uFEFF' + rows.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-alteracao-de-precos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function reset() {
    setChanges([]);
    setBarcode('');
    setNewPrice('');
    setActiveProduct(null);
    setNotice('Inventário reiniciado.');
    barcodeRef.current?.focus();
  }

  return <section className="inventory-page">
    <div className="inventory-heading">
      <div><span className="breadcrumb">Estúdio <span>›</span> Inventário de preços</span><h1>Inventário de preços</h1><p>Consulte o preço cadastrado pelo código de barras e registre os preços que precisam ser alterados.</p></div>
      <div className="inventory-actions"><Button variant="outline" onClick={reset} disabled={!changes.length}><RotateCcw />Reiniciar</Button><Button onClick={() => window.print()} disabled={!changes.length}><Printer />Imprimir relatório</Button></div>
    </div>
    <div className="inventory-status" role="status">{loading && <span className="inventory-loading" />}{notice}</div>
    <div className="inventory-layout">
      <section className="inventory-lookup">
        <div className="inventory-card-heading"><span className="inventory-icon"><Barcode size={19} /></span><div><strong>Consultar produto</strong><span>Digite o código ou leia com o scanner</span></div></div>
        <div className="inventory-form">
          <form onSubmit={event => { event.preventDefault(); findProduct(barcode); }}>
            <label htmlFor="inventory-barcode">Código de barras</label>
            <div className="inventory-search"><input ref={barcodeRef} id="inventory-barcode" value={barcode} onChange={event => setBarcode(event.target.value)} placeholder="Ex.: 7891234567890" autoComplete="off" autoFocus /><Button type="submit" disabled={loading || !barcode.trim()}><Search size={16} />Consultar</Button></div>
          </form>
          {activeProduct && <div className="inventory-product" aria-live="polite"><span>Produto encontrado</span><strong>{activeProduct.description || 'Produto sem descrição'}</strong><div><span>Código</span><b>{activeProduct.barcode}</b></div><div><span>Preço de venda cadastrado</span><b className="inventory-current-price">R$ {activeProduct.price || '—'}</b></div></div>}
          {activeProduct && <form onSubmit={event => { event.preventDefault(); addChange(); }}><label htmlFor="inventory-new-price">Novo preço</label><div className="inventory-new-price"><span>R$</span><input id="inventory-new-price" inputMode="decimal" value={newPrice} onChange={event => { if (/^[\d.,]*$/.test(event.target.value)) setNewPrice(event.target.value); }} placeholder="0,00" autoFocus /><Button type="submit" disabled={!newPrice.trim()}><FileDown size={16} />Registrar preço</Button></div></form>}
        </div>
      </section>
      <section className="inventory-report">
        <div className="inventory-report-heading"><div><strong>Relatório de alterações</strong><span>{changes.length} {changes.length === 1 ? 'produto registrado' : 'produtos registrados'}</span></div>{changes.length > 0 && <Button variant="outline" onClick={exportCsv}><Download size={16} />Exportar CSV</Button>}</div>
        {changes.length ? <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Código reduzido</th><th>Código de barras</th><th>Produto</th><th>Preço atual</th><th>Novo preço</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{changes.map(change => <tr key={change.barcode}><td data-label="Código reduzido">{change.reducedCode || '—'}</td><td data-label="Código de barras">{change.barcode}</td><td data-label="Produto">{change.description || '—'}</td><td data-label="Preço atual">R$ {change.currentPrice || '—'}</td><td data-label="Novo preço" className="inventory-new-value">R$ {change.newPrice}</td><td className="inventory-remove-cell"><button type="button" className="inventory-remove" aria-label={`Remover ${change.description || change.barcode}`} onClick={() => removeChange(change.barcode)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div> : <div className="inventory-empty"><FileDown size={24} /><strong>Nenhum preço registrado ainda</strong><span>Consulte um produto e informe o novo preço. As alterações aparecerão aqui.</span></div>}
      </section>
    </div>
  </section>;
}
