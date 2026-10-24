import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  MapPin,
  Clock,
  ShieldAlert,
  FileCheck2,
} from 'lucide-react';
import { PotentialMatch, ItemReport } from '../types';

interface MatchingDashboardProps {
  matches: PotentialMatch[];
  onOpenClaimModal: (match: PotentialMatch) => void;
  onUpdateMatchStatus: (matchId: string, status: PotentialMatch['status']) => Promise<void>;
  onSelectReport: (report: ItemReport) => void;
}

export const MatchingDashboard: React.FC<MatchingDashboardProps> = ({
  matches,
  onOpenClaimModal,
  onUpdateMatchStatus,
  onSelectReport,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | PotentialMatch['status']>('all');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(matches[0]?.id || null);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<Record<string, string>>({});

  const filteredMatches = matches.filter((m) =>
    statusFilter === 'all' ? true : m.status === statusFilter
  );

  const activeMatch =
    filteredMatches.find((m) => m.id === selectedMatchId) || filteredMatches[0] || null;

  const handleRequestAiComparison = async (matchId: string) => {
    setAiLoadingId(matchId);
    try {
      const res = await fetch('/api/ai/compare-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json();
      if (data.aiInsight) {
        setAiInsights((prev) => ({ ...prev, [matchId]: data.aiInsight }));
      }
    } catch {
      // handled gracefully
    } finally {
      setAiLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Intelligent Side-by-Side Matching Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Multi-signal comparison across category, appearance, spatial proximity, timeline, and distinguishing traits. Similarity scores explain alignment and do not auto-approve ownership.
          </p>
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          {(['all', 'suggested', 'under_review', 'confirmed', 'dismissed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 capitalize ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center shadow-xs">
          <ArrowLeftRight className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            No Candidate Matches in This View
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            When complementary Lost and Found reports are saved, Findora automatically scores and explains candidate pairs here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Ranked Candidate Match Pairs */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
              Candidate Pairs ({filteredMatches.length})
            </div>
            {filteredMatches.map((m) => {
              const isSelected = activeMatch?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMatchId(m.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-600/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span>{m.lostReport?.category}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="capitalize">{m.status.replace('_', ' ')}</span>
                    </div>
                    <span className="text-sm font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                      {m.totalScore}% Similarity
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                    Lost: {m.lostReport?.title}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 line-clamp-1 mt-0.5">
                    Found: {m.foundReport?.title}
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <span>{m.distanceMeters}m apart</span>
                    <span aria-hidden="true">·</span>
                    <span>Δ {m.timeDeltaHours}h</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Side-by-Side Comparison Workspace */}
          {activeMatch && (
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
              {/* Top Score & Weighted Signal Breakdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Explainable Similarity Assessment · Pair ID{' '}
                    <span className="font-mono">{activeMatch.id}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {activeMatch.totalScore}% Multi-Signal Alignment
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenClaimModal(activeMatch)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 shadow-xs"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    Verify Ownership &amp; Claim Item
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateMatchStatus(activeMatch.id, 'confirmed')}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Confirm Match
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateMatchStatus(activeMatch.id, 'dismissed')}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors whitespace-nowrap shrink-0"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Not My Item
                  </button>
                </div>
              </div>

              {/* 5-Signal Weighted Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Category (25%)', val: activeMatch.breakdown.categoryScore, max: 25 },
                  { label: 'Appearance (20%)', val: activeMatch.breakdown.appearanceScore, max: 20 },
                  { label: 'Location (20%)', val: activeMatch.breakdown.locationScore, max: 20 },
                  { label: 'Timeline (15%)', val: activeMatch.breakdown.timelineScore, max: 15 },
                  { label: 'Description (20%)', val: activeMatch.breakdown.descriptionScore, max: 20 },
                ].map((sig) => (
                  <div
                    key={sig.label}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-xl"
                  >
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{sig.label}</div>
                    <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                      {sig.val} / {sig.max}
                    </div>
                  </div>
                ))}
              </div>

              {/* Why These Reports Matched (Plain-Language Evidence) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Why Findora Matched These Two Reports
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleRequestAiComparison(activeMatch.id)}
                    disabled={aiLoadingId === activeMatch.id}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiLoadingId === activeMatch.id
                      ? 'Generating AI Analysis...'
                      : 'Generate Gemini Semantic Analysis'}
                  </button>
                </div>

                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                  {activeMatch.explanations.map((exp, idx) => (
                    <li key={idx}>{exp}</li>
                  ))}
                </ul>

                {(aiInsights[activeMatch.id] || activeMatch.aiInsight) && (
                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-indigo-900 dark:text-indigo-300">
                    <span className="font-semibold">AI Semantic Comparison: </span>
                    {aiInsights[activeMatch.id] || activeMatch.aiInsight}
                  </div>
                )}
              </div>

              {/* Side-by-Side Report Comparison Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LOST REPORT CARD */}
                {activeMatch.lostReport && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 bg-slate-50/40 dark:bg-slate-800/20">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        LOST ITEM REPORT
                      </span>
                      <span className="font-mono tabular-nums">{activeMatch.lostReport.id}</span>
                    </div>

                    {activeMatch.lostReport.images?.[0] && (
                      <img
                        src={activeMatch.lostReport.images[0].url}
                        alt={activeMatch.lostReport.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-40 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                      />
                    )}

                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {activeMatch.lostReport.title}
                    </h4>

                    <dl className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                        <dt className="text-slate-500">Category · Brand</dt>
                        <dd className="font-semibold text-slate-900 dark:text-slate-100">
                          {activeMatch.lostReport.category} · {activeMatch.lostReport.brand || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                        <dt className="text-slate-500">Color · Material</dt>
                        <dd className="font-semibold text-slate-900 dark:text-slate-100">
                          {activeMatch.lostReport.color} · {activeMatch.lostReport.material || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                        <dt className="text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Location
                        </dt>
                        <dd className="font-semibold text-slate-900 dark:text-slate-100">
                          {activeMatch.lostReport.buildingName}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                        <dt className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Incident Time
                        </dt>
                        <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                          {activeMatch.lostReport.incidentDate} ({activeMatch.lostReport.incidentTimeWindow})
                        </dd>
                      </div>
                    </dl>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {activeMatch.lostReport.distinguishingFeatures}
                    </p>

                    <button
                      type="button"
                      onClick={() => onSelectReport(activeMatch.lostReport!)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View Full Lost Report →
                    </button>
                  </div>
                )}

                {/* FOUND REPORT CARD */}
                {activeMatch.foundReport && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 bg-slate-50/40 dark:bg-slate-800/20">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        FOUND ITEM REPORT
                      </span>
                      <span className="font-mono tabular-nums">{activeMatch.foundReport.id}</span>
                    </div>

                    {activeMatch.foundReport.images?.[0] && (
                      <img
                        src={activeMatch.foundReport.images[0].url}
                        alt={activeMatch.foundReport.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-40 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                      />
                    )}

                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {activeMatch.foundReport.title}
                    </h4>

                    <dl className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                        <dt className="text-slate-500">Category · Brand</dt>
                        <dd className="font-semibold text-slate-900 dark:text-slate-100">
                          {activeMatch.foundReport.category} · {activeMatch.foundReport.brand || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                        <dt className="text-slate-500">Color · Material</dt>
                        <dd className="font-semibold text-slate-900 dark:text-slate-100">
                          {activeMatch.foundReport.color} · {activeMatch.foundReport.material || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                        <dt className="text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Location
                        </dt>
                        <dd className="font-semibold text-slate-900 dark:text-slate-100">
                          {activeMatch.foundReport.approximateLocationLabel}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                        <dt className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Found Time
                        </dt>
                        <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                          {activeMatch.foundReport.incidentDate} ({activeMatch.foundReport.incidentTimeWindow})
                        </dd>
                      </div>
                    </dl>

                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <span className="font-semibold">Private Ownership Challenge Active:</span> Finder recorded a hidden identifying trait that is withheld from public view and verified during your claim.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectReport(activeMatch.foundReport!)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View Full Found Report →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
