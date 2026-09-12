/* ═══════════════════════════════════════════════════════════════════════════
   RegisterIdentityPage — Admin-only DID registration
   Direct wallet-signed transaction via MetaMask/RainbowKit & Wagmi
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, UserCheck, Loader2, ExternalLink } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useAuth } from '../context/AuthContext';
import { syncIdentity } from '../services/api';
import { CONTRACT_ADDRESSES, IDENTITY_REGISTRY_ABI } from '../config/contracts';
import './FormPage.css';

function formatPublicKey(input: string): `0x${string}` {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '0x') return '0x';
  let hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  hex = hex.replace(/[^0-9a-fA-F]/g, '');
  if (!hex) return '0x';
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  return `0x${hex}` as `0x${string}`;
}

export default function RegisterIdentityPage() {
  const { isAuthenticated, isAdmin, address } = useAuth();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [did, setDid] = useState('');
  const [controller, setController] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [metadataUri, setMetadataUri] = useState('');

  const [isAwaitingSignature, setIsAwaitingSignature] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Sync to database cache once transaction is confirmed on-chain
  useEffect(() => {
    if (isConfirmed && txHash && did && controller) {
      syncIdentity({
        did: did.trim(),
        controller: controller.trim(),
        metadata_uri: metadataUri.trim() || undefined,
        tx_hash: txHash,
      }).catch((err) => {
        console.warn('Background DB sync notice:', err);
      });
    }
  }, [isConfirmed, txHash, did, controller, metadataUri]);

  if (!isAuthenticated || !isConnected) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 600, textAlign: 'center', padding: 'var(--space-16) 0' }}>
          <ShieldAlert size={48} color="var(--warning)" />
          <h3 style={{ marginTop: 'var(--space-4)' }}>Authentication Required</h3>
          <p style={{ color: 'var(--gray-600)' }}>Please connect your wallet to register identities.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 600, textAlign: 'center', padding: 'var(--space-16) 0' }}>
          <ShieldAlert size={48} color="var(--danger)" />
          <h3 style={{ marginTop: 'var(--space-4)' }}>Admin Access Required</h3>
          <p style={{ color: 'var(--gray-600)' }}>Only Admin role can register new identities on the blockchain.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedDid = did.trim();
    const trimmedController = controller.trim();

    if (!trimmedDid.startsWith('did:trustchain:') || trimmedDid.length < 20) {
      setError('DID must start with "did:trustchain:" and be at least 20 characters long.');
      return;
    }

    if (!trimmedController.startsWith('0x') || trimmedController.length !== 42) {
      setError('Controller must be a valid Ethereum address (42 characters starting with 0x).');
      return;
    }

    // Ensure wallet is on Ethereum Sepolia
    if (chainId !== sepolia.id && switchChain) {
      try {
        await switchChain({ chainId: sepolia.id });
      } catch (err: unknown) {
        setError('Please switch your wallet network to Ethereum Sepolia to proceed.');
        return;
      }
    }

    setIsAwaitingSignature(true);
    setTxHash(undefined);

    try {
      const formattedPubKey = formatPublicKey(publicKey);
      const formattedMetadataUri = metadataUri.trim();

      // Trigger wallet transaction signature prompt (MetaMask approval modal)
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'registerIdentity',
        args: [
          trimmedDid,
          trimmedController as `0x${string}`,
          formattedPubKey,
          formattedMetadataUri,
        ],
      });

      setTxHash(hash);
    } catch (err: unknown) {
      const anyErr = err as Record<string, unknown> | null;
      const shortMsg = (anyErr?.shortMessage as string) || (err instanceof Error ? err.message : '');

      if (
        shortMsg.includes('User rejected') ||
        shortMsg.includes('User denied') ||
        shortMsg.includes('user rejected') ||
        anyErr?.name === 'UserRejectedRequestError'
      ) {
        setError('Transaction request was rejected in your wallet.');
      } else if (shortMsg.includes('DID already exists')) {
        setError('This DID string has already been registered on the blockchain.');
      } else if (shortMsg.includes('zero address')) {
        setError('Controller address cannot be the zero address.');
      } else if (shortMsg.includes('not authorized')) {
        setError('Your wallet is not authorized to register this DID.');
      } else {
        setError(shortMsg || (err instanceof Error ? err.message : 'Registration failed'));
      }
    } finally {
      setIsAwaitingSignature(false);
    }
  };

  const isBusy = isAwaitingSignature || isConfirming;

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 700 }}>
        <h2 className="section-title">Register Identity</h2>
        <p style={{ textAlign: 'center', color: 'var(--gray-600)', marginBottom: 'var(--space-8)' }}>
          Register a new W3C Decentralized Identifier (DID) directly on the IdentityRegistry smart contract.
          Transactions will be confirmed and signed directly by your connected wallet.
        </p>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-8)' }}>
          <div className="form-group">
            <label className="form-label">DID String *</label>
            <input
              type="text"
              className="form-input"
              placeholder="did:trustchain:employee-003"
              value={did}
              onChange={(e) => setDid(e.target.value)}
              required
              disabled={isBusy}
            />
          </div>

          <div className="form-group">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-1)',
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                Controller Address *
              </label>
              {address && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setController(address)}
                  title="Auto-fill your connected wallet address"
                  disabled={isBusy}
                >
                  <UserCheck size={14} /> Self ({address.slice(0, 6)}...{address.slice(-4)})
                </button>
              )}
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="0x..."
              value={controller}
              onChange={(e) => setController(e.target.value)}
              required
              disabled={isBusy}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Public Key (hex, optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="0xabcdef... or raw hex"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              disabled={isBusy}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Metadata URI (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="ipfs://QmTestEmployee001"
              value={metadataUri}
              onChange={(e) => setMetadataUri(e.target.value)}
              disabled={isBusy}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isBusy}
            style={{
              width: '100%',
              marginTop: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isAwaitingSignature && (
              <>
                <Loader2 size={18} className="spin" />
                Approve in MetaMask...
              </>
            )}
            {!isAwaitingSignature && isConfirming && (
              <>
                <Loader2 size={18} className="spin" />
                Confirming on Sepolia...
              </>
            )}
            {!isBusy && 'Register Identity'}
          </button>
        </form>

        {error && (
          <div className="form-error" style={{ marginTop: 'var(--space-4)' }}>
            {error}
          </div>
        )}

        {isAwaitingSignature && (
          <div
            className="card"
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-4)',
              borderLeft: '4px solid var(--primary)',
              background: '#f0f4ff',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Loader2 size={20} className="spin" color="var(--primary)" />
            <div>
              <strong>Signature Request Sent to Wallet</strong>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--gray-700)' }}>
                Please check MetaMask and confirm the transaction to register <code>{did}</code>.
              </p>
            </div>
          </div>
        )}

        {txHash && !isConfirmed && (
          <div
            className="card"
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-4)',
              borderLeft: '4px solid var(--warning)',
              background: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Loader2 size={20} className="spin" color="var(--warning)" />
            <div>
              <strong>Transaction Broadcasted to Sepolia</strong>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--gray-700)' }}>
                Waiting for block confirmation...{' '}
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
                >
                  View on Etherscan <ExternalLink size={12} />
                </a>
              </p>
            </div>
          </div>
        )}

        {isConfirmed && txHash && (
          <div className="form-success" style={{ marginTop: 'var(--space-4)' }}>
            <CheckCircle size={18} />
            <span>
              Identity <strong>{did}</strong> successfully registered on-chain! —{' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 600 }}
              >
                View Transaction on Etherscan
              </a>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
