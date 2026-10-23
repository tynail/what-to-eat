import { LogOut } from 'lucide-react';
import type { Me } from '../../api';
import { ErrorBox, Header } from '../../shared/ui/page';
import { HouseholdAccess } from './HouseholdAccess';
import { useSettings } from './useSettings';

/** Displays account actions and the admin-only household access panel. */
export function Settings({ me }: { me: Me }) {
  const settings = useSettings(me);
  return (
    <>
      <Header
        eyebrow="AT HOME HERE"
        title="Household settings"
        text="A shared kitchen, with access kept in your hands."
      />
      <section className="panel">
        <h2>Your account</h2>
        <p>
          Signed in as <strong>{me.username}</strong> ·{' '}
          {me.isAdmin ? 'Admin' : 'Member'}
        </p>
        <button onClick={() => void settings.logout()}>
          <LogOut size={16} />
          Sign out
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
