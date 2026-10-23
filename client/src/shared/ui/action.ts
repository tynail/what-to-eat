import { useState } from 'react';

export function useAction() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return {
    error,
    busy,
    run: async (fn: () => Promise<void>) => {
      setBusy(true);
      setError('');
      try {
        await fn();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Something went wrong.',
        );
      } finally {
        setBusy(false);
      }
    },
  };
}
