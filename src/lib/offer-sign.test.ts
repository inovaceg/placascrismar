import { describe, expect, it } from 'vitest';
import { priceParts, signSizes, wrapProduct } from './offer-sign';

describe('Offer sign data', () => {
  it('provides the compact 6×4 cm size alongside the standard formats', () => {
    expect(Object.keys(signSizes)).toEqual(['compact', 'small', 'medium', 'large']);
    expect(signSizes.compact).toMatchObject({ width: 60, height: 40 });
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