import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useI18n } from '@/lib/i18n';
import { ProductCard } from '@/components/storefront/ProductCard';
import type { Product } from '@/lib/types';

function ArabicSwitch() {
  const { setLang } = useI18n();
  // Flip to Arabic on mount for the localization test.
  setLang('ar');
  return null;
}

function renderCard(product: Product, props: Partial<Parameters<typeof ProductCard>[0]> = {}, arabic = false) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        {arabic && <ArabicSwitch />}
        <ProductCard product={product} storeSlug="demo" {...props} />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

const simple = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1', storeId: 's1', name: 'Coastal Mug', priceCents: 12500, stock: 8, isActive: true, createdAt: 0,
  ...overrides,
}) as Product;

describe('ProductCard', () => {
  it('renders the product name and formatted JOD price', () => {
    renderCard(simple());
    expect(screen.getByText('Coastal Mug')).toBeInTheDocument();
    // JOD formats with 3 decimals.
    expect(screen.getByText(/12\.500/)).toBeInTheDocument();
  });

  it('links to the product detail route', () => {
    renderCard(simple());
    const link = screen.getAllByRole('link')[0] as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/s/demo/p/p1');
  });

  it('shows a fallback placeholder when there is no image or emoji', () => {
    const { container } = renderCard(simple({ imageEmoji: undefined, imageUrl: undefined }));
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows a sale badge with discount % and the struck-through compare-at price', () => {
    renderCard(simple({ priceCents: 7500, compareAtCents: 10000 }), { showBadges: true });
    expect(screen.getByText(/-25%/)).toBeInTheDocument();
    expect(screen.getByText(/10\.000/)).toBeInTheDocument();
  });

  it('disables quick add when out of stock', () => {
    const onAddToCart = vi.fn();
    renderCard(simple({ stock: 0 }), { showQuickAdd: true, onAddToCart });
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('quick-adds a simple, in-stock product with quantity 1 and no variant', async () => {
    const onAddToCart = vi.fn();
    renderCard(simple(), { showQuickAdd: true, onAddToCart });
    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    expect(onAddToCart).toHaveBeenCalledWith('p1', 1, undefined);
    expect(screen.getByText(/Added/)).toBeInTheDocument();
  });

  it('renders variant preview chips and swatches', () => {
    const product = simple({
      details: {
        sellingType: 'VARIABLE',
        options: [
          { id: 'o-color', name: 'Color', values: [{ id: 'c1', value: 'Black', colorHex: '#111111' }, { id: 'c2', value: 'Cream', colorHex: '#efe7d6' }] },
          { id: 'o-size', name: 'Size', values: [{ id: 's1', value: 'S' }, { id: 's2', value: 'M' }] },
        ],
        variants: [
          { id: 'v1', title: 'Black / S', selections: { Color: 'Black', Size: 'S' }, priceCents: 12500, stock: 3, isActive: true },
          { id: 'v2', title: 'Cream / M', selections: { Color: 'Cream', Size: 'M' }, priceCents: 12500, stock: 2, isActive: true },
        ],
      },
    } as Partial<Product>);
    renderCard(product, { showVariantPreview: true });
    // Size chips show as text.
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    // Color swatch carries the value label as aria-label.
    expect(screen.getByLabelText('Black')).toBeInTheDocument();
  });

  it('multi-variant quick add becomes a "Choose options" link, not a blind add', () => {
    const onAddToCart = vi.fn();
    const product = simple({
      details: {
        sellingType: 'VARIABLE',
        options: [{ id: 'o-size', name: 'Size', values: [{ id: 's1', value: 'S' }, { id: 's2', value: 'M' }] }],
        variants: [
          { id: 'v1', title: 'S', selections: { Size: 'S' }, priceCents: 12500, stock: 3, isActive: true },
          { id: 'v2', title: 'M', selections: { Size: 'M' }, priceCents: 12500, stock: 2, isActive: true },
        ],
      },
    } as Partial<Product>);
    renderCard(product, { showQuickAdd: true, onAddToCart });
    expect(screen.getByRole('link', { name: /choose options/i })).toBeInTheDocument();
  });

  it('never exposes admin-only fields (cost price, admin attributes)', () => {
    const { container } = renderCard(simple({
      details: { categoryKey: 'home', costPriceCents: 9999, attributes: { material: 'Oak', supplierName: 'Acme Wholesale' } },
    } as Partial<Product>));
    expect(container.textContent).not.toMatch(/9\.999|9999/);
    expect(container.textContent).not.toMatch(/Acme Wholesale/);
  });

  it('supports Arabic labels when the language context is Arabic', () => {
    renderCard(simple({ stock: 0 }), { showQuickAdd: true, onAddToCart: vi.fn() }, true);
    // Out of stock → غير متوفر appears (badge/overlay/button).
    expect(screen.getAllByText('غير متوفر').length).toBeGreaterThan(0);
  });
});
