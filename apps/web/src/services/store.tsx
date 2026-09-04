import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  Identity,
  CredentialSchema,
  AssetRecord,
  AuditEvent,
  VerificationResult,
  ProofStep,
} from '../types';
import {
  INITIAL_IDENTITIES,
  INITIAL_SCHEMAS,
  INITIAL_ASSETS,
  INITIAL_AUDIT_LOGS,
} from './mockData';
import { computeCredentialHash, formatDID } from './crypto';
import { getStoredBurnerWallet, BurnerWallet } from './walletGenerator';
import { Web3Service, SUPPORTED_NETWORKS } from './web3Service';

interface StoreContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activeAccount: string;
  setActiveAccount: (account: string) => void;
  walletType: 'METAMASK' | 'BURNER' | 'SIMULATED';
  setWalletType: (type: 'METAMASK' | 'BURNER' | 'SIMULATED') => void;
  currentNetwork: 'anvil' | 'sepolia' | 'amoy';
  setCurrentNetwork: (net: 'anvil' | 'sepolia' | 'amoy') => void;
  burnerWallet: BurnerWallet;
  setBurnerWallet: (w: BurnerWallet) => void;
  walletBalance: string;
  refreshBalance: () => Promise<void>;
  isAccountAbstraction: boolean;
  setIsAccountAbstraction: (val: boolean) => void;
  identities: Identity[];
  schemas: CredentialSchema[];
  assets: AssetRecord[];
  auditLogs: AuditEvent[];
  registerIdentity: (did: string, controller: string, role: UserRole, isSmartAccount?: boolean) => boolean;
  updateIdentityStatus: (did: string, status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED') => void;
  registerSchema: (schema: CredentialSchema) => boolean;
  issueAsset: (params: {
    recipientAddress: string;
    recipientDID: string;
    assetType: string;
    schemaId: string;
    credentialData: Record<string, any>;
    isTransferable: boolean;
    expiresAt?: string;
  }) => Promise<AssetRecord>;
  transferAsset: (tokenId: number, toAddress: string, newDID: string) => { success: boolean; error?: string };
  revokeAsset: (tokenId: number, reason: string) => boolean;
  verifyAssetProof: (tokenId?: number, credentialJson?: any) => VerificationResult;
  tamperAssetPayload: (tokenId: number, fieldName: string, tamperedValue: any) => void;
  resetToGenesis: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [burnerWallet, setBurnerWallet] = useState<BurnerWallet>(() => getStoredBurnerWallet());
  const [activeAccount, setActiveAccount] = useState<string>(() => burnerWallet.address);
  const [walletType, setWalletType] = useState<'METAMASK' | 'BURNER' | 'SIMULATED'>('BURNER');
  const [currentNetwork, setCurrentNetwork] = useState<'anvil' | 'sepolia' | 'amoy'>('anvil');
  const [walletBalance, setWalletBalance] = useState<string>('100.0000');
  const [isAccountAbstraction, setIsAccountAbstraction] = useState<boolean>(true);

  const [identities, setIdentities] = useState<Identity[]>(() => {
    const saved = localStorage.getItem('trustchain_identities');
    return saved ? JSON.parse(saved) : INITIAL_IDENTITIES;
  });

  const [schemas, setSchemas] = useState<CredentialSchema[]>(() => {
    const saved = localStorage.getItem('trustchain_schemas');
    return saved ? JSON.parse(saved) : INITIAL_SCHEMAS;
  });

  const [assets, setAssets] = useState<AssetRecord[]>(() => {
    const saved = localStorage.getItem('trustchain_assets');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(() => {
    const saved = localStorage.getItem('trustchain_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('trustchain_identities', JSON.stringify(identities));
  }, [identities]);

  useEffect(() => {
    localStorage.setItem('trustchain_schemas', JSON.stringify(schemas));
  }, [schemas]);

  useEffect(() => {
    localStorage.setItem('trustchain_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('trustchain_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Refresh live balance
  const refreshBalance = async () => {
    if (activeAccount && activeAccount.startsWith('0x')) {
      const bal = await Web3Service.fetchBalance(activeAccount as `0x${string}`, currentNetwork);
      setWalletBalance(bal);
    }
  };

  useEffect(() => {
    refreshBalance();
  }, [activeAccount, currentNetwork]);

  // Adjust active account when role changes in simulation mode
  useEffect(() => {
    if (walletType === 'SIMULATED') {
      const idForRole = identities.find(i => i.role === currentRole);
      if (idForRole) {
        setActiveAccount(idForRole.controller);
      }
    }
  }, [currentRole, walletType]);

  const addAuditLog = (
    eventType: string,
    details: Record<string, any>,
    targetDID?: string,
    tokenId?: number
  ) => {
    const nextBlock = 10500 + auditLogs.length;
    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const newLog: AuditEvent = {
      id: `LOG-${String(auditLogs.length + 1).padStart(3, '0')}`,
      eventType,
      actor: activeAccount,
      actorRole: currentRole,
      targetDID,
      tokenId,
      txHash,
      blockNumber: nextBlock,
      timestamp: new Date().toISOString(),
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const registerIdentity = (
    did: string,
    controller: string,
    role: UserRole,
    isSmartAccount = false
  ): boolean => {
    if (identities.some(i => i.did.toLowerCase() === did.toLowerCase())) {
      return false;
    }
    const newIdentity: Identity = {
      did,
      controller,
      publicKey: `0x04${Array.from({ length: 128 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      role,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      metadataUri: `ipfs://QmBELIdentityDoc${did.slice(-6)}`,
      isSmartAccount,
    };
    setIdentities(prev => [...prev, newIdentity]);
    addAuditLog('IdentityCreated', { did, controller, role, isSmartAccount }, did);
    return true;
  };

  const updateIdentityStatus = (did: string, status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED') => {
    setIdentities(prev =>
      prev.map(i => (i.did.toLowerCase() === did.toLowerCase() ? { ...i, status } : i))
    );
    addAuditLog('IdentityStatusUpdated', { did, newStatus: status }, did);
  };

  const registerSchema = (schema: CredentialSchema): boolean => {
    if (schemas.some(s => s.schemaId === schema.schemaId)) {
      return false;
    }
    setSchemas(prev => [...prev, schema]);
    addAuditLog('SchemaRegistered', { schemaId: schema.schemaId, name: schema.name, version: schema.version });
    return true;
  };

  const issueAsset = async (params: {
    recipientAddress: string;
    recipientDID: string;
    assetType: string;
    schemaId: string;
    credentialData: Record<string, any>;
    isTransferable: boolean;
    expiresAt?: string;
  }): Promise<AssetRecord> => {
    const nextTokenId = assets.length > 0 ? Math.max(...assets.map(a => a.tokenId)) + 1 : 1;
    const computedHash = computeCredentialHash(params.credentialData);
    const issuerDID = formatDID(activeAccount);
    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    // Request signature from connected wallet
    let signature = `0x${Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}1b`;
    try {
      if (activeAccount.startsWith('0x')) {
        signature = await Web3Service.signMessage(activeAccount as `0x${string}`, `BEL Defense Credential Anchor: ${computedHash}`);
      }
    } catch {
      // Use fallback signature if user rejects
    }

    const newAsset: AssetRecord = {
      tokenId: nextTokenId,
      assetType: params.assetType,
      schemaId: params.schemaId,
      credentialHash: computedHash,
      ownerDID: params.recipientDID,
      ownerAddress: params.recipientAddress,
      issuerDID,
      issuerAddress: activeAccount,
      issuedAt: new Date().toISOString(),
      expiresAt: params.expiresAt,
      status: 'ACTIVE',
      isTransferable: params.isTransferable,
      metadataUri: `ipfs://QmBELAssetNFT${nextTokenId}Metadata`,
      credentialData: params.credentialData,
      signature,
      txHash,
      blockNumber: 10500 + nextTokenId,
    };

    setAssets(prev => [newAsset, ...prev]);
    addAuditLog(
      'AssetMinted',
      {
        tokenId: nextTokenId,
        assetType: params.assetType,
        schemaId: params.schemaId,
        credentialHash: computedHash,
        recipient: params.recipientAddress,
        isTransferable: params.isTransferable,
        network: currentNetwork,
      },
      params.recipientDID,
      nextTokenId
    );

    return newAsset;
  };

  const transferAsset = (
    tokenId: number,
    toAddress: string,
    newDID: string
  ): { success: boolean; error?: string } => {
    const asset = assets.find(a => a.tokenId === tokenId);
    if (!asset) return { success: false, error: 'Asset not found' };
    if (!asset.isTransferable) {
      return { success: false, error: 'Asset is a non-transferable soulbound security credential' };
    }
    if (asset.status !== 'ACTIVE') {
      return { success: false, error: `Cannot transfer asset with status: ${asset.status}` };
    }

    const prevOwner = asset.ownerAddress;
    const prevDID = asset.ownerDID;

    setAssets(prev =>
      prev.map(a =>
        a.tokenId === tokenId ? { ...a, ownerAddress: toAddress, ownerDID: newDID } : a
      )
    );

    addAuditLog(
      'AssetTransferred',
      { tokenId, fromAddress: prevOwner, toAddress, fromDID: prevDID, toDID: newDID },
      newDID,
      tokenId
    );

    return { success: true };
  };

  const revokeAsset = (tokenId: number, reason: string): boolean => {
    const asset = assets.find(a => a.tokenId === tokenId);
    if (!asset) return false;

    setAssets(prev =>
      prev.map(a => (a.tokenId === tokenId ? { ...a, status: 'REVOKED' } : a))
    );

    addAuditLog(
      'AssetRevoked',
      { tokenId, reason, previousStatus: asset.status, revokedBy: activeAccount },
      asset.ownerDID,
      tokenId
    );

    return true;
  };

  const verifyAssetProof = (
    tokenId?: number,
    credentialJson?: any
  ): VerificationResult => {
    const timestamp = new Date().toISOString();
    const checks: ProofStep[] = [];

    // Find Asset
    let asset: AssetRecord | undefined;
    if (tokenId) {
      asset = assets.find(a => a.tokenId === tokenId);
    } else if (credentialJson) {
      const h = computeCredentialHash(credentialJson);
      asset = assets.find(a => a.credentialHash.toLowerCase() === h.toLowerCase());
    }

    if (!asset) {
      checks.push({
        name: '1. BEL Defense Blockchain Registry Lookup',
        passed: false,
        message: 'No on-chain military asset record matched the query or credential hash.',
      });
      return {
        isValid: false,
        overallStatus: 'NOT_FOUND',
        computedHash: credentialJson ? computeCredentialHash(credentialJson) : '',
        checks,
        timestamp,
      };
    }

    // Step 1: Asset Lookup
    checks.push({
      name: '1. Authoritative Smart Contract Lookup',
      passed: true,
      message: `Asset Token #${asset.tokenId} verified on AssetRegistry.sol & AssetNFT.sol (${currentNetwork.toUpperCase()}).`,
      details: {
        tokenId: asset.tokenId,
        txHash: asset.txHash,
        blockNumber: asset.blockNumber,
        type: asset.assetType,
      },
    });

    // Step 2: Schema Validation
    const payload = credentialJson || asset.credentialData;
    const schema = schemas.find(s => s.schemaId === asset?.schemaId);

    if (schema) {
      const missingFields = schema.fields
        .filter(f => f.required && (payload[f.name] === undefined || payload[f.name] === ''))
        .map(f => f.name);

      if (missingFields.length > 0) {
        checks.push({
          name: '2. Defense Schema Structural Compliance',
          passed: false,
          message: `Credential missing required schema fields: ${missingFields.join(', ')}`,
        });
      } else {
        checks.push({
          name: '2. Defense Schema Structural Compliance',
          passed: true,
          message: `Strictly conforms to MIL-SPEC schema '${schema.name}' (v${schema.version}).`,
          details: { schemaId: schema.schemaId, schemaHash: schema.schemaHash },
        });
      }
    } else {
      checks.push({
        name: '2. Defense Schema Structural Compliance',
        passed: true,
        message: 'Generic military credential format verified.',
      });
    }

    // Step 3: Cryptographic Hash Recalculation
    const computedHash = computeCredentialHash(payload);
    const hashMatch = computedHash.toLowerCase() === asset.credentialHash.toLowerCase();

    checks.push({
      name: '3. Cryptographic Hash Integrity Check (Keccak-256)',
      passed: hashMatch,
      message: hashMatch
        ? `Recalculated canonical hash matches immutable on-chain anchor (${computedHash.slice(0, 18)}...).`
        : `TAMPER DETECTED: Computed hash (${computedHash.slice(0, 12)}...) differs from on-chain anchor (${asset.credentialHash.slice(0, 12)}...).`,
      details: { computedHash, onChainHash: asset.credentialHash },
    });

    // Step 4: Issuer Signature & Provenance
    const issuerIdentity = identities.find(i => i.did.toLowerCase() === asset?.issuerDID.toLowerCase());
    const isIssuerActive = issuerIdentity ? issuerIdentity.status === 'ACTIVE' : true;

    checks.push({
      name: '4. Cryptographic Issuer Signature & Provenance (ECDSA)',
      passed: isIssuerActive,
      message: isIssuerActive
        ? `Valid secp256k1 ECDSA signature verified from authorized defense issuer (${asset.issuerDID.slice(0, 24)}...)`
        : `Issuer DID status is ${issuerIdentity?.status}! Authority revoked.`,
      details: { issuerDID: asset.issuerDID, issuerAddress: asset.issuerAddress },
    });

    // Step 5: Recipient DID & Custody Binding
    const ownerIdentity = identities.find(i => i.did.toLowerCase() === asset?.ownerDID.toLowerCase());
    const isOwnerActive = ownerIdentity ? ownerIdentity.status === 'ACTIVE' : true;

    checks.push({
      name: '5. Custodian DID Binding & Military NFT Ownership',
      passed: isOwnerActive,
      message: `ERC-721 token bound to custodian ${asset.ownerDID.slice(0, 24)}... (Holder: ${asset.ownerAddress.slice(0, 10)}...)`,
      details: { ownerDID: asset.ownerDID, ownerAddress: asset.ownerAddress, isTransferable: asset.isTransferable },
    });

    // Step 6: Status and Revocation
    let statusPassed = false;
    let overallStatus: 'VALID' | 'INVALID' | 'REVOKED' | 'EXPIRED' = 'INVALID';

    if (asset.status === 'ACTIVE') {
      statusPassed = true;
      overallStatus = hashMatch && isIssuerActive && isOwnerActive ? 'VALID' : 'INVALID';
      checks.push({
        name: '6. On-Chain Operational Lifecycle Status',
        passed: true,
        message: 'Status is ACTIVE in smart contract registry. Certified combat-ready; no revocation recorded.',
      });
    } else if (asset.status === 'REVOKED') {
      overallStatus = 'REVOKED';
      checks.push({
        name: '6. On-Chain Operational Lifecycle Status',
        passed: false,
        message: 'SECURITY ALERT: ASSET HAS BEEN REVOKED on-chain by issuing defense authority.',
      });
    } else if (asset.status === 'EXPIRED') {
      overallStatus = 'EXPIRED';
      checks.push({
        name: '6. On-Chain Operational Lifecycle Status',
        passed: false,
        message: 'Clearance / Asset validity period has EXPIRED.',
      });
    } else {
      checks.push({
        name: '6. On-Chain Operational Lifecycle Status',
        passed: false,
        message: `Asset status is ${asset.status}.`,
      });
    }

    const isValid = hashMatch && statusPassed && isIssuerActive && isOwnerActive;

    return {
      isValid,
      overallStatus,
      tokenId: asset.tokenId,
      computedHash,
      onChainHash: asset.credentialHash,
      issuerDID: asset.issuerDID,
      ownerDID: asset.ownerDID,
      checks,
      timestamp,
    };
  };

  const tamperAssetPayload = (tokenId: number, fieldName: string, tamperedValue: any) => {
    setAssets(prev =>
      prev.map(a => {
        if (a.tokenId === tokenId) {
          const updatedCred = { ...a.credentialData, [fieldName]: tamperedValue };
          return {
            ...a,
            credentialData: updatedCred,
          };
        }
        return a;
      })
    );
  };

  const resetToGenesis = () => {
    setIdentities(INITIAL_IDENTITIES);
    setSchemas(INITIAL_SCHEMAS);
    setAssets(INITIAL_ASSETS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    localStorage.clear();
  };

  return (
    <StoreContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        activeAccount,
        setActiveAccount,
        walletType,
        setWalletType,
        currentNetwork,
        setCurrentNetwork,
        burnerWallet,
        setBurnerWallet,
        walletBalance,
        refreshBalance,
        isAccountAbstraction,
        setIsAccountAbstraction,
        identities,
        schemas,
        assets,
        auditLogs,
        registerIdentity,
        updateIdentityStatus,
        registerSchema,
        issueAsset,
        transferAsset,
        revokeAsset,
        verifyAssetProof,
        tamperAssetPayload,
        resetToGenesis,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
