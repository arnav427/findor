import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  KeyRound,
  Clock,
  Building2,
  AlertTriangle,
  RefreshCw,
  FileText,
  ScanLine,
} from 'lucide-react';
import { OwnershipClaim, CustodyDesk, User, AuditLogEntry } from '../types';

interface ClaimsAndHandoverViewProps {
  user: User;
  claims: OwnershipClaim[];
  custodyDesks: CustodyDesk[];
  auditLogs: AuditLogEntry[];
  onReviewClaim: (claimId: string, decision: 'approved' | 'rejected', notes: string) => Promise<void>;
  onValidateHandover: (
    codeOrToken: string,
    custodyDeskId: string,
    staffNotes: string
  ) => Promise<string>;
  onRegenerateToken: (
    claimId: string,
    custodyDeskId?: string,
    pickupWindow?: string
  ) => Promise<void>;
  onQuickSwitchToStaff?: () => void;
}

export const ClaimsAndHandoverView: React.FC<ClaimsAndHandoverViewProps> = ({
  user,
  claims,
  custodyDesks,
  auditLogs,
  onReviewClaim,
  onValidateHandover,
  onRegenerateToken,
  onQuickSwitchToStaff,
}) => {
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [scannerInput, setScannerInput] = useState('');
  const [stationedDeskId, setStationedDeskId] = useState(
    custodyDesks[1]?.id || custodyDesks[0]?.id || ''
  );
  const [staffNotes, setStaffNotes] = useState('');
  const [scannerFeedback, setScannerFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  const canValidateHandover = user.role === 'custody_staff' || user.role === 'admin';

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerInput.trim()) return;
    setValidating(true);
    setScannerFeedback(null);
    try {
      const msg = await onValidateHandover(
        scannerInput.trim(),
        stationedDeskId,
        staffNotes.trim()
      );
      setScannerFeedback({ type: 'success', text: msg });
      setScannerInput('');
      setStaffNotes('');
    } catch (err: any) {
      setScannerFeedback({
        type: 'error',
        text: err?.message || 'Handover validation failed.',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleRotate = async (claim: OwnershipClaim) => {
    setRotatingId(claim.id);
    try {
      await onRegenerateToken(claim.id, claim.custodyDeskId, claim.pickupWindow);
    } finally {
      setRotatingId(null);
    }
  };

  const handoverAuditEvents = auditLogs.filter(
    (log) => log.action.includes('HANDOVER') || log.action.includes('CLAIM_APPROVED')
  );

  const getStepProgress = (status: OwnershipClaim['status']) => {
    if (status === 'completed') return 4;
    if (status === 'approved') return 3;
    if (status === 'under_review') return 2;
    return 1;
  };

  return (
    <div className="space-y-6">
      {/* Custody Desk Staff / Admin QR & OTP Handover Terminal */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <QrCode className="w-4 h-4" />
              Secure Custody Desk Handover Terminal
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Claims &amp; Short-Lived QR / OTP Handover
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upon claim approval, Findora issues a cryptographically random, short-lived pickup token and 6-digit OTP. Authorized Custody Desk staff validate the token here to atomically mark the item as Returned and append a permanent handover audit record.
            </p>
          </div>

          {!canValidateHandover && onQuickSwitchToStaff && (
            <button
              type="button"
              onClick={onQuickSwitchToStaff}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              Switch to Custody Officer Role to Validate →
            </button>
          )}
        </div>

        {canValidateHandover ? (
          <form
            onSubmit={handleScanSubmit}
            className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Designated Custody Desk
              </label>
              <select
                value={stationedDeskId}
                onChange={(e) => setStationedDeskId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              >
                {custodyDesks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                6-Digit OTP or Scanned QR Token *
              </label>
              <input
                type="text"
                required
                value={scannerInput}
                onChange={(e) => setScannerInput(e.target.value)}
                placeholder="e.g., 849204 or FND-HANDOVER-849204-..."
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Custody Officer Verification Note
              </label>
              <input
                type="text"
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="e.g., Checked student ID NIT-CS-0842"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={validating}
                className="w-full py-2 px-3 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ScanLine className="w-3.5 h-3.5" />
                {validating ? 'Verifying...' : 'Confirm Return'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400">
            Signed in as <span className="font-semibold text-slate-900 dark:text-white">{user.fullName}</span> ({user.role.replace('_', ' ')}). Only authorized Custody Desk staff or Administrators can execute final QR/OTP validation. Present your pickup QR code or 6-digit OTP below at the desk.
          </div>
        )}

        {scannerFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
              scannerFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {scannerFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{scannerFeedback.text}</span>
          </div>
        )}
      </div>

      {/* Claims List & QR Pickup Passes */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Ownership Claims &amp; Short-Lived Pickup Passes ({claims.length})
        </h2>

        {claims.length === 0 ? (
          <div className="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-500 shadow-xs">
            No ownership claims submitted yet. Review a potential match to submit a claim.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {claims.map((claim) => {
              const desk = custodyDesks.find((d) => d.id === claim.custodyDeskId);
              const isReviewer =
                user.role === 'custody_staff' ||
                user.role === 'admin' ||
                (user.id === claim.finderId && user.id !== claim.claimantId);

              const isExpired =
                claim.handoverExpiresAt &&
                Date.now() > new Date(claim.handoverExpiresAt).getTime();

              const currentStep = getStepProgress(claim.status);

              return (
                <div
                  key={claim.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs"
                >
                  {/* 4-Step Claim Progress Indicator */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
                    {[
                      { num: 1, label: '01. Claim Submitted' },
                      { num: 2, label: '02. Authorized Review' },
                      { num: 3, label: '03. QR / OTP Issued' },
                      { num: 4, label: '04. Return Completed' },
                    ].map((s) => {
                      const done = currentStep >= s.num;
                      return (
                        <div
                          key={s.num}
                          className={`px-3 py-2 rounded-xl border font-semibold ${
                            done
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}
                        >
                          {s.label}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-8 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono">{claim.id}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold uppercase ${
                            claim.status === 'approved' || claim.status === 'completed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : claim.status === 'rejected'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          Status: {claim.status.replace('_', ' ')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Claimant: {claim.claimantName} (Tier {claim.claimantTier} Verified)
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">
                          Evidence Match: {claim.automatedEvidenceSimilarity}%
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {claim.foundReportTitle}
                      </h3>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 text-xs">
                        <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Submitted Ownership Evidence (Protected):
                        </div>
                        <p className="text-slate-800 dark:text-slate-200">
                          &ldquo;{claim.secretCharacteristicAnswer}&rdquo;
                        </p>
                        {claim.additionalOwnershipProof && (
                          <p className="text-slate-500 dark:text-slate-400">
                            Supporting proof: {claim.additionalOwnershipProof}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          {desk?.name || 'Designated Custody Desk'} ({desk?.floorRoom})
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Window: {claim.pickupWindow}
                        </span>
                      </div>

                      {claim.reviewerNotes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Audit / Reviewer Record: {claim.reviewerNotes}
                        </p>
                      )}

                      {/* Reviewer Controls when claim is pending or under_review */}
                      {isReviewer &&
                        (claim.status === 'pending' || claim.status === 'under_review') && (
                          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={reviewNotesMap[claim.id] || ''}
                              onChange={(e) =>
                                setReviewNotesMap((prev) => ({
                                  ...prev,
                                  [claim.id]: e.target.value,
                                }))
                              }
                              placeholder="Optional review note before approving or rejecting..."
                              className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onReviewClaim(
                                  claim.id,
                                  'approved',
                                  reviewNotesMap[claim.id] ||
                                    'Verified secret characteristic. Approved for custody handover.'
                                )
                              }
                              className="inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve &amp; Issue Pickup Token
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onReviewClaim(
                                  claim.id,
                                  'rejected',
                                  reviewNotesMap[claim.id] ||
                                    'Ownership answer did not match recorded characteristic.'
                                )
                              }
                              className="inline-flex items-center justify-center gap-1 px-3.5 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors whitespace-nowrap shrink-0"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        )}
                    </div>

                    {/* Right Column: Live Scannable QR Code & 6-Digit OTP Pass */}
                    <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                      {claim.status === 'approved' && claim.handoverToken ? (
                        <div className="space-y-3 w-full">
                          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            SHORT-LIVED PICKUP QR &amp; OTP PASS
                          </div>
                          <div className="p-3 bg-white rounded-xl inline-block border border-slate-200 shadow-xs">
                            <QRCodeSVG value={claim.handoverToken} size={132} level="M" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">6-Digit Custody OTP</div>
                            <div className="text-2xl font-bold font-mono tabular-nums tracking-widest text-slate-900 dark:text-white">
                              {claim.handoverOtp}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate px-2">
                              {claim.handoverToken}
                            </div>
                            {claim.handoverExpiresAt && (
                              <div className="text-[11px] font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                                {isExpired
                                  ? 'Token Expired — Rotate Below'
                                  : `Expires: ${new Date(claim.handoverExpiresAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5 pt-1">
                            {canValidateHandover && (
                              <button
                                type="button"
                                onClick={() => {
                                  setScannerInput(claim.handoverOtp || claim.handoverToken!);
                                  setStationedDeskId(claim.custodyDeskId);
                                }}
                                className="w-full py-2 px-3 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                              >
                                Load into Desk Validator ↑
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRotate(claim)}
                              disabled={rotatingId === claim.id}
                              className="inline-flex items-center justify-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              <RefreshCw className="w-3 h-3" />
                              {rotatingId === claim.id ? 'Rotating Token...' : 'Refresh Short-Lived Token'}
                            </button>
                          </div>
                        </div>
                      ) : claim.status === 'completed' ? (
                        <div className="space-y-2 py-4">
                          <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Handover Completed &amp; Audited
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            {claim.handoverCompletedAt
                              ? new Date(claim.handoverCompletedAt).toLocaleString()
                              : 'Verified Return'}
                          </div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            Single-use token consumed atomically
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 py-4 text-xs text-slate-500 dark:text-slate-400">
                          <QrCode className="w-8 h-8 text-slate-400 mx-auto" />
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            QR &amp; OTP Issued Upon Approval
                          </div>
                          <p>
                            Once the finder or Custody Desk officer approves this ownership claim, a short-lived pickup QR code and 6-digit OTP appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auditable Handover & Token Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Custody Handover &amp; Token Audit Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Every token generation, rotation, and custody desk validation is recorded on the backend for full accountability.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {handoverAuditEvents.length} handover events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Authorized Officer / Actor</th>
                <th className="py-3 px-4 font-semibold">Operation</th>
                <th className="py-3 px-4 font-semibold">Audit Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {handoverAuditEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {new Date(ev.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {ev.actorName} ({ev.actorRole})
                  </td>
                  <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap">
                    {ev.action}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {ev.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
