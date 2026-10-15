import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Barcode, Camera, CirclePlus, Minus, Plus, Search, Trash2, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { loadCatalog } from '@/lib/catalog-store';
import type { CatalogItem } from '@/lib/excel-catalog';

type CartLine = { barcode: string; reducedCode: string; description: string; unitPrice: number; quantity: number };
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

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function PointOfSale() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Carregando catálogo de produtos…');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('Aponte a câmera para o código de barras.');
  const barcodeRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const productByBarcode = useMemo(() => new Map(catalog.map(item => [cleanCode(item.barcode), item])), [catalog]);
  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const totalUnits = cart.reduce((sum, line) => sum + line.quantity, 0);

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
      <div className="pos-title"><span className="pos-title-icon"><Barcode size={24} /></span><div><h1>Ponto de venda</h1><p>Leia o código, informe as unidades e acompanhe o total da venda.</p></div></div>
      <div className="pos-workspace">
        <section className="pos-add-card">
          <div className="pos-section-heading"><strong>Adicionar produto</strong><span>Leitor de código ou digitação</span></div>
          <form className="pos-add-form" onSubmit={event => { event.preventDefault(); lookupProduct(code); }}>
            <label htmlFor="pos-barcode">Código de barras</label>
            <div className="pos-barcode-field"><input ref={barcodeRef} id="pos-barcode" value={code} onChange={event => setCode(event.target.value)} placeholder="Leia ou digite o código" autoComplete="off" autoFocus /><Button type="submit" variant="outline" disabled={loading || !code.trim()}><Search />Consultar</Button></div>
          </form>
          <Button type="button" variant="outline" className="pos-camera-button" disabled={loading} onClick={() => { setScannerMessage('Aponte a câmera para o código de barras.'); setScannerOpen(true); }}><Camera />Ler com a câmera</Button>
          {selectedProduct && <div className="pos-selected-product"><span className="pos-result-label">Produto localizado</span><strong>{selectedProduct.description || 'Produto sem descrição'}</strong><span>Preço unitário <b>{currency.format(parsePrice(selectedProduct.price) ?? 0)}</b></span><label htmlFor="pos-quantity">Quantidade (unidades)</label><div className="pos-quantity-row"><input id="pos-quantity" type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={event => setQuantity(event.target.value)} /><Button type="button" onClick={addProduct}><CirclePlus />Adicionar à venda</Button></div></div>}
          <p className="pos-message" role="status">{message}</p>
        </section>
        <section className="pos-cart">
          <div className="pos-section-heading pos-cart-heading"><div><strong>Itens da venda</strong><span>{cart.length} {cart.length === 1 ? 'produto' : 'produtos'} · {totalUnits} {totalUnits === 1 ? 'unidade' : 'unidades'}</span></div><Button variant="outline" onClick={clearSale} disabled={!cart.length}><Trash2 />Limpar venda</Button></div>
          {cart.length ? <div className="pos-cart-lines">{cart.map(line => <article className="pos-cart-line" key={line.barcode}><div className="pos-cart-description"><strong>{line.description || 'Produto sem descrição'}</strong><span>Cód. {line.reducedCode || line.barcode} · {currency.format(line.unitPrice)} / un.</span></div><div className="pos-line-quantity"><button type="button" aria-label={`Diminuir quantidade de ${line.description}`} onClick={() => adjustQuantity(line.barcode, -1)}><Minus size={15} /></button><strong>{line.quantity}</strong><button type="button" aria-label={`Aumentar quantidade de ${line.description}`} onClick={() => adjustQuantity(line.barcode, 1)}><Plus size={15} /></button></div><strong className="pos-line-total">{currency.format(line.unitPrice * line.quantity)}</strong><button className="pos-remove-line" type="button" aria-label={`Remover ${line.description}`} onClick={() => setCart(current => current.filter(item => item.barcode !== line.barcode))}><X size={16} /></button></article>)}</div> : <div className="pos-empty"><Barcode size={28} /><strong>Venda sem itens</strong><span>Consulte ou leia um produto para começar.</span></div>}
          <div className="pos-grand-total"><span>Total da venda</span><strong>{currency.format(total)}</strong></div>
        </section>
      </div>
    </main>
    {scannerOpen && <div className="barcode-scanner-backdrop" onClick={() => setScannerOpen(false)}><div className="barcode-scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="pos-scanner-title" onClick={event => event.stopPropagation()}><div className="barcode-scanner-heading"><div><strong id="pos-scanner-title">Ler código de barras</strong><span>{scannerMessage}</span></div><button type="button" className="inventory-remove" aria-label="Fechar leitor" onClick={() => setScannerOpen(false)}><X size={19} /></button></div><video ref={videoRef} className="barcode-scanner-video" autoPlay muted playsInline /><p className="barcode-scanner-help">Mantenha o código dentro da imagem e aguarde a leitura.</p><Button type="button" variant="outline" onClick={() => setScannerOpen(false)}>Fechar câmera</Button></div></div>}
  </div>;
}

export default PointOfSale;
