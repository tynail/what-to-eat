import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const languages = ['en', 'fr'] as const;
export type Language = (typeof languages)[number];
export const languageStorageKey = 'weekly-table.language';

const resources = { en, fr } satisfies {
  en: typeof en;
  fr: Record<keyof typeof en, string>;
};
function preferredLanguage(): Language {
  try {
    const saved = localStorage.getItem(languageStorageKey);
    if (saved === 'en' || saved === 'fr') return saved;
  } catch {
    /* Storage can be unavailable. */
  }
  return navigator.languages.some((language) =>
    language.toLowerCase().startsWith('fr'),
  )
    ? 'fr'
    : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: resources.en },
    fr: { translation: resources.fr },
  },
  lng: preferredLanguage(),
  fallbackLng: 'en',
  supportedLngs: languages,
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language === 'fr' ? 'fr-CA' : 'en-CA';
  document.title =
    language === 'fr'
      ? 'Weekly Table | Planification des repas'
      : 'Weekly Table | Meal planning';
  try {
    localStorage.setItem(languageStorageKey, language);
  } catch {
    /* Preference stays in memory. */
  }
});

document.documentElement.lang = i18n.language === 'fr' ? 'fr-CA' : 'en-CA';
document.title =
  i18n.language === 'fr'
    ? 'Weekly Table | Planification des repas'
    : 'Weekly Table | Meal planning';

export default i18n;
