import { Plus } from 'lucide-react';
import type { HouseholdUser } from '../../api';
import { ErrorBox } from '../../shared/ui/page';

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
  return (
    <section className="panel">
      <h2>A seat at the table</h2>
      <p className="muted">
        Invite links expire in 48 hours. Password reset links expire in 1 hour.
        Each works once.
      </p>
      <button className="primary" disabled={busy} onClick={onInvite}>
        <Plus size={16} />
        Create invite link
      </button>
      {link && (
        <label className="share-link">
          Copy this private link and share it directly
          <input
            readOnly
            value={link}
            onFocus={(event) => event.target.select()}
          />
        </label>
      )}
      <ErrorBox error={error} />
      {users.map((user) => (
        <div className="user-row" key={user.id}>
          <span>
            {user.username}
            <small>{user.disabled ? 'Disabled' : 'Active'}</small>
          </span>
          <button
            disabled={busy || user.disabled}
            onClick={() => onReset(user)}
          >
            Reset password
          </button>
          {user.id !== currentUserId && (
            <button disabled={busy} onClick={() => onToggle(user)}>
              {user.disabled ? 'Enable' : 'Disable'}
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
