type AccessLink =
  | { kind: 'invite'; token: string }
  | { kind: 'reset'; token: string }
  | { kind: 'invalid' };

/**
 * Parses a location hash such as `#invite:token` or `#reset:token` without decoding it.
 * Expects the leading `#` but does not validate it. Returns `invalid` for an unknown
 * kind, missing separator, or token other than exactly 64 uppercase hexadecimal characters.
 */
export function parseAccessLink(fragment: string): AccessLink {
  const separator = fragment.indexOf(':');
  if (separator < 0) return { kind: 'invalid' };

  const kind = fragment.slice(1, separator);
  const token = fragment.slice(separator + 1);
  if (!/^[A-F0-9]{64}$/.test(token)) return { kind: 'invalid' };
  if (kind === 'invite') return { kind, token };
  if (kind === 'reset') return { kind, token };
  return { kind: 'invalid' };
}
