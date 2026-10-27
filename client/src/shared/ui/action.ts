import { useState } from 'react';
import { ApiError } from '../api/http';

/**
 * Returns busy/error state and a runner that clears prior errors before each action.
 * The runner catches failures, keeping translated API errors or storing an Error message/generic fallback,
 * and resets busy state when the action settles; caught failures do not reject its promise.
 */
export function useAction() {
  const [error, setError] = useState<string | ApiError>('');
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
            cause instanceof ApiError && cause.translationKey
              ? cause
              : cause instanceof Error
                ? cause.message
                : 'Something went wrong.',
          );
      } finally {
        setBusy(false);
      }
    },
  };
}
