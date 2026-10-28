import { LogOut } from 'lucide-react';
import type { Me } from '../../api';
import { ErrorBox, Header } from '../../shared/ui/page';
import { HouseholdAccess } from './HouseholdAccess';
import { useSettings } from './useSettings';
import { useTranslation } from 'react-i18next';

/** Displays account actions and the admin-only household access panel. */
export function Settings({ me }: { me: Me }) {
  const { t } = useTranslation();
  const settings = useSettings(me);
  return (
    <>
      <Header
        eyebrow={t('settingsEyebrow')}
        title={t('settingsTitle')}
        text={t('settingsText')}
      />
      <section className="panel [&&]:p-[26px] [&&]:[border:1px_solid_#e0e4d9] [&&]:bg-[#fff] [&&]:rounded-[12px] [&&]:mb-[24px] [@media(max-width:760px)]:[&&]:p-[20px]">
        <h2 className="m-[0_0_12px] text-[21px] font-semibold leading-[1.3]">
          {t('account')}
        </h2>
        <p className="m-[0_0_12px]">
          {t('signedIn', {
            username: me.username,
            role: me.isAdmin ? t('admin') : t('member'),
          })}
        </p>
        <button
          className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
          onClick={() => void settings.logout()}
        >
          <LogOut size={16} />
          {t('signOut')}
        </button>
      </section>
      {me.isAdmin && (
        <HouseholdAccess
          currentUserId={me.id}
          users={settings.users.data ?? []}
          error={settings.users.error}
          busy={settings.busy}
          link={settings.link}
          onInvite={() => void settings.issue('/admin/invites')}
          onReset={(user) =>
            void settings.issue(`/admin/users/${user.id}/reset`)
          }
          onToggle={(user) => void settings.toggle(user)}
        />
      )}
      <ErrorBox error={settings.error} />
    </>
  );
}
