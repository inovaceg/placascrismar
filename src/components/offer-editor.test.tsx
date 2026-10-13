import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OfferEditor } from './offer-editor';

describe('Offer color modes', () => {
  it('keeps edited product details when switching to black and white and back', () => {
    render(<OfferEditor />);
    const product = screen.getByLabelText('Nome do produto') as HTMLInputElement;
    const price = screen.getByLabelText('Preço da oferta') as HTMLInputElement;
    fireEvent.change(product, { target: { value: 'CAFÉ TORRADO' } });
    fireEvent.change(price, { target: { value: '8,49' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preto e branco' }));
    expect(product.value).toBe('CAFÉ TORRADO');
    expect(price.value).toBe('8,49');
    fireEvent.click(screen.getByRole('button', { name: 'Oferta quente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Colorido' }));
    expect(product.value).toBe('CAFÉ TORRADO');
    expect(price.value).toBe('8,49');
  });
});