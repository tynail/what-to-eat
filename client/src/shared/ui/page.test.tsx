import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { api, apiParsed, ApiError, resetCsrf } from '../api/http';
import { useAction } from './action';
import { ErrorBox } from './page';

function FailingAction({ request }: { request: () => Promise<unknown> }) {
  const action = useAction();
  return (
    <>
      <button
        onClick={() =>
          void action.run(async () => {
            await request();
          })
        }
      >
        Request
      </button>
      <ErrorBox error={action.error} />
    </>
  );
}

describe('API error localization', () => {
  beforeEach(async () => {
    resetCsrf();
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it.each([
    {
      name: 'unauthorized response',
      response: () => new Response('', { status: 401 }),
      english: 'Please sign in.',
      french: 'Veuillez vous connecter.',
    },
    {
      name: 'rate limit response',
      response: () => Response.json({}, { status: 429 }),
      english: 'Too many attempts. Wait a minute and retry.',
      french: 'Trop de tentatives. Attendez une minute puis réessayez.',
    },
    {
      name: 'other failed response',
      response: () => Response.json({ detail: 42 }, { status: 500 }),
      english: 'Request failed. Reload and retry.',
      french: 'La demande a échoué. Rechargez puis réessayez.',
    },
    {
      name: 'failed CSRF request',
      response: () => Response.json({}, { status: 401 }),
      request: () => api('/test', { method: 'POST' }),
      english: 'Please sign in.',
      french: 'Veuillez vous connecter.',
    },
    {
      name: 'invalid CSRF token',
      response: () => Response.json({ token: 42 }),
      request: () => api('/test', { method: 'POST' }),
      english: 'Security token unavailable. Reload and retry.',
      french: 'Jeton de sécurité indisponible. Rechargez puis réessayez.',
    },
    {
      name: 'invalid JSON',
      response: () => new Response('invalid'),
      english: 'Server returned invalid JSON.',
      french: 'Le serveur a renvoyé du JSON invalide.',
    },
    {
      name: 'invalid parsed response',
      response: () => Response.json({}),
      request: () =>
        apiParsed('/test', () => {
          throw new Error('Invalid shape');
        }),
      english: 'Server returned an invalid response.',
      french: 'Le serveur a renvoyé une réponse invalide.',
    },
    {
      name: 'server detail resembling a translation key',
      response: () =>
        Response.json({ detail: 'apiUnauthorized' }, { status: 401 }),
      english: 'apiUnauthorized',
      french: 'apiUnauthorized',
    },
  ])(
    'updates an existing $name after a language change',
    async ({ response, request, english, french }) => {
      const fetch = vi.fn().mockImplementation(async () => response());
      vi.stubGlobal('fetch', fetch);
      render(<FailingAction request={request ?? (() => api('/test'))} />);
      await userEvent.click(screen.getByRole('button', { name: 'Request' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(english);
      const calls = fetch.mock.calls.length;

      await act(async () => {
        await i18n.changeLanguage('fr');
      });
      expect(screen.getByRole('alert')).toHaveTextContent(french);
      expect(fetch).toHaveBeenCalledTimes(calls);
    },
  );

  it.each([
    { name: 'connection failure', cause: new TypeError('Failed to fetch') },
    {
      name: 'Firefox connection failure',
      cause: new TypeError('NetworkError when attempting to fetch resource.'),
    },
    { name: 'non-Error failure', cause: undefined },
  ])('updates an existing $name after a language change', async ({ cause }) => {
    const fetch = vi.fn().mockRejectedValue(cause);
    vi.stubGlobal('fetch', fetch);
    render(<FailingAction request={() => api('/test')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Request failed. Reload and retry.',
    );

    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La demande a échoué. Rechargez puis réessayez.',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves non-network TypeError messages', async () => {
    render(
      <FailingAction
        request={async () => {
          throw new TypeError('Application type error');
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Application type error',
    );
  });

  it('retains interpolation parameters until rendering', async () => {
    const error = new ApiError(400, {
      key: 'ingredient',
      params: { index: 2 },
    });
    render(<ErrorBox error={error} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Ingredient 2');
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Ingrédient 2');
  });
});
