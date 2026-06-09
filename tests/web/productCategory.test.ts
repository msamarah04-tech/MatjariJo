import { describe, expect, it } from 'vitest';
import {
  getProductCategorySchema,
  normalizeCategoryAttributes,
  publicAttributes,
  validateCategoryAttributes,
  validateProductDetails,
} from '@shared/productCategorySchemas';
import { attributesToForm, categoryDetailRows, formToAttributes } from '@/lib/productCategory';

describe('shared product category registry', () => {
  it('exposes every spec category', () => {
    for (const key of ['clothing', 'shoes', 'electronics', 'mobile_phones', 'beauty', 'food', 'home', 'handmade', 'books', 'services']) {
      expect(getProductCategorySchema(key), key).toBeTruthy();
    }
    expect(getProductCategorySchema('not-real')).toBeUndefined();
  });

  it('flags missing required attributes', () => {
    const errors = validateCategoryAttributes('clothing', { material: 'Linen' });
    expect(errors.some((e) => e.key === 'gender')).toBe(true);
    expect(validateCategoryAttributes('clothing', { gender: 'men' })).toEqual([]);
  });

  it('rejects out-of-vocabulary select and multi_select values', () => {
    expect(validateCategoryAttributes('clothing', { gender: 'martian' }).some((e) => e.key === 'gender')).toBe(true);
    expect(validateCategoryAttributes('food', { allergens: ['gluten', 'uranium'] }).some((e) => e.key === 'allergens')).toBe(true);
    expect(validateCategoryAttributes('food', { allergens: ['gluten', 'nuts'] })).toEqual([]);
  });

  it('enforces numeric ranges', () => {
    expect(validateCategoryAttributes('mobile_phones', { brand: 'X', model: 'Y', storage: '128GB', color: 'Black', condition: 'new', batteryHealth: 150 }).some((e) => e.key === 'batteryHealth')).toBe(true);
  });

  it('normalizes away unknown keys and coerces types', () => {
    const normalized = normalizeCategoryAttributes('home', { material: 'Oak', assemblyRequired: 'yes', weight: '12.5', junk: 'x' });
    expect(normalized.material).toBe('Oak');
    expect(normalized.assemblyRequired).toBe(true);
    expect(normalized.weight).toBe(12.5);
    expect(normalized.junk).toBeUndefined();
  });

  it('validateProductDetails catches variant/option mismatches', () => {
    const details = {
      options: [{ name: 'Size', values: [{ value: 'S' }, { value: 'M' }] }],
      variants: [{ title: 'XL', selections: { Size: 'XL' } }],
    };
    expect(validateProductDetails('clothing', { ...details, attributes: { gender: 'men' } }).some((e) => e.key === 'variants')).toBe(true);
  });

  it('publicAttributes strips admin-only fields', () => {
    const out = publicAttributes('home', { material: 'Oak', supplierName: 'Acme' });
    expect(out.material).toBe('Oak');
    expect(out.supplierName).toBeUndefined();
  });
});

describe('frontend category adapters', () => {
  it('round-trips form values through attributes', () => {
    const form = attributesToForm('clothing', { gender: 'men', availableSizes: ['S', 'M'] });
    expect(form.gender).toBe('men');
    expect(form.availableSizes).toEqual(['S', 'M']);
    const back = formToAttributes('clothing', form);
    expect(back.gender).toBe('men');
    expect(back.availableSizes).toEqual(['S', 'M']);
  });

  it('builds localized public detail rows and hides admin-only', () => {
    const rowsEn = categoryDetailRows('home', { material: 'Oak', assemblyRequired: true, supplierName: 'Acme' }, 'en');
    const labels = rowsEn.map((r) => r[0]);
    expect(labels).toContain('Material');
    expect(labels).not.toContain('Supplier (internal)');
    const assembly = rowsEn.find((r) => r[0] === 'Assembly required');
    expect(assembly?.[1]).toBe('Yes');

    const rowsAr = categoryDetailRows('home', { assemblyRequired: true }, 'ar');
    expect(rowsAr.find((r) => r[0] === 'يتطلب التركيب')?.[1]).toBe('نعم');
  });
});
