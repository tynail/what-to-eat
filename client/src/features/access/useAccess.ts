import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, resetCsrf } from '../../api';
import { useAction } from '../../shared/ui/action';
import { parseAccessLink } from './accessLink';

// Preserve the link captured at page load, including across sign-in rerenders.
const accessLink = parseAccessLink(location.hash);

/**
 * Manages sign-in fields and submission, or link redemption when `join` is true.
 * Uses the hash captured at module load. Returns busy/error state and marks `done`
 * after redemption; successful sign-in resets CSRF and refreshes the user query.
 * Submission failures are caught and exposed through `error`.
 */
export function useAccess(join: boolean) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [link] = useState(() => accessLink);
  const action = useAction();
  const queryClient = useQueryClient();

  /** Submits the current credentials or redemption token, exposing failures through `error`. */
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
