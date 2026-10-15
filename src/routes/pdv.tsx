import { createFileRoute } from '@tanstack/react-router';
import { PointOfSale } from '@/components/point-of-sale';

export const Route = createFileRoute('/pdv')({
  head: () => ({ meta: [
    { title: 'PDV — Crismar Placas de Ofertas' },
    { name: 'description', content: 'Registre produtos e quantidades e acompanhe o total da venda.' },
  ] }),
  component: PointOfSale,
});
