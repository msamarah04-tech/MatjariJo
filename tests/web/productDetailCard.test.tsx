import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/lib/i18n';
import { ProductDetailCard } from '@/components/storefront/ProductDetailCard';
import type { Product, Store } from '@/lib/types';

const store = { themeId: 'mono', currency: 'JOD' } as Store;

const renderCard = (product: Product, onAddToCart?: (id: string, qty: number, variantId?: string) => void) =>
  render(
    <LanguageProvider>
      <ProductDetailCard product={product} store={store} onAddToCart={onAddToCart} />
    </LanguageProvider>,
  );

describe('ProductDetailCard', () => {
  it('renders the category badge + schema attributes and hides admin-only fields', () => {
    const product = {
      id: 'p1', storeId: 's1', name: 'Oak Shelf', priceCents: 24500, stock: 8, isActive: true, createdAt: 0,
      details: {
        categoryKey: 'home',
        attributes: { material: 'Oak', assemblyRequired: true, supplierName: 'Acme Wholesale' },
      },
    } as unknown as Product;

    renderCard(product);

    expect(screen.getByText('Oak Shelf')).toBeInTheDocument();
    expect(screen.getByText('Home & Furniture')).toBeInTheDocument();
    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Oak')).toBeInTheDocument();
    // Booleans localize to Yes/No.
    expect(screen.getByText('Assembly required')).toBeInTheDocument();
    // Admin-only attribute is never rendered, even if present on the product.
    expect(screen.queryByText(/Acme Wholesale/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Supplier/)).not.toBeInTheDocument();
  });

  it('updates price/stock and enables add-to-cart when a variant is chosen', async () => {
    const onAddToCart = vi.fn();
    const product = {
      id: 'p2', storeId: 's1', name: 'Tee', priceCents: 24500, stock: 8, isActive: true, createdAt: 0,
      details: {
        categoryKey: 'clothing',
        sellingType: 'VARIABLE',
        attributes: { gender: 'unisex' },
        options: [{ id: 'o1', name: 'Size', values: [{ id: 'v1', value: 'S' }, { id: 'v2', value: 'M' }] }],
        variants: [
          { id: 'var1', title: 'S', selections: { Size: 'S' }, priceCents: 24500, stock: 5, isActive: true },
          { id: 'var2', title: 'M', selections: { Size: 'M' }, priceCents: 30000, stock: 3, isActive: true },
        ],
      },
    } as unknown as Product;

    renderCard(product, onAddToCart);

    // Before choosing: shows a "from" range and the CTA prompts a choice.
    expect(screen.getByText(/from/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose options/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'M' }));

    // After choosing M: price resolves to the variant's 30.000 and CTA is enabled.
    expect(screen.getByText(/30\.000/)).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /add to cart/i });
    expect(cta).toBeEnabled();
    await userEvent.click(cta);
    expect(onAddToCart).toHaveBeenCalledWith('p2', 1, 'var2');
  });
});
