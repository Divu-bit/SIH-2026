/* ═══════════════════════════════════════════════════════════════════════════
   TrustChain — Auth Context
   RainbowKit & Wagmi powered authentication state provider
   ═══════════════════════════════════════════════════════════════════════════ */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import {
  useConnectModal,
  useAccountModal,
  useChainModal,
} from '@rainbow-me/rainbowkit';
import type { AuthState } from '../types';
import {
  authenticateWithWallet,
  disconnectWallet,
} from '../services/auth';
import { setToken, getToken } from '../services/api';

export interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  openWalletModal: () => void;
  openAccountModal?: () => void;
  openChainModal?: () => void;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  address: null,
  did: null,
  isAdmin: false,
  isManager: false,
  isAuditor: false,
  token: null,
};

const AuthContext = createContext<AuthContextType>({
  ...initialState,
  login: async () => {},
  logout: () => {},
  openWalletModal: () => {},
  loading: false,
  error: null,
  isConnected: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address: wagmiAddress, isConnected, status } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();

  const [state, setState] = useState<AuthState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the address we last authenticated for to prevent infinite loops
  const lastAuthenticatedAddress = useRef<string | null>(null);

  // ── Perform Authentication for a specific address ──────────────────────
  const handleAuthenticate = useCallback(async (addr: string) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // Check if we already have a valid session in localStorage for THIS exact address
      const savedAddress = localStorage.getItem('trustchain_address');
      const savedToken = getToken();
      const savedRoles = localStorage.getItem('trustchain_roles');

      if (
        savedToken &&
        savedAddress &&
        savedAddress.toLowerCase() === addr.toLowerCase()
      ) {
        let roles = { isAdmin: false, isManager: false, isAuditor: false };
        try {
          roles = JSON.parse(savedRoles || '{}');
        } catch {}

        const savedDid = localStorage.getItem('trustchain_did') || `did:trustchain:${addr.toLowerCase()}`;
        setState({
          isAuthenticated: true,
          address: addr,
          did: savedDid,
          isAdmin: roles.isAdmin || false,
          isManager: roles.isManager || false,
          isAuditor: roles.isAuditor || false,
          token: savedToken,
        });
        lastAuthenticatedAddress.current = addr.toLowerCase();
        setLoading(false);
        return;
      }

      // Fresh connection or switched account — authenticate with wallet
      const result = await authenticateWithWallet(addr);

      const newState: AuthState = {
        isAuthenticated: true,
        address: result.address,
        did: result.did,
        isAdmin: result.is_admin,
        isManager: result.is_manager,
        isAuditor: result.is_auditor,
        token: result.token,
      };

      // Persist to localStorage
      localStorage.setItem('trustchain_address', result.address);
      localStorage.setItem('trustchain_did', result.did);
      localStorage.setItem(
        'trustchain_roles',
        JSON.stringify({
          isAdmin: result.is_admin,
          isManager: result.is_manager,
          isAuditor: result.is_auditor,
        })
      );

      lastAuthenticatedAddress.current = addr.toLowerCase();
      setState(newState);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      console.error('Wallet authentication failed:', err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // ── Synchronize with Wagmi account changes ─────────────────────────────
  useEffect(() => {
    if (!isConnected || !wagmiAddress) {
      // User disconnected or no wallet
      if (state.isAuthenticated || state.address) {
        setState(initialState);
        lastAuthenticatedAddress.current = null;
        localStorage.removeItem('trustchain_address');
        localStorage.removeItem('trustchain_did');
        localStorage.removeItem('trustchain_roles');
        setToken(null);
      }
      return;
    }

    const currentAddr = wagmiAddress.toLowerCase();

    // If the address is different from what was previously authenticated
    // (e.g. user changed account in MetaMask or newly connected)
    if (lastAuthenticatedAddress.current !== currentAddr) {
      handleAuthenticate(wagmiAddress);
    }
  }, [isConnected, wagmiAddress, state.isAuthenticated, state.address, handleAuthenticate]);

  // ── Login trigger ───────────────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    setError(null);

    if (!isConnected) {
      if (openConnectModal) {
        openConnectModal();
      } else {
        setError('Wallet connection modal is not available.');
      }
      return;
    }

    if (wagmiAddress) {
      await handleAuthenticate(wagmiAddress);
    }
  }, [isConnected, openConnectModal, wagmiAddress, handleAuthenticate]);

  // ── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    disconnectWallet();
    wagmiDisconnect();
    localStorage.removeItem('trustchain_address');
    localStorage.removeItem('trustchain_did');
    localStorage.removeItem('trustchain_roles');
    lastAuthenticatedAddress.current = null;
    setState(initialState);
    setError(null);
  }, [wagmiDisconnect]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login: handleLogin,
        logout: handleLogout,
        openWalletModal: openConnectModal || (() => {}),
        openAccountModal,
        openChainModal,
        loading: loading || status === 'connecting' || status === 'reconnecting',
        error,
        isConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
