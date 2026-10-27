import { describe, expect, it } from 'vitest';
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
