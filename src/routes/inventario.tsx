import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Tag } from 'lucide-react';
import { PriceInventory } from '@/components/price-inventory';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/inventario')({
  head: () => ({ meta: [
    { title: 'Inventário de preços — Crismar Placas de Ofertas' },
    { name: 'description', content: 'Consulte produtos pelo código de barras e gere um relatório de alterações de preços.' },
  ] }),
  component: InventoryRoute,
});

function InventoryRoute() {
  return <div className="editor-app"><header className="app-header"><Link to="/" className="brand" aria-label="Crismar Placas de Ofertas, voltar ao estúdio"><span className="brand-symbol"><Tag size={22} strokeWidth={2.4} /></span>Crismar Placas de Ofertas</Link><span className="header-divider" /><span className="studio-label">Inventário de preços</span><div className="header-right"><Button variant="outline" asChild><Link to="/"><ArrowLeft />Voltar ao estúdio</Link></Button></div></header><main className="main-shell"><PriceInventory /><footer className="app-footer"><span>Inventário de preços</span><span><Tag size={13} /> Crismar Placas de Ofertas</span></footer></main></div>;
}
