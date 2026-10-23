import { describe, expect, it } from 'vitest';
import { parseAccessLink } from './accessLink';

describe('access links', () => {
  const token = 'A'.repeat(64);

  it.each(['invite', 'reset'])(
    'keeps the valid %s token',
    (kind) => {
      expect(parseAccessLink(`#${kind}:${token}`)).toEqual({
        kind,
        token,
      });
    },
  );
  it.each([
    '',
    '#invite:',
    '#other:' + token,
    '#reset:one:two',
    '#invite',
    '#invite:' + 'a'.repeat(64),
    '#reset:' + 'A'.repeat(63),
    '#reset:' + 'A'.repeat(65),
  ])(
    'rejects invalid fragment %s',
    (fragment) => {
      expect(parseAccessLink(fragment)).toEqual({ kind: 'invalid' });
    },
  );
});
