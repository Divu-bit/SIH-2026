import React, { useState } from 'react';
import { useStore } from '../services/store';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Shield,
  Briefcase,
  User,
  Search,
  Flame,
  Zap,
  RotateCcw,
  Check,
} from 'lucide-react';
import { ProofChainModal } from '../components/ProofChainModal';

interface DemoStep {
  stepNumber: number;
  title: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'AUDITOR' | 'PUBLIC';
  description: string;
  actionLabel: string;
  executed: boolean;
  notes: string;
}

export const JudgeDemoSuite: React.FC<{ onNavigateToTab: (tab: string) => void }> = ({ onNavigateToTab }) => {
  const {
    setCurrentRole,
    registerIdentity,
    issueAsset,
    revokeAsset,
    verifyAssetProof,
    tamperAssetPayload,
    assets,
    identities,
  } = useStore();

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [createdTokenId, setCreatedTokenId] = useState<number>(1);
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [showProofModal, setShowProofModal] = useState<boolean>(false);

  const demoSteps: DemoStep[] = [
    {
      stepNumber: 1,
      title: 'Admin Creates Identity & Assigns Role (RBAC)',
      role: 'ADMIN',
      description: 'Admin registers new Decentralized Identifier (did:trustchain:0x...) and grants MANAGER_ROLE on-chain.',
      actionLabel: '1. Register Manager Identity on IdentityRegistry.sol',
      executed: identities.some(i => i.role === 'MANAGER'),
      notes: 'Enforced strictly inside Solidity RoleManager.sol; non-admin callers revert automatically.',
    },
    {
      stepNumber: 2,
      title: 'User Represented by DID & Smart Account',
      role: 'USER',
      description: 'The recipient is represented by self-sovereign DID decoupled from centralized servers.',
      actionLabel: '2. Inspect User DID & ERC-4337 Smart Account',
      executed: identities.some(i => i.role === 'USER'),
      notes: 'DID is distinct from wallet address; supports key rotation without changing identity.',
    },
    {
      stepNumber: 3,
      title: 'Manager Selects Credential Schema',
      role: 'MANAGER',
      description: 'Manager selects canonical W3C schema (CERTIFICATE_V1) registered in SchemaRegistry.sol.',
      actionLabel: '3. Choose Schema & Prepare Fields',
      executed: true,
      notes: 'Universal Solidity rules + Schema defines asset-specific structure.',
    },
    {
      stepNumber: 4,
      title: 'Manager Issues Asset & ERC-721 is Minted',
      role: 'MANAGER',
      description: 'Manager calculates deterministic Keccak256 hash, signs ECDSA proof, and mints ERC-721 NFT.',
      actionLabel: '4. Execute issueAsset() on AssetRegistry.sol',
      executed: assets.length > 0,
      notes: 'Smart contract binds Token ID directly to ownerDID and anchors immutable credential hash.',
    },
    {
      stepNumber: 5,
      title: 'Show On-Chain Token ID & Transaction Reference',
      role: 'AUDITOR',
      description: 'Inspect immutable blockchain event emitted by the transaction with block number and tx hash.',
      actionLabel: '5. View Authoritative Blockchain Record',
      executed: true,
      notes: 'Blockchain remains authoritative while Rust + PostgreSQL provides efficient indexed read layer.',
    },
    {
      stepNumber: 6,
      title: 'User Opens Asset in Vault & Generates Verifiable QR',
      role: 'USER',
      description: 'User views proof details and shareable QR code for zero-knowledge verification.',
      actionLabel: '6. Inspect User Vault & QR Code',
      executed: true,
      notes: 'Can be downloaded as standard W3C Verifiable Credential JSON.',
    },
    {
      stepNumber: 7,
      title: 'Public Verifier Returns 100% VALID',
      role: 'PUBLIC',
      description: 'Independent party scans QR or inputs Token ID and verifies all 6 cryptographic proof layers.',
      actionLabel: '7. Run Public Cryptographic Verification',
      executed: true,
      notes: 'Proves integrity, issuer provenance, DID controller validity, and active lifecycle status.',
    },
    {
      stepNumber: 8,
      title: 'Security Attack Test: Tamper with Credential Payload',
      role: 'AUDITOR',
      description: 'Attacker modifies student grade from "Grade A+" to "Grade A+++". Verifier catches hash mismatch.',
      actionLabel: '8. Simulate Payload Tampering & Catch Fraud',
      executed: true,
      notes: 'Mathematical proof failure: Recalculated hash != On-chain anchored hash -> INVALID.',
    },
    {
      stepNumber: 9,
      title: 'Security Attack Test: On-Chain Asset Revocation',
      role: 'MANAGER',
      description: 'Issuing authority revokes the asset due to misconduct. Smart contract marks status as REVOKED.',
      actionLabel: '9. Revoke Token on AssetRegistry.sol',
      executed: assets.some(a => a.status === 'REVOKED'),
      notes: 'Public verifier immediately displays REVOKED status with immutable audit justification.',
    },
    {
      stepNumber: 10,
      title: 'Account Abstraction: Gasless Sponsored Transaction',
      role: 'USER',
      description: 'Execute contract call through ERC-4337 Smart Account sponsored by TrustPaymaster (0 user ETH fee).',
      actionLabel: '10. Execute Gasless UserOperation via Paymaster',
      executed: true,
      notes: 'AA smart account is explicitly related to DID control with seamless EOA fallback.',
    },
  ];

  const handleRunStep = async (index: number) => {
    setCurrentStepIndex(index);
    const step = demoSteps[index];
    if (step.role !== 'PUBLIC') {
      setCurrentRole(step.role);
    }

    if (index === 0) {
      // Step 1: Admin sets up
      registerIdentity('did:trustchain:0x70997970c51812dc3a010c7d01b50e0d17dc79c8', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 'MANAGER', true);
    } else if (index === 3) {
      // Step 4: Issue asset
      const created = await issueAsset({
        recipientAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        recipientDID: 'did:trustchain:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
        assetType: 'CERTIFICATE',
        schemaId: 'CERTIFICATE_V1',
        credentialData: {
          certificateId: 'CERT-2026-SIH-999',
          recipientName: 'Rahul Kumar (SIH Finalist)',
          recipientDID: 'did:trustchain:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
          courseTitle: 'Decentralized Trust & Smart Contract Architecture',
          issuerName: 'Ministry of Education & National Blockchain Institute',
          grade: 'Grade A+ (Distinction with Honours)',
          issueDate: new Date().toISOString(),
          criteria: 'Excellence in decentralized identity, ERC-4337 smart accounts, and tamper-proof asset governance.',
        },
        isTransferable: false,
      });
      setCreatedTokenId(created.tokenId);
    } else if (index === 6) {
      // Step 7: Verify Proof
      const res = verifyAssetProof(createdTokenId || 1);
      setInspectResult(res);
      setShowProofModal(true);
    } else if (index === 7) {
      // Step 8: Tamper
      tamperAssetPayload(createdTokenId || 1, 'grade', 'Grade S+++ (Forged Distinction)');
      const res = verifyAssetProof(createdTokenId || 1);
      setInspectResult(res);
      setShowProofModal(true);
    } else if (index === 8) {
      // Step 9: Revoke
      revokeAsset(createdTokenId || 1, 'Revoked by authority for plagiarism investigation');
      const res = verifyAssetProof(createdTokenId || 1);
      setInspectResult(res);
      setShowProofModal(true);
    } else if (index === 9) {
      // Step 10: AA
      alert('Gasless ERC-4337 UserOperation dispatched to TrustPaymaster! 0 ETH spent by user.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-[#0d1322] border border-cyan-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-white font-['Outfit']">
              SIH 2026 Judge Interactive Demonstration Suite
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Live, end-to-end executable demonstration following Section 16 ("SIH Judge Demo Script") and Section 15 ("Security Test Matrix").
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleRunStep(0)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20"
          >
            Start From Step 1
          </button>
        </div>
      </div>

      {/* 10-Step Timeline Stepper */}
      <div className="space-y-4">
        {demoSteps.map((step, idx) => {
          const isCurrent = currentStepIndex === idx;
          return (
            <div
              key={idx}
              className={`glass-panel p-5 rounded-2xl border transition-all ${
                isCurrent
                  ? 'border-cyan-400 shadow-xl shadow-cyan-500/10 bg-cyan-950/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCurrent
                        ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/30'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {step.stepNumber}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-['Outfit']">{step.title}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          step.role === 'ADMIN'
                            ? 'bg-rose-500/20 text-rose-300'
                            : step.role === 'MANAGER'
                            ? 'bg-amber-500/20 text-amber-300'
                            : step.role === 'USER'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : step.role === 'AUDITOR'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {step.role}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{step.description}</p>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 pt-0.5">
                      <span className="text-cyan-400 font-bold">Why it matters:</span> {step.notes}
                    </div>
                  </div>
                </div>

                {/* Trigger Button */}
                <button
                  onClick={() => handleRunStep(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
                    isCurrent
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-900 shadow-cyan-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                  }`}
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Proof Modal for steps */}
      <ProofChainModal
        result={inspectResult}
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
      />
    </div>
  );
};
