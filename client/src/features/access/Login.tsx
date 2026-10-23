import { ArrowRight } from 'lucide-react';
import { ErrorBox } from '../../shared/ui/page';
import { AccessStory } from './AccessStory';
import { useAccess } from './useAccess';

/**
 * Renders sign-in, or invite/password-reset redemption when `join` is true.
 * Redemption uses the hash captured when this module loaded and disables submission
 * for invalid links. Submission errors are displayed in the form; successful sign-in
 * clears the CSRF cache and invalidates the current-user query.
 */
export function Login({ join = false }: { join?: boolean }) {
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
    <div className="auth-page">
      <AccessStory />
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="eyebrow">YOUR HOUSEHOLD KITCHEN</p>
        <h2>
          {done
            ? 'You’re all set.'
            : join
              ? reset
                ? 'Reset password'
                : 'Pull up a chair.'
              : 'Welcome back.'}
        </h2>
        {done ? (
          <a className="button primary" href="/">
            Sign in <ArrowRight size={16} />
          </a>
        ) : (
          <>
            <p className="muted">
              {join
                ? link.kind === 'invalid'
                  ? 'This link is invalid. Ask your household admin for a new one.'
                  : 'Use at least 12 characters with uppercase, lowercase, number, and symbol.'
                : 'Sign in to plan something delicious.'}
            </p>
            {!reset && (
              <label>
                Username
                <input
                  required
                  maxLength={80}
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
            )}
            <label>
              Password
              <input
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
              className="primary"
              disabled={busy || (join && link.kind === 'invalid')}
            >
              {busy ? 'Working…' : join ? 'Save account' : 'Sign in'}
              <ArrowRight size={16} />
            </button>
            <small>
              Invite-only access. Need help? Ask your household admin.
            </small>
          </>
        )}
      </form>
    </div>
  );
}
