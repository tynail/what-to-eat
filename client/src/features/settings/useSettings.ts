import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  apiParsed,
  parseHouseholdUsers,
  parseLinkResponse,
  resetCsrf,
  type Me,
  type HouseholdUser,
} from '../../api';
import { useAction } from '../../shared/ui/action';
import i18n from '../../i18n';

/**
 * Loads household users only for admins and returns access-link and account actions.
 * Action failures are caught and exposed through `error`; user-query errors remain
 * on `users`. Issued links are retained in local state.
 */
export function useSettings(me: Me) {
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => apiParsed('/admin/users', parseHouseholdUsers),
    enabled: me.isAdmin,
  });
  const action = useAction();
  const [link, setLink] = useState('');

  /**
   * Posts to an API path without the `/api` prefix to issue an access link.
   * Stores the returned path prefixed with the current origin; failures populate `error`.
   */
  function issue(path: string) {
    return action.run(async () => {
      const result = await apiParsed(path, parseLinkResponse, {
        method: 'POST',
      });
      setLink(`${location.origin}${result.path}`);
    });
  }

  /** Confirms a member status change, then refreshes users; action failures populate `error`. */
  function toggle(user: HouseholdUser) {
    if (
      !confirm(
        i18n.t('confirmToggle', {
          action: user.disabled ? i18n.t('enable') : i18n.t('disable'),
          name: user.username,
        }),
      )
    )
      return;
    return action.run(async () => {
      await api(`/admin/users/${user.id}/toggle`, { method: 'POST' });
      await users.refetch();
    });
  }

  /** Signs out, resets CSRF, clears cached queries, and navigates home; failures populate `error`. */
  function logout() {
    return action.run(async () => {
      await api('/auth/logout', { method: 'POST' });
      resetCsrf();
      queryClient.clear();
      location.assign('/');
    });
  }

  return {
    users,
    link,
    busy: action.busy,
    error: action.error,
    issue,
    toggle,
    logout,
  };
}
