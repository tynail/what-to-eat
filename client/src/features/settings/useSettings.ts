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

export function useSettings(me: Me) {
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => apiParsed('/admin/users', parseHouseholdUsers),
    enabled: me.isAdmin,
  });
  const action = useAction();
  const [link, setLink] = useState('');

  function issue(path: string) {
    return action.run(async () => {
      const result = await apiParsed(path, parseLinkResponse, {
        method: 'POST',
      });
      setLink(`${location.origin}${result.path}`);
    });
  }

  function toggle(user: HouseholdUser) {
    if (!confirm(`${user.disabled ? 'Enable' : 'Disable'} ${user.username}?`))
      return;
    return action.run(async () => {
      await api(`/admin/users/${user.id}/toggle`, { method: 'POST' });
      await users.refetch();
    });
  }

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
