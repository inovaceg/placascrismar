import { createFileRoute } from "@tanstack/react-router";
import { OfferEditor } from '@/components/offer-editor';

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'Ofertou — Criador de placas de ofertas' },
    { name: 'description', content: 'Crie placas de ofertas com descrição e preço personalizados, em tamanhos pequeno, médio e grande.' },
    { property: 'og:title', content: 'Ofertou — Criador de placas de ofertas' },
    { property: 'og:description', content: 'Personalize suas ofertas e baixe ou imprima placas para destacar seus produtos.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: OfferEditor,
});
