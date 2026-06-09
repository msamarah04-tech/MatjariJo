import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/lib/i18n';
import { computeOrderSummary } from '@/lib/checkout';
import { SummaryRows } from '@/routes/storefront/Storefront';
import type { Discount, Product, Store } from '@/lib/types';

const store: Store = {
  id: 'store-1',
  slug: 'amman-shop',
  name: 'Amman Shop',
  tagline: 'COD essentials',
  category: 'Home',
  themeId: 'mono',
  currency: 'JOD',
  taxRateBps: 1600,
  pricesIncludeTax: false,
  shipping: { type: 'FLAT', flatCents: 1500 },
  status: 'ACTIVE',
  ownerId: 'owner-1',
  createdAt: 1,
};

const product: Product = {
  id: 'product-1',
  storeId: store.id,
  name: 'Olive Soap',
  priceCents: 10_000,
  stock: 5,
  isActive: true,
  createdAt: 1,
};

const discount: Discount = {
  id: 'discount-1',
  storeId: store.id,
  code: 'SAVE10',
  type: 'PERCENT',
  value: 10,
  usedCount: 0,
  active: true,
  createdAt: 1,
};

describe('storefront cart summary display', () => {
  it('renders server-mirrored subtotal, discount, GST, shipping, and total in JOD', () => {
    const summary = computeOrderSummary(store, [product], [{ productId: product.id, quantity: 2 }], discount);

    render(
      <LanguageProvider>
        <SummaryRows store={store} summary={summary} />
      </LanguageProvider>,
    );

    expect(screen.getByText(/Subtotal/i)).toBeInTheDocument();
    expect(screen.getByText(/Discount \(SAVE10\)/i)).toBeInTheDocument();
    expect(screen.getByText(/GST/i)).toBeInTheDocument();
    expect(screen.getByText(/JOD\s*20\.000/)).toBeInTheDocument();
    expect(screen.getByText(/JOD\s*2\.000/)).toBeInTheDocument();
    expect(screen.getByText(/JOD\s*2\.880/)).toBeInTheDocument();
    expect(screen.getByText(/JOD\s*22\.380/)).toBeInTheDocument();
  });
});
