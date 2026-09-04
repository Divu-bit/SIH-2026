import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export interface BurnerWallet {
  address: `0x${string}`;
  privateKey: `0x${string}`;
  did: string;
  createdAt: string;
}

const STORAGE_KEY = 'trustchain_burner_wallet';

/**
 * Generates a real cryptographic secp256k1 keypair inside the browser
 */
export function generateNewBurnerWallet(): BurnerWallet {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const did = `did:trustchain:${account.address.toLowerCase()}`;

  const wallet: BurnerWallet = {
    address: account.address,
    privateKey,
    did,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  return wallet;
}

/**
 * Retrieves the stored burner wallet or generates one if none exists
 */
export function getStoredBurnerWallet(): BurnerWallet {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback if malformed
    }
  }
  return generateNewBurnerWallet();
}

/**
 * Clears and generates a brand new burner wallet
 */
export function rotateBurnerWallet(): BurnerWallet {
  localStorage.removeItem(STORAGE_KEY);
  return generateNewBurnerWallet();
}
