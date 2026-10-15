import { createFileRoute } from '@tanstack/react-router';
import { PriceLookup } from '@/components/price-lookup';

export const Route = createFileRoute('/busca-preco')({
  head: () => ({ meta: [
    { title: 'Busca preço — Crismar Placas de Ofertas' },
    { name: 'description', content: 'Consulte o preço de venda de um produto pelo código de barras.' },
  ] }),
  component: PriceLookup,
});
