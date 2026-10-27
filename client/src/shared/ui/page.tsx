import type { ReactNode } from 'react';
import { Utensils } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/http';

/** Renders translated API failures in the current language, preserving other error messages. */
export function ErrorBox({ error }: { error: unknown }) {
  const { t } = useTranslation();
  return error ? (
    <p
      className="m-[0_0_12px] error [&&]:bg-[#fff0ea] [&&]:[border:1px_solid_#f0d0c4] [&&]:rounded-[8px] [&&]:p-[12px] [&&]:text-[#a23b2b] [&&]:text-[13px] [&&]:mt-[14px]"
      role="alert"
    >
      {error instanceof ApiError && error.translationKey
        ? t(error.translationKey, error.translationParams)
        : error instanceof Error
          ? error.message
          : String(error)}
    </p>
  ) : null;
}

/** Renders a page heading and description, with optional children for actions alongside them. */
export function Header({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading [&&]:flex [&&]:justify-between [&&]:items-center [&&]:gap-[20px] [&&]:mb-[31px] [&&_.muted]:text-[13px] [&&_.muted]:mt-[13px] [@media(max-width:760px)]:[&&]:items-start [@media(max-width:760px)]:[&&]:flex-wrap [@media(max-width:760px)]:[&&]:mb-[24px] [@media(max-width:760px)]:[&&_.muted]:text-[12px]">
      <div>
        <p className="m-[0_0_12px] eyebrow [&&]:text-[#748166] [&&]:text-[10px] [&&]:tracking-[1.9px] [&&]:[font-weight:750] [&&]:mb-[12px]">
          {eyebrow}
        </p>
        <h1 className="m-[0_0_12px] [font-family:Georgia,_serif] text-[42px] leading-[1.15] font-medium tracking-[-1px] [@media(max-width:760px)]:text-[33px]">
          {title}
        </h1>
        <p className="m-[0_0_12px] muted [&&]:text-[#768076]">{text}</p>
      </div>
      {children}
    </header>
  );
}

/** Renders an empty-state title and guidance with a utensils icon. */
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty [&&]:p-[45px_20px] [&&]:text-center [&&]:[border:1px_dashed_#d9e0cf] [&&]:rounded-[12px] [&&]:text-[#859079] [&&_svg]:text-[#a2b18f] [&&_svg]:mb-[12px] [&&_h3]:[font:21px_Georgia,_serif] [&&_h3]:text-[#596b4b] [&&_p]:text-[12px] [&&_p]:max-w-[460px] [&&_p]:m-[auto]">
      <Utensils size={32} />
      <h3 className="m-[0_0_12px] text-[17px]">{title}</h3>
      <p className="m-[0_0_12px]">{text}</p>
    </div>
  );
}
