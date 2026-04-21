const UINT32_RANGE = 0x1_0000_0000;

function getCrypto(): Crypto {
  if (!globalThis.crypto) {
    throw new Error("Secure random generation requires crypto.getRandomValues().");
  }

  return globalThis.crypto;
}

function getSecureRandomUint32(): number {
  const values = new Uint32Array(1);
  getCrypto().getRandomValues(values);
  return values[0] ?? 0;
}

export function secureRandom(): number {
  return getSecureRandomUint32() / UINT32_RANGE;
}

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("secureRandomInt(maxExclusive) requires a positive integer.");
  }

  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  let value = getSecureRandomUint32();

  while (value >= limit) {
    value = getSecureRandomUint32();
  }

  return value % maxExclusive;
}
