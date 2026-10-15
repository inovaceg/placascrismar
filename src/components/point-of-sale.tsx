import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Barcode, Camera, Check, CirclePlus, FileDown, Minus, Pencil, Plus, Printer, Search, Trash2, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { PosReceipt, type PosReceiptData } from '@/components/pos-receipt';
import { loadCatalog } from '@/lib/catalog-store';
import { closePosDay, loadDailyReport, paymentMethods, savePosSale, type PaymentMethod, type PosDailyReport } from '@/lib/pos-store';
import type { CatalogItem } from '@/lib/excel-catalog';

type CartLine = { barcode: string; reducedCode: string; description: string; unitPrice: number; quantity: number };
type PaymentDraft = { method: PaymentMethod; amount: string; receivedAmount: string };
type DetectedCode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<DetectedCode[]> };

function cleanCode(value: string) {
  return value.trim().replace(/\s/g, '');
}

function parsePrice(value: string) {
  const compact = value.trim().replace(/\s/g, '');
  const normalized = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact;
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function localBusinessDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function moneyInput(valueInCents: number) {
  return (valueInCents / 100).toFixed(2).replace('.', ',');
}

function priceInCents(value: string) {
  const price = parsePrice(value);
  return price === null ? null : Math.round(price * 100);
}


const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function PointOfSale() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Carregando catálogo de produtos…');
  const [view, setView] = useState<'sale' | 'daily'>('sale');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<PosReceiptData | null>(null);
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const [discount, setDiscount] = useState('0,00');
  const [savingSale, setSavingSale] = useState(false);
  const [dailyDate, setDailyDate] = useState(localBusinessDate);
  const [dailyReport, setDailyReport] = useState<PosDailyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [closingDay, setClosingDay] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('Aponte a câmera para o código de barras.');
  const barcodeRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const productByBarcode = useMemo(() => new Map(catalog.map(item => [cleanCode(item.barcode), item])), [catalog]);
  const totalCents = cart.reduce((sum, line) => sum + Math.round(line.unitPrice * 100) * line.quantity, 0);
  const total = totalCents / 100;
  const discountCents = priceInCents(discount);
  const validDiscount = discountCents !== null && discountCents < totalCents;
  const saleTotalCents = validDiscount ? totalCents - discountCents : totalCents;
  const totalUnits = cart.reduce((sum, line) => sum + line.quantity, 0);
  const paymentCents = payments.reduce((sum, payment) => sum + (priceInCents(payment.amount) ?? 0), 0);
  const cashPaymentsValid = payments.every(payment => payment.method !== 'cash' || (priceInCents(payment.receivedAmount) ?? -1) >= (priceInCents(payment.amount) ?? 0));
  const canCompleteSale = validDiscount && payments.length > 0 && payments.every(payment => (priceInCents(payment.amount) ?? 0) > 0) && paymentCents === saleTotalCents && cashPaymentsValid;

  useEffect(() => {
    if (selectedProduct) {
      quantityRef.current?.focus();
      quantityRef.current?.select();
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (!checkoutOpen) return;
    const discountInput = document.getElementById('pos-discount') as HTMLInputElement | null;
    discountInput?.focus();
    discountInput?.select();
  }, [checkoutOpen]);

  useEffect(() => {
    let active = true;
    loadCatalog().then(items => {
      if (!active) return;
      setCatalog(items);
      setMessage(items.length ? `${items.length.toLocaleString('pt-BR')} produtos carregados.` : 'Catálogo vazio. Importe a planilha na Folha de preços antes de iniciar as vendas.');
    }).catch(() => {
      if (active) setMessage('Não foi possível carregar o catálogo. Verifique a conexão e tente novamente.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (view !== 'daily') return;
    let active = true;
    setReportLoading(true);
    setReportMessage('');
    loadDailyReport(dailyDate).then(report => {
      if (active) setDailyReport(report);
    }).catch(() => {
      if (active) setReportMessage('Não foi possível carregar o relatório diário. Confira sua conexão e tente novamente.');
    }).finally(() => {
      if (active) setReportLoading(false);
    });
    return () => { active = false; };
  }, [view, dailyDate]);

  useEffect(() => {
    if (!receipt) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [receipt]);

  useEffect(() => {
    if (!scannerOpen) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerMessage('A câmera exige acesso por uma página segura (HTTPS).');
      return () => {};
    }
    const Detector = (window as Window & { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    if (!Detector) {
      setScannerMessage('Este navegador não oferece leitura por câmera. Digite o código manualmente.');
      return () => {};
    }
    let detector: BarcodeDetectorLike;
    try {
      detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'] });
    } catch {
      setScannerMessage('Este navegador não oferece os formatos de código usados pelos produtos.');
      return () => {};
    }
    setScannerMessage('Solicitando acesso à câmera…');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(async camera => {
      stream = camera;
      if (cancelled) {
        camera.getTracks().forEach(track => track.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) {
        camera.getTracks().forEach(track => track.stop());
        return;
      }
      video.srcObject = camera;
      await video.play();
      if (cancelled) return;
      setScannerMessage('Aponte a câmera para o código de barras.');
      const scan = async () => {
        if (cancelled || !videoRef.current) return;
        try {
          const [result] = await detector.detect(videoRef.current);
          if (result?.rawValue) {
            const scanned = cleanCode(result.rawValue);
            setCode(scanned);
            const found = productByBarcode.get(scanned);
            setSelectedProduct(found ?? null);
            setQuantity('1');
            setMessage(found ? 'Produto localizado. Informe a quantidade e adicione à venda.' : 'Código não encontrado no catálogo importado.');
            setScannerOpen(false);
            return;
          }
        } catch {
          setScannerMessage('Não foi possível ler o código. Ajuste o foco e tente novamente.');
        }
        if (!cancelled) frame = requestAnimationFrame(scan);
      };
      frame = requestAnimationFrame(scan);
    }).catch(() => {
      stream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      if (!cancelled) setScannerMessage('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [scannerOpen, productByBarcode]);

  function lookupProduct(value: string) {
    const product = productByBarcode.get(cleanCode(value));
    setSelectedProduct(product ?? null);
    setQuantity('1');
    setMessage(product ? 'Produto localizado. Informe a quantidade e adicione à venda.' : value ? 'Código não encontrado no catálogo importado.' : 'Digite ou leia o código de barras do produto.');
  }

  function addProduct() {
    const product = selectedProduct;
    if (!product) return;
    const amount = Number(quantity);
    const unitPrice = parsePrice(product.price);
    if (!Number.isInteger(amount) || amount < 1) {
      setMessage('Informe uma quantidade inteira maior que zero.');
      return;
    }
    if (unitPrice === null) {
      setMessage('Este produto não possui um preço válido no catálogo.');
      return;
    }
    setCart(current => {
      const found = current.findIndex(line => line.barcode === product.barcode);
      if (found < 0) return [...current, { barcode: product.barcode, reducedCode: product.reducedCode, description: product.description, unitPrice, quantity: amount }];
      return current.map((line, index) => index === found ? { ...line, quantity: line.quantity + amount } : line);
    });
    setMessage(`${product.description || 'Produto'} adicionado à venda.`);
    setCode('');
    setQuantity('1');
    setSelectedProduct(null);
    barcodeRef.current?.focus();
  }

  function adjustQuantity(barcode: string, change: number) {
    setCart(current => current.flatMap(line => {
      if (line.barcode !== barcode) return [line];
      const nextQuantity = line.quantity + change;
      return nextQuantity > 0 ? [{ ...line, quantity: nextQuantity }] : [];
    }));
  }

  function startEditing(line: CartLine) {
    setEditingBarcode(line.barcode);
    setEditQuantity(String(line.quantity));
  }

  function saveQuantity(barcode: string) {
    const nextQuantity = Number(editQuantity);
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      setMessage('A quantidade precisa ser um número inteiro maior que zero.');
      return;
    }
    setCart(current => current.map(line => line.barcode === barcode ? { ...line, quantity: nextQuantity } : line));
    setEditingBarcode(null);
    setMessage('Quantidade do item atualizada.');
  }

  function openCheckout() {
    setDiscount('0,00');
    setPayments([{ method: 'cash', amount: moneyInput(totalCents), receivedAmount: '' }]);
    setCheckoutOpen(true);
  }

  function closeReceipt() {
    setReceipt(null);
    window.setTimeout(() => barcodeRef.current?.focus(), 0);
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (checkoutOpen && event.key === 'Enter') {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLSelectElement) {
          event.preventDefault();
          const form = active.closest('form');
          const fields = form ? Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input:not(:disabled), select:not(:disabled)')) : [];
          const index = fields.indexOf(active);
          if (index >= 0 && index < fields.length - 1) {
            const nextField = fields[index + 1];
            nextField.focus();
            if (nextField instanceof HTMLInputElement) nextField.select();
          } else if (form && canCompleteSale) form.requestSubmit();
        }
        return;
      }
      if (event.key !== 'F9' || view !== 'sale') return;
      if (receipt) {
        event.preventDefault();
        closeReceipt();
        return;
      }
      if (checkoutOpen) {
        event.preventDefault();
        if (!savingSale && canCompleteSale) {
          document.querySelector<HTMLFormElement>('.pos-checkout-dialog form')?.requestSubmit();
        }
        return;
      }
      if (savingSale || cart.length === 0) return;
      event.preventDefault();
      openCheckout();
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [view, receipt, checkoutOpen, savingSale, cart.length, canCompleteSale, openCheckout, closeReceipt]);

  function addPayment() {
    const remaining = Math.max(0, saleTotalCents - paymentCents);
    setPayments(current => [...current, { method: 'pix', amount: moneyInput(remaining), receivedAmount: '' }]);
  }

  async function completeSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCompleteSale || savingSale || cart.length === 0) return;
    setSavingSale(true);
    try {
      const salePayments = payments.map(payment => {
        const amount = (priceInCents(payment.amount) ?? 0) / 100;
        if (payment.method !== 'cash') return { method: payment.method, amount };
        const receivedAmount = (priceInCents(payment.receivedAmount) ?? 0) / 100;
        return { method: payment.method, amount, receivedAmount, changeAmount: receivedAmount - amount };
      });
      const saved = await savePosSale(localBusinessDate(), cart.map(line => ({
        barcode: line.barcode,
        reducedCode: line.reducedCode,
        description: line.description,
        quantity: line.quantity,
        unitPrice: Math.round(line.unitPrice * 100) / 100,
      })), salePayments, (discountCents ?? 0) / 100);
      setReceipt({
        saleNumber: saved.saleNumber,
        createdAt: new Date().toISOString(),
        items: cart.map(({ barcode, description, quantity, unitPrice }) => ({ barcode, description, quantity, unitPrice })),
        payments: salePayments,
        subtotal: total,
        discount: (discountCents ?? 0) / 100,
        total: saleTotalCents / 100,
      });
      setCart([]);
      setCode('');
      setSelectedProduct(null);
      setQuantity('1');
      setPayments([]);
      setCheckoutOpen(false);
      setMessage(`Cupom nº ${saved.saleNumber} gravado. Pronto para o próximo cupom.`);
      if (view === 'daily' && dailyDate === localBusinessDate()) setDailyReport(await loadDailyReport(dailyDate));
      barcodeRef.current?.focus();
    } catch {
      setMessage('Não foi possível gravar o cupom. Verifique sua conexão; os itens continuam no carrinho para tentar novamente.');
    } finally {
      setSavingSale(false);
    }
  }

  async function closeDay() {
    setClosingDay(true);
    setReportMessage('');
    try {
      await closePosDay(dailyDate);
      setDailyReport(await loadDailyReport(dailyDate));
      setReportMessage('Fechamento do dia gravado com sucesso.');
    } catch {
      setReportMessage('Não foi possível fechar o caixa. Verifique sua conexão e tente novamente.');
    } finally {
      setClosingDay(false);
    }
  }

  function clearSale() {
    setCart([]);
    setCode('');
    setQuantity('1');
    setSelectedProduct(null);
    setMessage('Venda limpa. Pronto para iniciar uma nova venda.');
    barcodeRef.current?.focus();
  }

  return <div className="pos-page">
    <header className="pos-header"><Link to="/" className="pos-back"><ArrowLeft size={18} />Voltar ao estúdio</Link><span className="pos-brand">PDV · Caixa</span><span className="pos-catalog-state">{loading ? 'Carregando catálogo…' : `${catalog.length.toLocaleString('pt-BR')} produtos`}</span></header>
    <main className="pos-main">
      <div className="pos-title"><span className="pos-title-icon"><Barcode size={24} /></span><div><h1>{view === 'sale' ? 'Ponto de venda' : 'Fechamento diário'}</h1><p>{view === 'sale' ? 'Leia o código, informe as unidades e acompanhe o total da venda.' : 'Consulte os cupons e os valores recebidos por forma de pagamento.'}</p></div></div>
      <nav className="pos-tabs" aria-label="PDV"><button type="button" className={view === 'sale' ? 'active' : ''} onClick={() => setView('sale')}>Caixa</button><button type="button" className={view === 'daily' ? 'active' : ''} onClick={() => setView('daily')}>Relatório diário</button></nav>
      {view === 'sale' ? <div className="pos-workspace">
        <section className="pos-add-card">
          <div className="pos-section-heading"><strong>Adicionar produto</strong><span>Leitor de código ou digitação</span></div>
          <form className="pos-add-form" onSubmit={event => { event.preventDefault(); lookupProduct(code); }}>
            <label htmlFor="pos-barcode">Código de barras</label>
            <div className="pos-barcode-field"><input ref={barcodeRef} id="pos-barcode" value={code} onChange={event => setCode(event.target.value)} placeholder="Leia ou digite o código" autoComplete="off" autoFocus /><Button type="submit" variant="outline" disabled={loading || !code.trim()}><Search />Consultar</Button></div>
          </form>
          <Button type="button" variant="outline" className="pos-camera-button" disabled={loading} onClick={() => { setScannerMessage('Aponte a câmera para o código de barras.'); setScannerOpen(true); }}><Camera />Ler com a câmera</Button>
          {selectedProduct && <div className="pos-selected-product"><span className="pos-result-label">Produto localizado</span><strong>{selectedProduct.description || 'Produto sem descrição'}</strong><span>Preço unitário <b>{currency.format(parsePrice(selectedProduct.price) ?? 0)}</b></span><form onSubmit={event => { event.preventDefault(); addProduct(); }}><label htmlFor="pos-quantity">Quantidade (unidades) · Enter para adicionar</label><div className="pos-quantity-row"><input ref={quantityRef} id="pos-quantity" type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={event => setQuantity(event.target.value)} /><Button type="submit"><CirclePlus />Adicionar à venda</Button></div></form></div>}
          <p className="pos-message" role="status">{message}</p>
        </section>
        <section className="pos-cart">
          <div className="pos-section-heading pos-cart-heading"><div><strong>Itens da venda</strong><span>{cart.length} {cart.length === 1 ? 'produto' : 'produtos'} · {totalUnits} {totalUnits === 1 ? 'unidade' : 'unidades'}</span></div><Button variant="outline" onClick={clearSale} disabled={!cart.length}><Trash2 />Limpar venda</Button></div>
          {cart.length ? <div className="pos-cart-lines">{cart.map(line => <article className="pos-cart-line" key={line.barcode}><div className="pos-cart-description"><strong>{line.description || 'Produto sem descrição'}</strong><span>Cód. {line.reducedCode || line.barcode} · {currency.format(line.unitPrice)} / un.</span></div>{editingBarcode === line.barcode ? <form className="pos-edit-quantity" onSubmit={event => { event.preventDefault(); saveQuantity(line.barcode); }}><input aria-label={`Nova quantidade de ${line.description}`} type="number" min="1" step="1" inputMode="numeric" value={editQuantity} onChange={event => setEditQuantity(event.target.value)} autoFocus /><button type="submit" aria-label="Salvar quantidade"><Check size={15} /></button><button type="button" aria-label="Cancelar edição" onClick={() => setEditingBarcode(null)}><X size={15} /></button></form> : <div className="pos-line-quantity"><button type="button" aria-label={`Diminuir quantidade de ${line.description}`} onClick={() => adjustQuantity(line.barcode, -1)}><Minus size={15} /></button><strong>{line.quantity}</strong><button type="button" aria-label={`Aumentar quantidade de ${line.description}`} onClick={() => adjustQuantity(line.barcode, 1)}><Plus size={15} /></button><button type="button" className="pos-edit-quantity-button" aria-label={`Editar quantidade de ${line.description}`} onClick={() => startEditing(line)}><Pencil size={14} /></button></div>}<strong className="pos-line-total">{currency.format(line.unitPrice * line.quantity)}</strong><button className="pos-remove-line" type="button" aria-label={`Excluir ${line.description}`} onClick={() => setCart(current => current.filter(item => item.barcode !== line.barcode))}><Trash2 size={16} /></button></article>)}</div> : <div className="pos-empty"><Barcode size={28} /><strong>Venda sem itens</strong><span>Consulte ou leia um produto para começar.</span></div>}
          <div className="pos-grand-total"><span>Total da venda</span><strong>{currency.format(total)}</strong><Button onClick={openCheckout} disabled={!cart.length}><FileDown />Fechar cupom <kbd>F9</kbd></Button></div>
        </section>
      </div> : <section className="pos-daily-report">
        <div className="pos-report-toolbar"><label>Data do movimento<input type="date" value={dailyDate} onChange={event => setDailyDate(event.target.value)} /></label><Button variant="outline" onClick={() => window.print()} disabled={!dailyReport?.couponCount}><Printer />Imprimir resumo</Button><Button onClick={closeDay} disabled={reportLoading || closingDay}><Check />{closingDay ? 'Fechando…' : dailyReport?.closure ? 'Atualizar fechamento' : 'Fechar caixa do dia'}</Button></div>
        {reportMessage && <p className="pos-report-message" role="status">{reportMessage}</p>}
        {reportLoading ? <div className="pos-empty">Carregando relatório…</div> : dailyReport && <>
          <div className="pos-report-summary"><article><span>Vendas no dia</span><strong>{currency.format(dailyReport.total)}</strong></article><article><span>Cupons emitidos</span><strong>{dailyReport.couponCount}</strong></article><article><span>Unidades vendidas</span><strong>{dailyReport.sales.reduce((sum, sale) => sum + sale.items.reduce((sub, item) => sub + item.quantity, 0), 0)}</strong></article><article><span>Descontos do dia</span><strong>{currency.format(dailyReport.discountTotal)}</strong></article></div>
          <section className="pos-payment-summary"><h2>Totais por forma de pagamento</h2><div>{paymentMethods.map(method => <div key={method.value}><span>{method.label}</span><strong>{currency.format(dailyReport.paymentTotals[method.value] ?? 0)}</strong></div>)}</div></section>
          <section className="pos-best-sellers"><h2>Itens mais vendidos</h2>{dailyReport.bestSellingItems.length ? <div>{dailyReport.bestSellingItems.map((item, index) => <article key={item.barcode}><span className="pos-best-seller-rank">{index + 1}</span><div className="pos-best-seller-name"><strong>{item.description || item.barcode}</strong><small>Código {item.reducedCode || item.barcode}</small></div><strong>{item.quantity} un.</strong><span>{currency.format(item.total)}</span></article>)}</div> : <p>Nenhum item vendido nesta data.</p>}</section>
          {dailyReport.closure && <p className="pos-closed-notice">Fechamento salvo em {new Date(dailyReport.closure.closedAt).toLocaleString('pt-BR')}.</p>}
          <section className="pos-daily-coupons"><h2>Cupons do dia</h2>{dailyReport.sales.length ? dailyReport.sales.map(sale => <details className="pos-coupon" key={sale.id}><summary><span>Cupom #{sale.saleNumber} · {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><strong>{currency.format(sale.total)}</strong></summary><div className="pos-coupon-content"><div className="pos-coupon-lines">{sale.items.map((item, index) => <div key={`${sale.id}-${index}`}><span>{item.quantity} × {item.description || item.barcode}</span><b>{currency.format(item.lineTotal)}</b></div>)}</div><div className="pos-coupon-pricing"><div><span>Subtotal</span><b>{currency.format(sale.subtotal)}</b></div>{sale.discount > 0 && <div><span>Desconto</span><b>- {currency.format(sale.discount)}</b></div>}<div><strong>Total</strong><strong>{currency.format(sale.total)}</strong></div></div><div className="pos-coupon-payments"><strong>Pagamentos</strong>{sale.payments.map((payment, index) => <div key={`${sale.id}-payment-${index}`}><span>{paymentMethods.find(method => method.value === payment.method)?.label ?? payment.method}</span><b>{currency.format(payment.amount)}</b></div>)}</div></div></details>) : <div className="pos-empty"><Barcode size={26} /><strong>Nenhum cupom nesta data</strong></div>}</section>
        </>}
      </section>}
    </main>
    {checkoutOpen && <div className="barcode-scanner-backdrop" onClick={() => !savingSale && setCheckoutOpen(false)}><div className="pos-checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onClick={event => event.stopPropagation()}><div className="barcode-scanner-heading"><div><strong id="checkout-title">Fechar cupom</strong><span>Total a pagar: {currency.format(saleTotalCents / 100)}</span></div><button type="button" className="inventory-remove" aria-label="Cancelar fechamento" onClick={() => setCheckoutOpen(false)} disabled={savingSale}><X size={19} /></button></div><form onSubmit={completeSale}><div className="pos-checkout-totals"><div><span>Subtotal</span><strong>{currency.format(total)}</strong></div><label htmlFor="pos-discount">Desconto no cupom (R$)<input id="pos-discount" inputMode="decimal" value={discount} onChange={event => { const value = event.target.value; if (/^[\d.,]*$/.test(value)) { setDiscount(value); if (payments.length === 1) { const amountCents = priceInCents(value) ?? 0; setPayments(current => current.length === 1 ? [{ ...current[0], amount: moneyInput(Math.max(0, totalCents - amountCents)) }] : current); } } }} /></label><div className="pos-checkout-net"><span>Total com desconto</span><strong>{currency.format(saleTotalCents / 100)}</strong></div></div><div className="pos-payment-rows">{payments.map((payment, index) => { const amountCents = priceInCents(payment.amount) ?? 0; const receivedCents = priceInCents(payment.receivedAmount); return <div className="pos-payment-row" key={index}><label>Forma<select value={payment.method} onChange={event => { const method = event.target.value as PaymentMethod; setPayments(current => current.map((entry, row) => row === index ? { ...entry, method, receivedAmount: method === 'cash' ? entry.receivedAmount || entry.amount : '' } : entry)); }}>{paymentMethods.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label><label>Valor aplicado<input inputMode="decimal" value={payment.amount} onChange={event => { if (/^[\d.,]*$/.test(event.target.value)) setPayments(current => current.map((entry, row) => row === index ? { ...entry, amount: event.target.value } : entry)); }} /></label><button type="button" className="pos-payment-remove" aria-label="Remover forma de pagamento" disabled={payments.length === 1} onClick={() => setPayments(current => current.filter((_, row) => row !== index))}><Trash2 size={15} /></button>{payment.method === 'cash' && <><label className="pos-cash-received">Valor recebido do cliente<input inputMode="decimal" value={payment.receivedAmount} onChange={event => { if (/^[\d.,]*$/.test(event.target.value)) setPayments(current => current.map((entry, row) => row === index ? { ...entry, receivedAmount: event.target.value } : entry)); }} /></label><div className="pos-cash-change">{receivedCents === null ? 'Informe o valor recebido' : receivedCents < amountCents ? 'Valor recebido insuficiente' : `Troco: ${currency.format((receivedCents - amountCents) / 100)}`}</div></>}</div>; })}</div><Button type="button" variant="outline" className="pos-add-payment" onClick={addPayment}><CirclePlus />Adicionar outra forma</Button><div className="pos-payment-balance"><span>Pago: {currency.format(paymentCents / 100)}</span><strong>{paymentCents === saleTotalCents ? 'Pagamento conferido' : paymentCents > saleTotalCents ? `Excedente: ${currency.format((paymentCents - saleTotalCents) / 100)}` : `Falta: ${currency.format((saleTotalCents - paymentCents) / 100)}`}</strong></div><Button type="submit" className="pos-confirm-sale" disabled={!canCompleteSale || savingSale}>{savingSale ? 'Gravando cupom…' : 'Gravar cupom e iniciar próximo'}</Button></form></div></div>}
    {scannerOpen && <div className="barcode-scanner-backdrop" onClick={() => setScannerOpen(false)}><div className="barcode-scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="pos-scanner-title" onClick={event => event.stopPropagation()}><div className="barcode-scanner-heading"><div><strong id="pos-scanner-title">Ler código de barras</strong><span>{scannerMessage}</span></div><button type="button" className="inventory-remove" aria-label="Fechar leitor" onClick={() => setScannerOpen(false)}><X size={19} /></button></div><video ref={videoRef} className="barcode-scanner-video" autoPlay muted playsInline /><p className="barcode-scanner-help">Mantenha o código dentro da imagem e aguarde a leitura.</p><Button type="button" variant="outline" onClick={() => setScannerOpen(false)}>Fechar câmera</Button></div></div>}
    {receipt && <PosReceipt receipt={receipt} onClose={closeReceipt} />}
  </div>;
}

export default PointOfSale;
