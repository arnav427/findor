import React, { useState, useMemo } from 'react';
import {
  Send,
  ShieldCheck,
  Lock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  FileText,
  ArrowLeft,
  MapPin,
  Clock,
  KeyRound,
  GripVertical,
  Flag,
  Archive,
  Building2,
  Search,
  Box,
} from 'lucide-react';
import {
  User,
  ChatConversation,
  ChatMessage,
  VerificationRequestRecord,
  DisputeRecord,
  AuditLogEntry,
  ItemReport,
  CustodyDesk,
  PotentialMatch,
} from '../types';

// 1. SECURE IN-APP CHAT VIEW WITH ABUSE MODERATION
export const SecureChatView: React.FC<{
  user: User;
  conversations: ChatConversation[];
  messages: ChatMessage[];
  onSendMessage: (conversationId: string, text: string) => Promise<void>;
  onReportAbuse?: (conversationId: string, reason: string) => Promise<void>;
}> = ({ user, conversations, messages, onSendMessage, onReportAbuse }) => {
  const [activeConvId, setActiveConvId] = useState<string | null>(
    conversations[0]?.id || null
  );
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [abuseNotice, setAbuseNotice] = useState<string | null>(null);

  const activeConv =
    conversations.find((c) => c.id === activeConvId) || conversations[0] || null;
  const activeMessages = messages.filter((m) => m.conversationId === activeConv?.id);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !draft.trim()) return;
    setSending(true);
    try {
      await onSendMessage(activeConv.id, draft.trim());
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  const handleFlagConversation = async () => {
    if (!activeConv || !onReportAbuse) return;
    await onReportAbuse(
      activeConv.id,
      'Participant flagged thread for Custody Desk / Admin moderation review.'
    );
    setAbuseNotice(
      'Conversation flagged for administrative moderation and recorded in the Dispute & Security queue.'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Secure In-App Coordination Chat
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Coordinate pickup windows with finders and Custody Desk officers without exposing personal phone numbers or email addresses.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Lock className="w-4 h-4" />
          <span>Automatic Contact Masking Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Conversations List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Authorized Participant Threads ({conversations.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Linked to active reports and verified claims
            </p>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-xs text-slate-500 text-center">
                No active conversations yet. Submitting a claim opens a secure thread with the finder and Custody Desk.
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setAbuseNotice(null);
                  }}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    activeConv?.id === conv.id ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span className="truncate">
                      Report {conv.reportId} · {conv.participantNames.join(', ')}
                    </span>
                    {conv.status === 'reported' && (
                      <span className="text-rose-600 font-bold uppercase text-[10px]">Flagged</span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {conv.reportTitle}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-1">
                    {conv.lastMessageText}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Chat Messages Panel */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-[540px] shadow-xs">
          {activeConv ? (
            <>
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {activeConv.reportTitle}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Participants: {activeConv.participantNames.join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {onReportAbuse && (
                    <button
                      type="button"
                      onClick={handleFlagConversation}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100"
                    >
                      <Flag className="w-3 h-3" />
                      Report Abuse
                    </button>
                  )}
                </div>
              </div>

              {abuseNotice && (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                  {abuseNotice}
                </div>
              )}

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {activeMessages.map((m) => {
                  const isMe = m.senderId === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[11px] text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {m.senderName}
                        </span>{' '}
                        · Tier {m.senderTier} Verified ·{' '}
                        <span className="font-mono tabular-nums">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-lg px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSend}
                className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message regarding handover window or custody desk..."
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. DEDICATED ITEM REPORT DETAILS & CLAIM SUBMISSION VIEW
export const ItemDetailView: React.FC<{
  report: ItemReport;
  matches: PotentialMatch[];
  custodyDesks: CustodyDesk[];
  onBack: () => void;
  onOpen3DViewer?: (report: ItemReport) => void;
  onSubmitClaim: (payload: {
    matchId?: string;
    lostReportId?: string;
    foundReportId: string;
    secretCharacteristicAnswer: string;
    additionalOwnershipProof: string;
    custodyDeskId: string;
    pickupWindow: string;
  }) => Promise<void>;
}> = ({ report, matches, custodyDesks, onBack, onOpen3DViewer, onSubmitClaim }) => {
  const [secretAnswer, setSecretAnswer] = useState('');
  const [additionalProof, setAdditionalProof] = useState('');
  const [selectedDeskId, setSelectedDeskId] = useState(
    report.designatedCustodyDeskId || custodyDesks[0]?.id || ''
  );
  const [pickupWindow, setPickupWindow] = useState('Today, 14:00 – 18:00');
  const [submitting, setSubmitting] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const relatedMatches = matches.filter(
    (m) => m.lostReportId === report.id || m.foundReportId === report.id
  );

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setClaimMsg(null);
    try {
      await onSubmitClaim({
        matchId: relatedMatches[0]?.id,
        lostReportId: relatedMatches[0]?.lostReportId,
        foundReportId: report.id,
        secretCharacteristicAnswer: secretAnswer,
        additionalOwnershipProof: additionalProof,
        custodyDeskId: selectedDeskId,
        pickupWindow,
      });
      setClaimMsg({
        type: 'ok',
        text: 'Ownership claim submitted! Review status and pickup QR/OTP in the Claims & Handover tab.',
      });
      setSecretAnswer('');
    } catch (err: any) {
      setClaimMsg({ type: 'err', text: err?.message || 'Failed to submit claim.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Explore Items
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Item Details Card */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              <span
                className={
                  report.type === 'lost'
                    ? 'font-bold uppercase text-rose-600 dark:text-rose-400'
                    : 'font-bold uppercase text-emerald-600 dark:text-emerald-400'
                }
              >
                {report.type} REPORT
              </span>
              <span aria-hidden="true"> · </span>
              <span>{report.category}</span>
              <span aria-hidden="true"> · </span>
              <span className="capitalize">Status: {report.status}</span>
            </div>
            <span className="font-mono">{report.id}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {report.title}
            </h1>
            {onOpen3DViewer && (
              <button
                type="button"
                onClick={() => onOpen3DViewer(report)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Box className="w-4 h-4" />
                <span>Inspect 3D View &amp; Check Item</span>
              </button>
            )}
          </div>

          {report.images?.[0] && (
            <img
              src={report.images[0].url}
              alt={report.title}
              referrerPolicy="no-referrer"
              className="w-full h-64 object-cover rounded-2xl border border-slate-200 dark:border-slate-800"
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-3.5 border-y border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <div className="text-slate-500">Brand &amp; Model</div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {report.brand || '—'} {report.model}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Color &amp; Material</div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {report.color} · {report.material || '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Reported By</div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {report.reporterName} (Tier {report.reporterTier})
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <div className="text-xs font-semibold text-slate-500">Public Description</div>
            <p>{report.description}</p>
            <p className="text-xs text-slate-500">
              Visible traits: {report.distinguishingFeatures}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {report.approximateLocationLabel} ({report.floorOrArea})
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {report.incidentDate} · {report.incidentTimeWindow}
            </span>
          </div>
        </div>

        {/* Right: Ownership Claim Submission or Related Matches */}
        <div className="lg:col-span-5 space-y-6">
          {report.type === 'found' && report.status !== 'returned' ? (
            <form
              onSubmit={handleClaimSubmit}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <KeyRound className="w-4 h-4" />
                OWNERSHIP VERIFICATION &amp; CLAIM SUBMISSION
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Believe This Item Is Yours?
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Answer the finder&apos;s identifying challenge below. Your response is compared securely on the server without revealing the hidden characteristic publicly.
              </p>

              {claimMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    claimMsg.type === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200'
                  }`}
                >
                  {claimMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {report.secretPromptQuestion ||
                    'Describe the hidden identifying mark, sticker, or serial digits on this item *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={secretAnswer}
                  onChange={(e) => setSecretAnswer(e.target.value)}
                  placeholder="Provide specific identifying proof..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Proof (Receipt, Lock-screen capability, etc.)
                </label>
                <input
                  type="text"
                  value={additionalProof}
                  onChange={(e) => setAdditionalProof(e.target.value)}
                  placeholder="e.g., Can unlock device at Custody Desk"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Custody Desk
                  </label>
                  <select
                    value={selectedDeskId}
                    onChange={(e) => setSelectedDeskId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {custodyDesks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name.split('—')[0].trim()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pickup Time Window
                  </label>
                  <input
                    type="text"
                    value={pickupWindow}
                    onChange={(e) => setPickupWindow(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Verifying & Submitting Claim...' : 'Submit Ownership Claim'}
              </button>
            </form>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Linked Potential Matches ({relatedMatches.length})
              </h2>
              {relatedMatches.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1"
                >
                  <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {m.totalScore}% Match Similarity
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {m.foundReport?.title}
                  </div>
                  <div className="text-slate-500">{m.explanations.join(' · ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. ADMINISTRATOR & SECURITY-DESK GOVERNANCE CENTRE
export const AdminGovernancePortal: React.FC<{
  user: User;
  reports?: ItemReport[];
  custodyDesks?: CustodyDesk[];
  verificationRequests: VerificationRequestRecord[];
  disputes: DisputeRecord[];
  auditLogs: AuditLogEntry[];
  onReviewTier3: (reqId: string, decision: 'approved' | 'rejected') => Promise<void>;
  onResolveDispute: (disputeId: string, notes: string) => Promise<void>;
  onFlagReport?: (reportId: string, flagged: boolean) => Promise<void>;
  onArchiveReport?: (reportId: string) => Promise<void>;
}> = ({
  user,
  reports = [],
  custodyDesks = [],
  verificationRequests,
  disputes,
  auditLogs,
  onReviewTier3,
  onResolveDispute,
  onFlagReport,
  onArchiveReport,
}) => {
  const isAuthorized = user.role === 'admin' || user.role === 'custody_staff';
  const [draggedAdminItem, setDraggedAdminItem] = useState<{
    kind: 'tier3' | 'dispute' | 'report';
    id: string;
    label: string;
  } | null>(null);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminReportFilter, setAdminReportFilter] = useState<'all' | 'flagged' | 'active'>('all');

  const filteredAdminReports = useMemo(() => {
    return reports.filter((r) => {
      if (adminReportFilter === 'flagged' && !r.flaggedForModeration) return false;
      if (adminReportFilter === 'active' && r.archived) return false;
      if (!adminSearch.trim()) return true;
      const q = adminSearch.toLowerCase();
      return `${r.id} ${r.title} ${r.reporterName} ${r.category} ${r.buildingName}`
        .toLowerCase()
        .includes(q);
    });
  }, [reports, adminReportFilter, adminSearch]);

  if (!isAuthorized) {
    return (
      <div className="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2 shadow-xs">
        <AlertOctagon className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Role-Based Access Control Restricted
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Server-side RBAC enforces that only Custody Desk Staff or Campus Administrators can access identity reviews, dispute arbitration, report moderation, and audit logs. Open the Account menu in the top navigation bar to switch to Administrator or Custody Staff.
        </p>
      </div>
    );
  }

  const handleAdminDropZone = async (
    zone: 'APPROVE_ID' | 'REJECT_ID' | 'RESOLVE_DISPUTE' | 'FLAG_REPORT' | 'ARCHIVE_REPORT'
  ) => {
    if (!draggedAdminItem) return;
    try {
      if (zone === 'APPROVE_ID' && draggedAdminItem.kind === 'tier3') {
        await onReviewTier3(draggedAdminItem.id, 'approved');
        setAdminFeedback(
          `Approved Tier 3 Identity for "${draggedAdminItem.label}" and purged encrypted ID binary.`
        );
      } else if (zone === 'REJECT_ID' && draggedAdminItem.kind === 'tier3') {
        await onReviewTier3(draggedAdminItem.id, 'rejected');
        setAdminFeedback(`Rejected Tier 3 Identity request for "${draggedAdminItem.label}".`);
      } else if (zone === 'RESOLVE_DISPUTE' && draggedAdminItem.kind === 'dispute') {
        await onResolveDispute(
          draggedAdminItem.id,
          'Resolved via Admin Governance Canvas Drop Zone and verified with Custody Desk.'
        );
        setAdminFeedback(`Resolved dispute "${draggedAdminItem.label}" and logged audit event.`);
      } else if (zone === 'FLAG_REPORT' && draggedAdminItem.kind === 'report' && onFlagReport) {
        const target = reports.find((r) => r.id === draggedAdminItem.id);
        await onFlagReport(draggedAdminItem.id, !target?.flaggedForModeration);
        setAdminFeedback(`Updated moderation flag on report "${draggedAdminItem.label}".`);
      } else if (
        zone === 'ARCHIVE_REPORT' &&
        draggedAdminItem.kind === 'report' &&
        onArchiveReport
      ) {
        await onArchiveReport(draggedAdminItem.id);
        setAdminFeedback(`Archived report "${draggedAdminItem.label}" via Admin Canvas.`);
      } else {
        setAdminFeedback(
          `Incompatible Admin Drop: Cannot drop a ${draggedAdminItem.kind.toUpperCase()} card into ${zone}.`
        );
      }
    } finally {
      setDraggedAdminItem(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Administration &amp; Custody Governance Center
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Moderation, Tier-3 Identity Review, Custody Desks &amp; Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Drag any Identity Request Card, Dispute Card, or Report Card into the Administrative Action Zones below, or use the direct role-authorized controls.
          </p>
        </div>

        {/* Real Operational Statistics Strip */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            Pending IDs:{' '}
            <strong>{verificationRequests.filter((v) => v.status === 'pending').length}</strong>
          </div>
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            Open Disputes: <strong>{disputes.filter((d) => d.status !== 'resolved').length}</strong>
          </div>
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            Audit Events: <strong>{auditLogs.length}</strong>
          </div>
        </div>
      </div>

      {adminFeedback && (
        <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
          <span>{adminFeedback}</span>
          <button
            type="button"
            onClick={() => setAdminFeedback(null)}
            className="font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ADMIN CANVAS ACTION ZONES DOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            id: 'APPROVE_ID' as const,
            label: '01. Approve Tier-3 ID',
            sub: 'Drop Tier-3 ID Card to Verify & Purge Raw Artifact',
            acceptKind: 'tier3',
          },
          {
            id: 'REJECT_ID' as const,
            label: '02. Reject Tier-3 ID',
            sub: 'Drop Tier-3 ID Card to Reject Unverified Submission',
            acceptKind: 'tier3',
          },
          {
            id: 'RESOLVE_DISPUTE' as const,
            label: '03. Resolve Dispute',
            sub: 'Drop Dispute / Abuse Card to Mark Resolved',
            acceptKind: 'dispute',
          },
          {
            id: 'FLAG_REPORT' as const,
            label: '04. Flag / Clear Report',
            sub: 'Drop Report Card to Toggle Moderation Flag',
            acceptKind: 'report',
          },
          {
            id: 'ARCHIVE_REPORT' as const,
            label: '05. Archive Duplicate',
            sub: 'Drop Report Card to Archive from Public Feed',
            acceptKind: 'report',
          },
        ].map((az) => {
          const isCompatible = draggedAdminItem?.kind === az.acceptKind;
          return (
            <div
              key={az.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleAdminDropZone(az.id);
              }}
              className={`p-4 rounded-2xl border-2 border-dashed transition-all text-xs flex flex-col justify-between ${
                draggedAdminItem
                  ? isCompatible
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 scale-[1.01]'
                    : 'border-rose-300 opacity-50'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="font-bold text-slate-900 dark:text-white">{az.label}</div>
              <div className="text-[11px] text-slate-500 mt-1">{az.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Tier 3 Identity Verification Review Queue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Tier-3 Identity Review Queue ({verificationRequests.length})
          </h2>

          <div className="space-y-3">
            {verificationRequests.map((req) => (
              <div
                key={req.id}
                draggable={req.status === 'pending'}
                onDragStart={() =>
                  setDraggedAdminItem({
                    kind: 'tier3',
                    id: req.id,
                    label: req.userName,
                  })
                }
                onDragEnd={() => setDraggedAdminItem(null)}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                    {req.userName}
                  </span>
                  <span className="uppercase font-mono text-slate-500">{req.status}</span>
                </div>
                <div className="font-mono text-slate-600 dark:text-slate-400">
                  {req.institutionName} · ID: {req.studentOrStaffId}
                </div>
                <div className="text-[11px] text-slate-500">
                  Artifact: <code className="font-mono">{req.documentReference}</code> · Purged:{' '}
                  <strong>{req.documentDeletedAfterReview ? 'Yes' : 'Pending'}</strong>
                </div>
                {req.status === 'pending' && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onReviewTier3(req.id, 'approved')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Approve &amp; Purge
                    </button>
                    <button
                      type="button"
                      onClick={() => onReviewTier3(req.id, 'rejected')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700"
                    >
                      <XCircle className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Dispute & Abuse Resolution Cards */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Dispute &amp; Abuse Queue ({disputes.length})
          </h2>
          <div className="space-y-3">
            {disputes.map((d) => (
              <div
                key={d.id}
                draggable={d.status !== 'resolved'}
                onDragStart={() =>
                  setDraggedAdminItem({
                    kind: 'dispute',
                    id: d.id,
                    label: d.raisedByName,
                  })
                }
                onDragEnd={() => setDraggedAdminItem(null)}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                    Raised by {d.raisedByName}
                  </span>
                  <span className="uppercase font-mono text-slate-500">{d.status}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{d.reason}</p>
                {d.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() =>
                      onResolveDispute(
                        d.id,
                        'Expedited by Custody Directorate and verified with Desk Officer.'
                      )
                    }
                    className="px-2.5 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
                  >
                    Resolve &amp; Log Audit
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Report Moderation (with Search & Filter) + Custody Locations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="space-y-2.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Report Moderation &amp; Custody Desks
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Search reports..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <select
                value={adminReportFilter}
                onChange={(e) => setAdminReportFilter(e.target.value as any)}
                aria-label="Filter moderation reports"
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {filteredAdminReports.slice(0, 8).map((rep) => (
              <div
                key={rep.id}
                draggable
                onDragStart={() =>
                  setDraggedAdminItem({
                    kind: 'report',
                    id: rep.id,
                    label: rep.title,
                  })
                }
                onDragEnd={() => setDraggedAdminItem(null)}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs flex items-center justify-between gap-2 cursor-grab"
              >
                <div className="truncate">
                  <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                    {rep.title}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {rep.id} · {rep.status} {rep.flaggedForModeration ? '· FLAGGED' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onFlagReport && (
                    <button
                      type="button"
                      onClick={() => onFlagReport(rep.id, !rep.flaggedForModeration)}
                      className="px-2 py-1 bg-amber-600 text-white text-[10px] font-semibold rounded-md"
                    >
                      {rep.flaggedForModeration ? 'Clear' : 'Flag'}
                    </button>
                  )}
                  {onArchiveReport && !rep.archived && rep.status !== 'returned' && (
                    <button
                      type="button"
                      onClick={() => onArchiveReport(rep.id)}
                      className="px-2 py-1 bg-slate-700 text-white text-[10px] font-semibold rounded-md"
                      title="Archive duplicate or moderated report"
                    >
                      <Archive className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {custodyDesks.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Authorized Custody Locations ({custodyDesks.length})
              </div>
              {custodyDesks.map((d) => (
                <div
                  key={d.id}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px]"
                >
                  <div className="font-bold text-slate-900 dark:text-white">{d.name}</div>
                  <div className="text-slate-500 font-mono tabular-nums">
                    {d.floorRoom} · {d.operatingHours} · Active Queue: {d.activeQueueCount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Immutable Security Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            System Security &amp; Handover Audit Trail
          </h2>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {auditLogs.length} events recorded
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Actor</th>
                <th className="py-3 px-4 font-semibold">Event Action</th>
                <th className="py-3 px-4 font-semibold">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {log.actorName} ({log.actorRole})
                  </td>
                  <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {log.summary}
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
