import { ArrowRight } from 'lucide-react';
import { ErrorBox } from '../../shared/ui/page';
import { AccessStory } from './AccessStory';
import { useAccess } from './useAccess';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher';

/**
 * Renders sign-in, or invite/password-reset redemption when `join` is true.
 * Redemption uses the hash captured when this module loaded and disables submission
 * for invalid links. Submission errors are displayed in the form; successful sign-in
 * clears the CSRF cache and invalidates the current-user query.
 */
export function Login({ join = false }: { join?: boolean }) {
  const { t } = useTranslation();
  const {
    username,
    setUsername,
    password,
    setPassword,
    done,
    link,
    reset,
    busy,
    error,
    submit,
  } = useAccess(join);

  return (
    <div className="auth-page [&&]:min-h-screen [&&]:grid [&&]:grid-cols-[1fr_1fr] [@media(max-width:760px)]:[&&]:block">
      <AccessStory />
      <form
        className="[&_h3]:mt-[26px] auth-form [&&]:w-[min(410px,_90%)] [&&]:m-[auto] [&&]:p-[40px_15px] [&&_h2]:[font:36px_Georgia,_serif] [&&_button]:w-full [&&_button]:m-[10px_0_20px] [&&_small]:block [&&_small]:text-[#829177] [@media(max-width:760px)]:[&&]:pt-[32px]"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <p className="m-[0_0_12px] eyebrow [&&]:text-[#748166] [&&]:text-[10px] [&&]:tracking-[1.9px] [&&]:[font-weight:750] [&&]:mb-[12px]">
          {t('authKitchen')}
        </p>
        <h2 className="m-[0_0_12px] text-[21px] font-semibold leading-[1.3]">
          {done
            ? t('allSet')
            : join
              ? reset
                ? t('resetPassword')
                : t('chair')
              : t('welcome')}
        </h2>
        {done ? (
          <a
            className="text-[inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] button [&]:inline-flex [&]:items-center [&]:justify-center [&]:gap-[8px] [&]:[border:1px_solid_#d8dfd6] [&]:rounded-[8px] [&]:p-[10px_15px] [&]:bg-[#fff] [&]:text-[#294737] [&]:cursor-pointer [&]:font-semibold [&]:no-underline [&:hover]:bg-[#edf2e8] primary [&&]:bg-[#29543f] [&&]:text-[white] [&&]:[border-color:#29543f] [&&:hover]:bg-[#193e2c]"
            href="/"
          >
            {t('signIn')} <ArrowRight size={16} />
          </a>
        ) : (
          <>
            <p className="m-[0_0_12px] muted [&&]:text-[#768076]">
              {join
                ? link.kind === 'invalid'
                  ? t('invalidLink')
                  : t('passwordHint')
                : t('authHint')}
            </p>
            {!reset && (
              <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
                {t('username')}
                <input
                  className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
                  required
                  maxLength={80}
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
            )}
            <label className="grid gap-[6px] text-[12px] font-semibold text-[#56664f] mb-[14px]">
              {t('password')}
              <input
                className="[font-family:inherit] [font-size:inherit] [line-height:inherit] [font-weight:inherit] [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] w-full [border:1px_solid_#dce1d5] rounded-[6px] bg-[#fff] p-[10px] text-[#334932] min-w-0"
                required
                type="password"
                minLength={join ? 12 : 1}
                autoComplete={join ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <ErrorBox error={error} />
            <button
              className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px] primary [&&]:bg-[#29543f] [&&]:text-[white] [&&]:[border-color:#29543f] [&&:hover]:bg-[#193e2c]"
              disabled={busy || (join && link.kind === 'invalid')}
            >
              {busy ? t('working') : join ? t('saveAccount') : t('signIn')}
              <ArrowRight size={16} />
            </button>
            <small className="text-[12px]">{t('inviteOnly')}</small>
          </>
        )}
      </form>
    </div>
  );
}
