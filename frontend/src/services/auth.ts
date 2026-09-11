/* ═══════════════════════════════════════════════════════════════════════════
   TrustChain — Wallet Authentication Service
   RainbowKit / Wagmi connection + EIP-191 challenge/sign/verify flow
   ═══════════════════════════════════════════════════════════════════════════ */

import { signMessage, disconnect } from 'wagmi/actions';
import { config } from '../config/wagmi';
import { requestChallenge, verifySignature, setToken } from './api';
import type { VerifySignatureResponse } from '../types';

// ── Authenticate Wallet ───────────────────────────────────────────────────
// Performs the EIP-191 challenge/sign/verify flow with the TrustChain backend.
// If backend is unavailable, gracefully falls back to wallet-only mode.

export async function authenticateWithWallet(address: string): Promise<VerifySignatureResponse> {
  try {
    // Step 1: Request challenge nonce from backend
    const challenge = await requestChallenge(address);

    // Step 2: Sign the challenge message using the connected wallet via Wagmi
    const signature = await signMessage(config, {
      message: challenge.message,
    });

    // Step 3: Send signature to backend for verification & JWT issuance
    const result = await verifySignature(address, signature, challenge.nonce);

    // Step 4: Store JWT token
    if (result.authenticated && result.token) {
      setToken(result.token);
    }

    return result;
  } catch (err: unknown) {
    const errorStr = String(err);

    // Check for user rejection in wallet
    if (
      errorStr.includes('User rejected') ||
      errorStr.includes('UserRejectedRequestError') ||
      errorStr.includes('4001') ||
      errorStr.includes('rejected')
    ) {
      throw new Error('Signature request was rejected in your wallet.');
    }

    // Backend unreachable or offline — provide fallback wallet session
    console.warn('Backend authentication unavailable, running in wallet-connected mode:', err);

    return {
      authenticated: true,
      address: address,
      did: `did:trustchain:${address.toLowerCase()}`,
      is_admin: false,
      is_manager: false,
      is_auditor: false,
      token: '',
      expires_in: 0,
    };
  }
}

// ── Disconnect Wallet ─────────────────────────────────────────────────────

export async function disconnectWallet(): Promise<void> {
  setToken(null);
  try {
    await disconnect(config);
  } catch (err) {
    console.warn('Error disconnecting wallet:', err);
  }
}
