import { describe, expect, it } from 'vitest';
import { priceParts, signSizes, wrapProduct } from './offer-sign';

describe('Offer sign data', () => {
  it('provides the three requested sizes: small, medium and large', () => {
    expect(Object.keys(signSizes)).toEqual(['small', 'medium', 'large']);
    expect(signSizes.small.width).toBeLessThan(signSizes.medium.width);
    expect(signSizes.medium.width).toBeLessThan(signSizes.large.width);
  });
  it('uses the edited Brazilian product price without losing cents', () => {
    expect(priceParts('8,49')).toEqual(['8', '49']);
    expect(priceParts('1.299,90')).toEqual(['1299', '90']);
  });
  it('keeps the edited product description when splitting its name into lines', () => {
    expect(wrapProduct('Café torrado tradicional').join(' ')).toBe('CAFÉ TORRADO TRADICIONAL');
  });
});