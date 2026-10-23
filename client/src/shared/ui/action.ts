import { useState } from 'react';

/**
 * Returns busy/error state and a runner that clears prior errors before each action.
 * The runner catches failures, optionally storing an Error message or a generic fallback,
 * and resets busy state when the action settles; caught failures do not reject its promise.
 */
export function useAction() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return {
    error,
    busy,
    run: async (
      fn: () => Promise<void>,
      shouldReportError: () => boolean = () => true,
    ) => {
      setBusy(true);
      setError('');
      try {
        await fn();
      } catch (cause) {
        if (shouldReportError())
          setError(
            cause instanceof Error ? cause.message : 'Something went wrong.',
          );
      } finally {
        setBusy(false);
      }
    },
  };
}
