export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'AUDITOR' | 'PUBLIC';

export type IdentityStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
export type AssetStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';

export interface Identity {
  did: string;
  controller: string;
  publicKey: string;
  role: UserRole;
  status: IdentityStatus;
  createdAt: string;
  metadataUri: string;
  isSmartAccount?: boolean;
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'date-time';
  description: string;
  required: boolean;
  enum?: string[];
}

export interface CredentialSchema {
  schemaId: string;
  name: string;
  schemaUri: string;
  schemaHash: string;
  version: string;
  author: string;
  isActive: boolean;
  registeredAt: string;
  fields: SchemaField[];
}

export interface AssetRecord {
  tokenId: number;
  assetType: string;
  schemaId: string;
  credentialHash: string;
  ownerDID: string;
  ownerAddress: string;
  issuerDID: string;
  issuerAddress: string;
  issuedAt: string;
  expiresAt?: string;
  status: AssetStatus;
  isTransferable: boolean;
  metadataUri: string;
  credentialData: Record<string, any>;
  signature: string;
  txHash: string;
  blockNumber: number;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  actor: string;
  actorRole: string;
  targetDID?: string;
  tokenId?: number;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  details: Record<string, any>;
}

export interface ProofStep {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface VerificationResult {
  isValid: boolean;
  overallStatus: 'VALID' | 'INVALID' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND';
  tokenId?: number;
  computedHash: string;
  onChainHash?: string;
  issuerDID?: string;
  ownerDID?: string;
  checks: ProofStep[];
  timestamp: string;
}
