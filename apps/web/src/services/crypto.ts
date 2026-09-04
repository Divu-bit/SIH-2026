import { keccak256, toHex, stringToBytes } from 'viem';

/**
 * Deterministically canonicalizes JSON object to match on-chain hash calculations
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const inner = keys
      .map(k => `"${k}":${canonicalizeJson(obj[k])}`)
      .join(',');
    return `{${inner}}`;
  }
  return String(obj);
}

/**
 * Computes canonical Keccak256 hash of credential JSON
 */
export function computeCredentialHash(jsonObj: any): `0x${string}` {
  const canonical = canonicalizeJson(jsonObj);
  return keccak256(stringToBytes(canonical));
}

/**
 * Formats standard DID string from address
 */
export function formatDID(address: string, method = 'trustchain'): string {
  return `did:${method}:${address.toLowerCase()}`;
}

/**
 * Truncates hash/address for UI display
 */
export function truncateHash(hash: string, start = 6, end = 4): string {
  if (!hash) return '';
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}
