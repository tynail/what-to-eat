import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Language } from '../../i18n';

/** Global language picker. Keeps routing and application state untouched. */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const language: Language = i18n.resolvedLanguage === 'fr' ? 'fr' : 'en';
  useEffect(() => {
    function dismiss(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (
        event.key === 'Escape' &&
        ref.current?.querySelector('[role="menu"]')
      ) {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  function choose(next: Language) {
    void i18n.changeLanguage(next);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div className="relative" ref={ref}>
      <button
        ref={trigger}
        type="button"
        className="[font-family:inherit] inline-flex items-center gap-[6px] text-[12px] font-semibold text-[#294737] bg-white [border:1px_solid_#d8dfd6] rounded-[8px] p-[8px_10px] cursor-pointer [&:focus-visible]:[outline:3px_solid_#bc8c32]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('language')}
        onClick={() => setOpen((value) => !value)}
      >
        <Globe size={16} />
        {language === 'fr' ? t('french') : t('english')}
      </button>
      {open && (
        <div
          className="absolute z-10 mt-[6px] min-w-[140px] overflow-hidden rounded-[8px] bg-white [border:1px_solid_#d8dfd6] [box-shadow:0_8px_24px_#1e302b20]"
          role="menu"
          aria-label={t('language')}
        >
          {(['en', 'fr'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={language === option}
              className="block w-full text-left p-[10px_12px] bg-white border-0 cursor-pointer hover:bg-[#edf2e8] [&:focus-visible]:[outline:3px_solid_#bc8c32]"
              onClick={() => choose(option)}
            >
              {option === 'en' ? t('english') : t('french')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
