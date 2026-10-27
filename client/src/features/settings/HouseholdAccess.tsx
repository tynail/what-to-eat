import { Plus } from 'lucide-react';
import type { HouseholdUser } from '../../api';
import { ErrorBox } from '../../shared/ui/page';
import { useTranslation } from 'react-i18next';

/**
 * Renders member access actions and the issued private link, delegating changes to
 * callbacks. Hides the current user's enable/disable action and disables password
 * resets for disabled users; `busy` disables all action buttons.
 */
export function HouseholdAccess({
  currentUserId,
  users,
  error,
  busy,
  link,
  onInvite,
  onReset,
  onToggle,
}: {
  currentUserId: string;
  users: HouseholdUser[];
  error: unknown;
  busy: boolean;
  link: string;
  onInvite: () => void;
  onReset: (user: HouseholdUser) => void;
  onToggle: (user: HouseholdUser) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="panel [&&]:p-[26px] [&&]:[border:1px_solid_#e0e4d9] [&&]:bg-[#fff] [&&]:rounded-[12px] [&&]:mb-[24px] [@media(max-width:760px)]:[&&]:p-[20px]">
      <h2 className="m-[0_0_12px] text-[21px] font-semibold leading-[1.3]">
        {t('seat')}
      </h2>
      <p className="m-[0_0_12px] muted [&&]:text-[#768076]">
        {t('linksExpire')}
      </p>
      <button
        className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] primary [&&]:bg-[#29543f] [&&]:text-[white] [&&]:[border-color:#29543f] [&&:hover]:bg-[#193e2c]"
        disabled={busy}
        onClick={onInvite}
      >
        <Plus size={16} />
        {t('invite')}
      </button>
      {link && (
        <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px] share-link [&&]:mt-[20px]">
          {t('copyLink')}
          <input
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
            readOnly
            value={link}
            onFocus={(event) => event.target.select()}
          />
        </label>
      )}
      <ErrorBox error={error} />
      {users.map((user) => (
        <div
          className="user-row [&&]:flex [&&]:gap-[10px] [&&]:items-center [&&]:p-[15px_0] [&&]:[border-bottom:1px_solid_#e5ebde] [&&_span]:flex-1 [&&_small]:block [&&_small]:text-[#7e8a73] [@media(max-width:760px)]:[&&]:flex-wrap [@media(max-width:760px)]:[&&_span]:[flex-basis:100%]"
          key={user.id}
        >
          <span>
            {user.username}
            <small className="text-[12px]">
              {user.disabled ? t('disabled') : t('active')}
            </small>
          </span>
          <button
            className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
            disabled={busy || user.disabled}
            onClick={() => onReset(user)}
          >
            {t('reset')}
          </button>
          {user.id !== currentUserId && (
            <button
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
              disabled={busy}
              onClick={() => onToggle(user)}
            >
              {user.disabled ? t('enable') : t('disable')}
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
