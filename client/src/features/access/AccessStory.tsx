import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Renders the welcome panel shared by sign-in and account redemption screens. */
export function AccessStory() {
  const { t } = useTranslation();
  return (
    <section className="auth-story [&&]:bg-[#e8eedc] [&&]:p-[16vh_12%] [&&]:flex [&&]:flex-col [&&]:justify-center [&&_.eyebrow]:mt-[40px] [&&_h1]:text-[60px] [&&_p:last-child]:text-[#7a896b] [&&_p:last-child]:mt-[18px] [@media(max-width:760px)]:[&&]:p-[35px_30px] [@media(max-width:760px)]:[&&_h1]:text-[38px] [@media(max-width:760px)]:[&&_.eyebrow]:mt-[20px] [@media(max-width:760px)]:[&&_p:last-child]:hidden">
      <Leaf size={40} />
      <p className="m-[0_0_12px] eyebrow [&&]:text-[#748166] [&&]:text-[10px] [&&]:tracking-[1.9px] [&&]:[font-weight:750] [&&]:mb-[12px]">
        {t('authKitchen')}
      </p>
      <h1 className="m-[0_0_12px] [font-family:Georgia,_serif] text-[42px] leading-[1.15] font-medium tracking-[-1px] [@media(max-width:760px)]:text-[33px]">
        {t('heroTitle').split('\n')[0]}
        <br />
        {t('heroTitle').split('\n')[1]}
      </h1>
      <p className="m-[0_0_12px]">{t('plannerText')}</p>
    </section>
  );
}
