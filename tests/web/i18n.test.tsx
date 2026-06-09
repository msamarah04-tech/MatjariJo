import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/lib/i18n';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { money } from '@/lib/format';

describe('i18n language toggle + RTL', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dir = 'ltr';
  });

  it('starts in English LTR and switches to Arabic RTL', async () => {
    render(
      <LanguageProvider>
        <LanguageToggle />
      </LanguageProvider>,
    );

    // The toggle shows the OTHER language; default is English so it offers العربية.
    expect(screen.getByRole('button')).toHaveTextContent('العربية');
    expect(document.documentElement.dir).toBe('ltr');

    await userEvent.click(screen.getByRole('button'));

    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(screen.getByRole('button')).toHaveTextContent('English');
  });
});

describe('currency-aware money formatting', () => {
  it('formats JOD with 3 decimals and USD with 2', () => {
    expect(money(12500, 'JOD', 'en-JO')).toMatch(/12\.500/);
    expect(money(1250, 'USD', 'en-US')).toMatch(/\$12\.50/);
  });
});
