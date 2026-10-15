import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Barcode, Camera, Search, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { loadCatalog } from '@/lib/catalog-store';
import type { CatalogItem } from '@/lib/excel-catalog';

type DetectedCode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<DetectedCode[]> };

function cleanCode(value: string) {
  return value.trim().replace(/\s/g, '');
}

export function PriceLookup() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [code, setCode] = useState('');
  const [product, setProduct] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('Aponte a câmera para o código de barras.');
  const [message, setMessage] = useState('Carregando o cadastro de produtos…');
  const videoRef = useRef<HTMLVideoElement>(null);
  const productByBarcode = useMemo(() => new Map(catalog.map(item => [cleanCode(item.barcode), item])), [catalog]);

  useEffect(() => {
    let active = true;
    loadCatalog().then(items => {
      if (!active) return;
      setCatalog(items);
      setMessage(items.length ? `${items.length.toLocaleString('pt-BR')} produtos prontos para consulta.` : 'Nenhum produto cadastrado. Importe a planilha na guia Folha de preços.');
    }).catch(() => {
      if (active) setMessage('Não foi possível carregar o cadastro de produtos.');
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
      setScannerMessage('Este navegador não oferece leitura de código de barras pela câmera. Digite o código manualmente.');
      return () => {};
    }
    let detector: BarcodeDetectorLike;
    try {
      detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'] });
    } catch {
      setScannerMessage('Os formatos de código não são compatíveis com este navegador.');
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
            setProduct(found ?? null);
            setMessage(found ? 'Produto localizado no cadastro.' : 'Código não encontrado no cadastro importado.');
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

  function showProduct(value: string) {
    const found = productByBarcode.get(cleanCode(value));
    setProduct(found ?? null);
    setMessage(found ? 'Produto localizado no cadastro.' : value ? 'Código não encontrado no cadastro importado.' : `${catalog.length.toLocaleString('pt-BR')} produtos carregados.`);
  }

  return <div className="price-lookup-page">
    <header className="price-lookup-header"><Link to="/" className="price-lookup-back"><ArrowLeft size={18} />Voltar ao estúdio</Link><span>Busca preço</span></header>
    <main className="price-lookup-main">
      <div className="price-lookup-title"><span className="price-lookup-icon"><Barcode size={24} /></span><h1>Busca preço</h1><p>Leia o código do produto com a câmera do celular ou digite o código abaixo.</p></div>
      <section className="price-lookup-card" aria-label="Consulta de preço">
        <form className="price-lookup-form" onSubmit={event => { event.preventDefault(); showProduct(code); }}>
          <label htmlFor="lookup-barcode">Código de barras</label>
          <div className="price-lookup-fields"><input id="lookup-barcode" value={code} onChange={event => setCode(event.target.value)} placeholder="Digite ou leia o código" autoComplete="off" /><Button type="submit" disabled={loading || !code.trim()}><Search />Consultar</Button></div>
        </form>
        <Button type="button" className="price-lookup-camera" variant="outline" disabled={loading} onClick={() => { setScannerMessage('Aponte a câmera para o código de barras.'); setScannerOpen(true); }}><Camera />Ler código com a câmera</Button>
        <p className="price-lookup-message" role="status">{message}</p>
        {product && <div className="price-result" aria-live="polite"><span className="price-result-label">Produto</span><h2>{product.description || 'Produto sem descrição'}</h2><div className="price-result-sale"><span>Preço de venda</span><strong>R$ {product.price || '—'}</strong></div><div className="price-result-codes"><span>Código reduzido: <b>{product.reducedCode || '—'}</b></span><span>Código de barras: <b>{product.barcode}</b></span></div></div>}
      </section>
      <p className="price-lookup-count">{loading ? 'Carregando catálogo…' : `${catalog.length.toLocaleString('pt-BR')} itens no catálogo`}</p>
    </main>
    {scannerOpen && <div className="barcode-scanner-backdrop" onClick={() => setScannerOpen(false)}><div className="barcode-scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="lookup-scanner-title" onClick={event => event.stopPropagation()}><div className="barcode-scanner-heading"><div><strong id="lookup-scanner-title">Ler código de barras</strong><span>{scannerMessage}</span></div><button type="button" className="inventory-remove" aria-label="Fechar leitor" onClick={() => setScannerOpen(false)}><X size={19} /></button></div><video ref={videoRef} className="barcode-scanner-video" autoPlay muted playsInline /><p className="barcode-scanner-help">Mantenha o código dentro da imagem e aguarde a leitura.</p><Button type="button" variant="outline" onClick={() => setScannerOpen(false)}>Fechar câmera</Button></div></div>}
  </div>;
}

export default PriceLookup;
