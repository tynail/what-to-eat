import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n, { languageStorageKey } from './i18n';

describe('localization', () => {
  it('changes rendered strings, document language, and saved preference', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('signIn')).toBe('Se connecter');
    expect(document.documentElement.lang).toBe('fr-CA');
    expect(localStorage.getItem(languageStorageKey)).toBe('fr');
    await i18n.changeLanguage('en');
  });

  it('keeps stable ingredient values while translating their labels', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('unit_tbsp')).toBe('c. à soupe');
    await i18n.changeLanguage('en');
    expect(i18n.t('unit_tbsp')).toBe('tbsp');
  });
});

describe('initial language selection', () => {
  afterEach(() => localStorage.clear());

  it.each([
    { browser: ['en-CA', 'fr-CA'], saved: null, expected: 'en' },
    { browser: ['fr-CA', 'en-CA'], saved: null, expected: 'fr' },
    { browser: ['de-DE', 'EN-us', 'fr'], saved: null, expected: 'en' },
    { browser: ['de-DE', 'FR-ca', 'en'], saved: null, expected: 'fr' },
    { browser: ['de-DE', 'es'], saved: null, expected: 'en' },
    { browser: [], saved: null, expected: 'en' },
    { browser: ['fr'], saved: 'en', expected: 'en' },
    { browser: ['en'], saved: 'fr', expected: 'fr' },
    { browser: ['fr'], saved: 'de', expected: 'fr' },
  ])(
    'selects $expected for $browser with saved=$saved',
    async ({ browser, saved, expected }) => {
      localStorage.clear();
      if (saved) localStorage.setItem(languageStorageKey, saved);
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(browser);
      vi.resetModules();
      const { default: detected } = await import('./i18n');
      expect(detected.language).toBe(expected);
    },
  );
});
