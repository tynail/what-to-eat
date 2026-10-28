import { NavLink } from 'react-router-dom';
import {
  Leaf,
  CalendarDays,
  BookOpen,
  Utensils,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { Me } from '../api';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../shared/ui/LanguageSwitcher';

/** Renders household navigation with the current user's name and initial. */
export function Sidebar({ me }: { me: Me }) {
  const { t } = useTranslation();
  return (
    <aside
      data-cy="sidebar"
      className="sticky [top:0] h-screen bg-[#f0f3e9] [border-right:1px_solid_#e0e5d9] p-[35px_24px] flex flex-col [@media(max-width:1100px)]:p-[28px_16px] [@media(max-width:760px)]:static [@media(max-width:760px)]:h-[auto] [@media(max-width:760px)]:p-[17px_20px] [@media(max-width:760px)]:[border-bottom:1px_solid_#dfe5d6]"
    >
      <a
        className="text-[inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] brand [&&]:flex [&&]:gap-[10px] [&&]:items-center [&&]:no-underline [&&]:[font-family:Georgia,_serif] [&&]:text-[21px] [&&]:whitespace-nowrap [&&_small]:block [&&_small]:[font:9px_system-ui] [&&_small]:text-[#808975] [&&_small]:mt-[4px] [@media(max-width:1100px)]:[&&]:text-[18px] [@media(max-width:1100px)]:[&&_small]:text-[8px] [@media(max-width:760px)]:[&&]:text-[21px] [@media(max-width:760px)]:[&&_small]:text-[9px]"
        href="/"
      >
        <span className="brand-icon [&&]:bg-[#31523d] [&&]:text-[white] [&&]:grid [&&]:place-items-center [&&]:w-[36px] [&&]:h-[40px] [&&]:rounded-[12px]">
          <Leaf />
        </span>
        <span>
          Weekly Table
          <small className="text-[12px]">{t('sidebarTagline')}</small>
        </span>
      </a>
      <p className="m-[0_0_12px] nav-label [&&]:mt-[52px] [&&]:text-[9px] [&&]:font-bold [&&]:text-[#8e9787] [&&]:tracking-[1.6px] [@media(max-width:760px)]:[&&]:hidden">
        {t('navLabel')}
      </p>
      <nav
        className="grid gap-[8px] [&_a]:flex [&_a]:items-center [&_a]:gap-[13px] [&_a]:p-[13px_14px] [&_a]:no-underline [&_a]:rounded-[8px] [&_a]:text-[#697666] [&_a]:text-[13px] [&_a_svg]:w-[18px] [&_a.active]:bg-[#dfe7d7] [&_a.active]:text-[#294c34] [&_a.active]:font-bold [@media(max-width:760px)]:flex [@media(max-width:760px)]:justify-between [@media(max-width:760px)]:gap-[3px] [@media(max-width:760px)]:mt-[17px] [@media(max-width:760px)]:[&_a]:p-[9px_8px] [@media(max-width:760px)]:[&_a]:text-[11px] [@media(max-width:760px)]:[&_a]:gap-[5px] [@media(max-width:760px)]:[&_a_svg]:w-[15px]"
        data-cy="main-navigation"
        aria-label={t('navigationLabel')}
      >
        <NavLink data-cy="nav-week" to="/" end>
          <CalendarDays />
          {t('week')}
        </NavLink>
        <NavLink data-cy="nav-meals" to="/meals">
          <Utensils />
          {t('meals')}
        </NavLink>
        <NavLink data-cy="nav-recipes" to="/recipes">
          <BookOpen />
          {t('recipes')}
        </NavLink>
        <NavLink data-cy="nav-settings" to="/settings">
          <SettingsIcon />
          {t('settings')}
        </NavLink>
      </nav>
      <div className="sidebar-note [&&]:mt-[auto] [&&]:p-[30px_12px] [&&]:text-[#708163] [&&_p]:[font:24px/1.4_Georgia,_serif] [&&_p]:mt-[12px] [&&_small]:text-[11px] [@media(max-width:760px)]:[&&]:hidden">
        <Leaf />
        <p className="m-[0_0_12px]">
          {t('goodFood')}
          <br />
          {t('oneLess')}
        </p>
        <small className="text-[12px]">{t('room')}</small>
      </div>
      <div className="mt-auto mb-[16px] [@media(max-width:760px)]:absolute [@media(max-width:760px)]:right-[20px] [@media(max-width:760px)]:top-[20px]">
        <LanguageSwitcher />
      </div>
      <div className="account [&&]:[border-top:1px_solid_#dce2d2] [&&]:pt-[21px] [&&]:flex [&&]:gap-[11px] [&&]:items-center [&&]:font-semibold [&&]:text-[12px] [&&_small]:block [&&_small]:text-[#839078] [&&_small]:font-normal [@media(max-width:760px)]:[&&]:hidden">
        <span className="avatar [&&]:rounded-[50%] [&&]:bg-[#e3dcc5] [&&]:p-[8px_13px]">
          {me.username.slice(0, 1).toUpperCase()}
        </span>
        <div>
          {me.username}
          <small className="text-[12px]">{t('household')}</small>
        </div>
      </div>
    </aside>
  );
}
