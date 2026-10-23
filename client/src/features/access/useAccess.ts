import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, resetCsrf } from '../../api';
import { useAction } from '../../shared/ui/action';
import { parseAccessLink } from './accessLink';

// Preserve the link captured at page load, including across sign-in rerenders.
const accessLink = parseAccessLink(location.hash);

export function useAccess(join: boolean) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [link] = useState(() => accessLink);
  const action = useAction();
  const queryClient = useQueryClient();

  function submit() {
    return action.run(async () => {
      if (join) {
        if (link.kind === 'invalid')
          throw new Error(
            'This link is invalid. Ask your household admin for a new one.',
          );
        await api('/auth/redeem', {
          method: 'POST',
          body: { token: link.token, username, password },
        });
        setDone(true);
      } else {
        await api('/auth/login', {
          method: 'POST',
          body: { username, password },
        });
        resetCsrf();
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      }
    });
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    done,
    link,
    reset: join && link.kind === 'reset',
    busy: action.busy,
    error: action.error,
    submit,
  };
}
