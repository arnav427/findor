import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Compass,
  LayoutDashboard,
  MapPin,
  ArrowLeftRight,
  QrCode,
  ShieldCheck,
  MessageSquare,
  ShieldAlert,
  PlusCircle,
  Search,
  Sun,
  Moon,
  Bell,
  Sparkles,
  LogIn,
  UserCheck,
  CheckCircle2,
  X,
  Layers,
  Clock,
  ArrowRight,
  Filter,
  Menu,
  ChevronDown,
  User as UserIcon,
  AlertCircle,
  PackageCheck,
  FileCheck2,
  Globe,
  Box,
} from 'lucide-react';
import {
  User,
  ItemReport,
  PotentialMatch,
  OwnershipClaim,
  CustodyDesk,
  ChatConversation,
  ChatMessage,
  AppNotification,
  VerificationRequestRecord,
  DisputeRecord,
  AuditLogEntry,
  ReportType,
  CanvasZoneId,
  ItemCategory,
} from './types';
import { Language, translations } from './i18n';
import { CampusMapView } from './components/CampusMapView';
import { MatchingDashboard } from './components/MatchingDashboard';
import { ReportWizardModal } from './components/ReportWizardModal';
import { ClaimsAndHandoverView } from './components/ClaimsAndHandoverView';
import { VerificationCenterView } from './components/VerificationCenterView';
import {
  SecureChatView,
  ItemDetailView,
  AdminGovernancePortal,
} from './components/AdminAndChatViews';
import { InteractiveCanvasWorkspace } from './components/InteractiveCanvasWorkspace';
import { Item3DViewerModal } from './components/Item3DViewerModal';

type ActiveView =
  | 'landing'
  | 'dashboard'
  | 'canvas'
  | 'explore'
  | 'map'
  | 'matches'
  | 'claims'
  | 'verification'
  | 'chat'
  | 'admin'
  | 'item_detail';

const CATEGORIES: ItemCategory[] = [
  'Electronics',
  'Bags and backpacks',
  'Wallets and purses',
  'Keys',
  'Identity cards',
  'Documents',
  'Books and stationery',
  'Clothing',
  'Jewellery',
  'Accessories',
  'Water bottles',
  'Other',
];

export default function App() {
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('findora_theme');
    return saved ? saved === 'dark' : false;
  });
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('findora_lang') as Language;
    return saved === 'hi' ? 'hi' : 'en';
  });

  const t = translations[lang];

  const [activeView, setActiveView] = useState<ActiveView>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<ItemReport[]>([]);
  const [matches, setMatches] = useState<PotentialMatch[]>([]);
  const [claims, setClaims] = useState<OwnershipClaim[]>([]);
  const [custodyDesks, setCustodyDesks] = useState<CustodyDesk[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequestRecord[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState({
    activeLostCount: 0,
    activeFoundCount: 0,
    matchedCount: 0,
    returnedCount: 0,
    custodyDesksCount: 3,
  });

  // Modals, Menus & Popovers State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState<ReportType>('lost');
  const [reportModalCoords, setReportModalCoords] = useState<
    { lat: number; lng: number; label?: string } | undefined
  >(undefined);
  const [selectedReport, setSelectedReport] = useState<ItemReport | null>(null);
  const [viewer3DOpen, setViewer3DOpen] = useState<boolean>(false);
  const [viewer3DReport, setViewer3DReport] = useState<ItemReport | null>(null);
  const [canvasExternalTrigger, setCanvasExternalTrigger] = useState<{
    report: ItemReport;
    zoneId: CanvasZoneId;
    ts: number;
  } | null>(null);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard Recent Reports Filter
  const [dashboardReportFilter, setDashboardReportFilter] = useState<'all' | 'lost' | 'found'>(
    'all'
  );

  // Explore Search, Filters & AI Discovery State
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiSearchSummary, setAiSearchSummary] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'priority'>('newest');

  // Listen to Google Maps Platform Quota Exceeded event (Tier 1 & Tier 2)
  useEffect(() => {
    const handler = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('findora_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('findora_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('findora_lang', lang);
  }, [lang]);

  const getToken = () => {
    let tok = localStorage.getItem('findora_token');
    if (!tok) {
      tok = 'demo-token-student';
      localStorage.setItem('findora_token', tok);
    }
    return tok;
  };

  const fetchBootstrapData = useCallback(async () => {
    const token = getToken();
    try {
      const res = await fetch('/api/bootstrap', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUser(data.user || null);
      setReports(data.reports || []);
      setMatches(data.matches || []);
      setClaims(data.claims || []);
      setCustodyDesks(data.custodyDesks || []);
      setConversations(data.conversations || []);
      setMessages(data.messages || []);
      setNotifications(data.notifications || []);
      setVerificationRequests(data.verificationRequests || []);
      setDisputes(data.disputes || []);
      setAuditLogs(data.auditLogs || []);
      if (data.stats) setStats(data.stats);
    } catch {
      // handled gracefully
    }
  }, []);

  useEffect(() => {
    fetchBootstrapData();
  }, [fetchBootstrapData]);

  const handleQuickRoleSwitch = async (demoRole: 'student' | 'finder' | 'staff' | 'admin') => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoRole }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('findora_token', data.token);
      await fetchBootstrapData();
      setAccountMenuOpen(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body =
      authMode === 'login'
        ? { identifier: authIdentifier, password: authPassword }
        : {
            email: authIdentifier,
            username: authUsername,
            fullName: authFullName,
            password: authPassword,
          };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }
      localStorage.setItem('findora_token', data.token);
      setAuthModalOpen(false);
      await fetchBootstrapData();
      setActiveView('dashboard');
    } catch (err: any) {
      setAuthError(err?.message || 'Network error');
    }
  };

  const handleOpenReportWizard = (
    type: ReportType,
    coords?: { lat: number; lng: number; label?: string }
  ) => {
    setReportModalType(type);
    setReportModalCoords(coords);
    setReportModalOpen(true);
  };

  const handleCreateReport = async (payload: any) => {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create report');
    await fetchBootstrapData();
    return data;
  };

  const handleUpdateMatchStatus = async (
    matchId: string,
    status: PotentialMatch['status']
  ) => {
    await fetch(`/api/matches/${matchId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status }),
    });
    await fetchBootstrapData();
  };

  const handleAnalyzeMatchesForReport = async (
    reportId: string
  ): Promise<{ report: ItemReport; matches: PotentialMatch[] }> => {
    const res = await fetch(`/api/matches/analyze/${reportId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to analyze matches');
    await fetchBootstrapData();
    return data;
  };

  const handleArchiveReport = async (reportId: string) => {
    const res = await fetch(`/api/reports/${reportId}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to archive report');
    await fetchBootstrapData();
  };

  const handleRestoreReport = async (reportId: string) => {
    const res = await fetch(`/api/reports/${reportId}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to restore report');
    await fetchBootstrapData();
  };

  const handleSubmitClaim = async (payload: any) => {
    const res = await fetch('/api/claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit claim');
    await fetchBootstrapData();
  };

  const handleReviewClaim = async (
    claimId: string,
    decision: 'approved' | 'rejected',
    reviewerNotes: string
  ) => {
    const res = await fetch(`/api/claims/${claimId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ decision, reviewerNotes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to review claim');
    await fetchBootstrapData();
  };

  const handleValidateHandover = async (
    codeOrToken: string,
    custodyDeskId: string,
    staffNotes: string
  ): Promise<string> => {
    const res = await fetch('/api/handover/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ codeOrToken, custodyDeskId, staffNotes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Handover validation failed');
    await fetchBootstrapData();
    return data.message;
  };

  const handleRegenerateToken = async (
    claimId: string,
    custodyDeskId?: string,
    pickupWindow?: string
  ) => {
    const res = await fetch(`/api/handover/${claimId}/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ custodyDeskId, pickupWindow }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to refresh pickup token');
    await fetchBootstrapData();
  };

  const handleSendChatMessage = async (conversationId: string, text: string) => {
    await fetch(`/api/chat/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ text }),
    });
    await fetchBootstrapData();
  };

  const handleReviewTier3 = async (reqId: string, decision: 'approved' | 'rejected') => {
    await fetch(`/api/admin/verification/${reqId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ decision }),
    });
    await fetchBootstrapData();
  };

  const handleResolveDispute = async (disputeId: string, resolutionNotes: string) => {
    await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ resolutionNotes }),
    });
    await fetchBootstrapData();
  };

  const handleReportChatAbuse = async (conversationId: string, reason: string) => {
    await fetch(`/api/chat/${conversationId}/report-abuse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ reason }),
    });
    await fetchBootstrapData();
  };

  const handleFlagReport = async (reportId: string, flagged: boolean) => {
    await fetch(`/api/admin/reports/${reportId}/flag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ flagged }),
    });
    await fetchBootstrapData();
  };

  const handleRunAiSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiSearching(true);
    setAiSearchSummary(null);
    try {
      const res = await fetch('/api/ai/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
      });
      const data = await res.json();
      if (data.reports) {
        setReports(data.reports);
        setAiSearchSummary(data.summary);
        setActiveView('explore');
      }
    } finally {
      setAiSearching(false);
    }
  };

  const campusZones = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.campusZone) set.add(r.campusZone);
    });
    return Array.from(set);
  }, [reports]);

  const filteredExploreReports = useMemo(() => {
    const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return reports
      .filter((r) => {
        if (r.archived) return false;
        if (typeFilter !== 'all' && r.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
        if (zoneFilter !== 'all' && r.campusZone !== zoneFilter) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return `${r.title} ${r.category} ${r.color} ${r.brand} ${r.buildingName} ${r.campusZone} ${r.distinguishingFeatures}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          return (priorityRank[b.priority] || 1) - (priorityRank[a.priority] || 1);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [reports, typeFilter, categoryFilter, zoneFilter, statusFilter, searchQuery, sortBy]);

  const activeReports = useMemo(() => reports.filter((r) => !r.archived), [reports]);
  const openLostCount = useMemo(
    () => activeReports.filter((r) => r.type === 'lost' && r.status !== 'returned').length,
    [activeReports]
  );
  const openFoundCount = useMemo(
    () => activeReports.filter((r) => r.type === 'found' && r.status !== 'returned').length,
    [activeReports]
  );
  const pendingClaimsCount = useMemo(
    () => claims.filter((c) => c.status === 'under_review' || c.status === 'approved').length,
    [claims]
  );

  const filteredDashboardReports = useMemo(() => {
    return activeReports
      .filter((r) => {
        if (dashboardReportFilter !== 'all' && r.type !== dashboardReportFilter) return false;
        return true;
      })
      .slice(0, 6);
  }, [activeReports, dashboardReportFilter]);

  const clearExploreFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setZoneFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
    setAiSearchSummary(null);
  };

  const navItems = useMemo(() => {
    const base: Array<{
      id: ActiveView;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number;
    }> = [
      { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
      { id: 'canvas', label: 'Canvas', icon: Layers },
      { id: 'explore', label: t.navExplore, icon: Compass },
      { id: 'map', label: t.navMap, icon: MapPin },
      { id: 'matches', label: t.navMatches, icon: ArrowLeftRight, badge: matches.length },
      { id: 'claims', label: t.navClaims, icon: QrCode, badge: pendingClaimsCount },
      { id: 'verification', label: 'Verification', icon: ShieldCheck },
      { id: 'chat', label: 'Messages', icon: MessageSquare },
    ];
    if (user?.role === 'admin' || user?.role === 'custody_staff') {
      base.push({ id: 'admin', label: 'Admin & Custody', icon: ShieldAlert });
    }
    return base;
  }, [t, matches.length, pendingClaimsCount, user?.role]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Required Google Maps Platform Demo Quota Banner (Tier 1 & Tier 2) */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-xs">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* REFERENCE-INSPIRED UNIFIED NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo, Name & Concise Product Subtitle */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('landing');
            setMobileMenuOpen(false);
          }}
          className="inline-flex items-center gap-3 text-xl font-normal not-italic underline text-justify tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
        >
          <img
            src="/assets/aistudio/Screenshot_2026-10-24_211219_4f02c02f.png"
            alt="Findora app icon"
            className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-xs border border-slate-200 dark:border-slate-700"
          />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {t.brand}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 no-underline mt-0.5">
              Smart Lost &amp; Found
            </span>
          </span>
        </a>

        {/* Center: Primary Desktop Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden xl:flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="ml-0.5 text-[11px] font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                    ({item.badge})
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Search, Notifications, Theme Toggle, Profile Menu & Report CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search Access */}
          <button
            type="button"
            onClick={() => setActiveView('explore')}
            aria-label="Search lost and found items"
            title="Search items"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifPopoverOpen(!notifPopoverOpen);
                setAccountMenuOpen(false);
              }}
              aria-label="Open notifications"
              className="relative inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="text-xs font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                {notifications.filter((n) => !n.read).length || notifications.length}
              </span>
            </button>

            {notifPopoverOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3.5 z-50 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Notifications ({notifications.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotifPopoverOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-xs text-slate-500 py-4 text-center">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          if (n.linkView) setActiveView(n.linkView as ActiveView);
                          setNotifPopoverOpen(false);
                        }}
                        className="w-full text-left p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors space-y-0.5"
                      >
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {n.title}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                          {n.body}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle color theme"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile & Account Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setAccountMenuOpen(!accountMenuOpen);
                setNotifPopoverOpen(false);
              }}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
            >
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </span>
              <span className="hidden sm:inline max-w-[110px] truncate font-semibold">
                {user?.fullName || 'Account'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3.5 z-50 space-y-3 text-xs">
                {user && (
                  <div className="pb-2.5 border-b border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {user.fullName}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                    <div className="flex items-center gap-2 pt-1 text-[11px] font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                      <span>Tier {user.tier} Verified</span>
                      <span aria-hidden="true">·</span>
                      <span>Trust {user.trustScore}/100</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{user.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('verification');
                      setAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Profile &amp; Verification Center</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('admin');
                      setAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Admin &amp; Custody Governance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Language</span>
                    </span>
                    <span className="font-mono text-[11px]">{lang === 'en' ? 'English' : 'हिन्दी'}</span>
                  </button>
                </div>

                {/* Authorized Role Switcher for Testing RBAC Workflows */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Switch Active Session Role
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { key: 'student', label: 'Student (Tier 3)' },
                        { key: 'finder', label: 'Finder (Tier 2)' },
                        { key: 'staff', label: 'Custody Staff' },
                        { key: 'admin', label: 'Administrator' },
                      ] as const
                    ).map((r) => {
                      const activeRole =
                        (r.key === 'student' && user?.id === 'usr-student-1') ||
                        (r.key === 'finder' && user?.id === 'usr-finder-2') ||
                        (r.key === 'staff' && user?.id === 'usr-staff-3') ||
                        (r.key === 'admin' && user?.id === 'usr-admin-4');
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => handleQuickRoleSwitch(r.key)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-colors ${
                            activeRole
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In / Register Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prominent Report Item Action */}
          <button
            type="button"
            onClick={() => handleOpenReportWizard('lost')}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Item</span>
          </button>

          {/* Accessible Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="xl:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Accessible Mobile & Tablet Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-4 z-30">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenReportWizard('lost');
              }}
              className="flex-1 py-2.5 px-4 bg-indigo-600 text-white text-xs font-semibold rounded-xl text-center"
            >
              + Report Lost Item
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenReportWizard('found');
              }}
              className="flex-1 py-2.5 px-4 bg-emerald-600 text-white text-xs font-semibold rounded-xl text-center"
            >
              + Report Found Item
            </button>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      {activeView === 'landing' ? (
        <main className="flex-1">
          {/* OPENING WELCOME SCREEN / REFERENCE-STYLE HERO SECTION */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14 space-y-10">
            {/* Prominent Opening Welcome Banner with Findora App Icon */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1.5 bg-indigo-50 dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 shadow-sm shrink-0 flex items-center justify-center">
                  <img
                    src="/assets/aistudio/Screenshot_2026-10-24_211219_4f02c02f.png"
                    alt="Findora — Smart Lost & Found App Icon"
                    className="w-full h-full rounded-xl object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <div className="inline-flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold uppercase tracking-wide">
                      Welcome to Findora
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t.promiseBanner}
                    </span>
                  </div>
                  <h1
                    className="font-display font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
                    style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)' }}
                  >
                    {t.heroHeadline}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                    {t.heroSub}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveView('dashboard')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap shadow-xs"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewer3DReport(reports[0] || null);
                    setViewer3DOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors whitespace-nowrap"
                >
                  <Box className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>3D Object View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('canvas')}
                  className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Interactive Canvas</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
                <div className="inline-flex items-center gap-2.5 text-xs font-semibold tracking-wide text-indigo-600 dark:text-indigo-400">
                  <img
                    src="/assets/aistudio/Screenshot_2026-10-24_211219_4f02c02f.png"
                    alt="Findora app icon"
                    className="w-7 h-7 rounded-lg object-cover shrink-0 shadow-xs border border-slate-200 dark:border-slate-700"
                  />
                  <span>Quick Campus Recovery Actions</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Report a missing or found item in seconds, or search with AI
                </h2>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every report is cross-checked across 5 weighted signals (Category, Color, Spatial Proximity, Time Window, and Distinguishing Marks) while keeping ownership proofs private.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenReportWizard('lost')}
                    className="px-5 py-3 text-xs sm:text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 shadow-xs"
                  >
                    {t.ctaReportLost}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenReportWizard('found')}
                    className="px-5 py-3 text-xs sm:text-sm font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                  >
                    {t.ctaReportFound}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('explore')}
                    className="px-5 py-3 text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    Explore Items
                  </button>
                </div>

                {/* Natural Language AI Discovery Bar */}
                <form onSubmit={handleRunAiSmartSearch} className="pt-2">
                  <div className="flex flex-col sm:flex-row gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2 flex-1 px-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <input
                        type="text"
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        placeholder={t.aiDiscoveryPlaceholder}
                        className="w-full text-xs bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={aiSearching}
                      className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
                    >
                      {aiSearching ? 'Searching...' : t.runAiSearch}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Live Interactive Match Preview Card */}
              <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <div className="text-xs text-slate-500">Live Database Match Demonstration</div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Explainable Multi-Signal Match Engine
                    </h3>
                  </div>
                  <span className="text-lg font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                    {matches[0]?.totalScore || 94}% Similarity
                  </span>
                </div>

                {matches[0] ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        LOST REPORT · {matches[0].lostReport?.id}
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {matches[0].lostReport?.title}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {matches[0].lostReport?.buildingName} · {matches[0].lostReport?.color}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {matches[0].lostReport?.distinguishingFeatures}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        FOUND REPORT · {matches[0].foundReport?.id}
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {matches[0].foundReport?.title}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {matches[0].foundReport?.approximateLocationLabel} ·{' '}
                        {matches[0].foundReport?.color}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {matches[0].foundReport?.distinguishingFeatures}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Why These Reports Matched:
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {(
                      matches[0]?.explanations || [
                        'Identical item category: Electronics',
                        'Matching color profile: Space Gray',
                        'Reported 55m apart near Central Academic Commons',
                      ]
                    ).join(' · ')}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveView('matches')}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Open Side-by-Side Matching Dashboard →
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('claims')}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Test QR / OTP Handover →
                  </button>
                </div>
              </div>
            </div>

            {/* Real Platform Metrics Strip */}
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Active Lost Reports', val: stats.activeLostCount },
                { label: 'Active Found Reports', val: stats.activeFoundCount },
                { label: 'Candidate Matches', val: stats.matchedCount },
                { label: 'Verified Returns', val: stats.returnedCount },
                { label: 'Authorized Custody Desks', val: stats.custodyDesksCount },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {stat.val}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      ) : (
        /* REFERENCE-ALIGNED WORKSPACE CONTAINER */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12 overflow-x-hidden">
          {/* VIEW 1: REFERENCE-ALIGNED DASHBOARD PAGE */}
          {activeView === 'dashboard' && user && (
            <div className="space-y-6">
              {/* 1. WELCOME SECTION */}
              <section className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-1 bg-gradient-to-br from-indigo-500/20 via-indigo-500/5 to-slate-200/40 dark:from-indigo-500/30 dark:via-slate-800 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/70 shadow-sm flex items-center justify-center">
                      <img
                        src="/assets/aistudio/Screenshot_2026-10-24_211219_4f02c02f.png"
                        alt="Findora — Smart Lost & Found App Icon"
                        className="w-full h-full rounded-xl object-cover"
                      />
                    </div>
                    <span
                      title={`Tier ${user.tier} Verified`}
                      className="absolute -bottom-1.5 -right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white ring-2 ring-white dark:ring-slate-900 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 text-[11px] font-bold tracking-wide uppercase">
                        Findora · Smart Lost &amp; Found
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                        Tier {user.tier} Verified · {user.institutionName || 'Campus Recovery Hub'}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Welcome back, {user.fullName}
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                      Here is what is happening with your lost and found reports, multi-signal match candidates, and verified campus handovers today.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenReportWizard('lost')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Report Lost Item
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenReportWizard('found')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    Report Found Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('explore')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Explore Reports
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewer3DReport(activeReports[0] || reports[0] || null);
                      setViewer3DOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                  >
                    <Box className="w-4 h-4" />
                    3D Item Check
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('canvas')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    Interactive Canvas
                  </button>
                </div>
              </section>

              {/* 2. STATISTICS GRID (4 Compact Clickable Cards) */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('lost');
                    setActiveView('explore');
                  }}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-indigo-500 transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Lost Reports
                    </span>
                    <span className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                    {openLostCount}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    <span>Active missing items</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('found');
                    setActiveView('explore');
                  }}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-indigo-500 transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Found Reports
                    </span>
                    <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <PackageCheck className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                    {openFoundCount}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    <span>In custody or finder hold</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('matches')}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-indigo-500 transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Potential Matches
                    </span>
                    <span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <ArrowLeftRight className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 mt-2">
                    {matches.length}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    <span>Multi-signal candidate pairs</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('claims')}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-indigo-500 transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Active Claims
                    </span>
                    <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <FileCheck2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                    {pendingClaimsCount}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    <span>Awaiting review or QR pickup</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              </section>

              {/* 3. MAIN DASHBOARD CONTENT GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT 8 COLUMNS: Recent Reports + Suggested Matches + Claim Activity */}
                <div className="lg:col-span-8 space-y-6">
                  {/* SECTION A: RECENT REPORTS */}
                  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Recent Reports
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Latest lost and found reports across campus locations.
                        </p>
                      </div>
                      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {(['all', 'lost', 'found'] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setDashboardReportFilter(tab)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                              dashboardReportFilter === tab
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
                      {filteredDashboardReports.map((rep) => (
                        <div
                          key={rep.id}
                          className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            {rep.images?.[0]?.url ? (
                              <img
                                src={rep.images[0].url}
                                alt={rep.title}
                                referrerPolicy="no-referrer"
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold uppercase shrink-0 ${
                                  rep.type === 'lost'
                                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {rep.type}
                              </div>
                            )}
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className={`font-bold uppercase ${
                                    rep.type === 'lost'
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {rep.type}
                                </span>
                                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                  ·
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {rep.category}
                                </span>
                                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                  ·
                                </span>
                                <span className="font-mono text-[11px] text-slate-500 capitalize">
                                  {rep.status}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReport(rep);
                                  setActiveView('item_detail');
                                }}
                                className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block text-left"
                              >
                                {rep.title}
                              </button>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                                <span>{rep.approximateLocationLabel}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">{rep.incidentDate}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setViewer3DReport(rep);
                                setViewer3DOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors"
                              title="Inspect 3D view of this item and verify traits"
                            >
                              <Box className="w-3.5 h-3.5" />
                              <span>3D View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReport(rep);
                                setActiveView('item_detail');
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCanvasExternalTrigger({
                                  report: rep,
                                  zoneId: 'ZONE_3_FIND_MATCHES',
                                  ts: Date.now(),
                                });
                                setActiveView('canvas');
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors"
                            >
                              Canvas →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Showing {filteredDashboardReports.length} of {activeReports.length} active reports
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveView('explore')}
                        className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View all reports →
                      </button>
                    </div>
                  </section>

                  {/* SECTION B: SUGGESTED MATCHES */}
                  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Suggested Matches
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Explainable candidate pairs ranked by category, appearance, location, and timeline.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveView('matches')}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                      >
                        View All ({matches.length}) →
                      </button>
                    </div>

                    {matches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No potential matches yet. Submit a Lost or Found report to trigger the matching engine.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {matches.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              {m.foundReport?.images?.[0]?.url && (
                                <img
                                  src={m.foundReport.images[0].url}
                                  alt={m.foundReport.title}
                                  referrerPolicy="no-referrer"
                                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                />
                              )}
                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                                    {m.totalScore}% Match
                                  </span>
                                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                    ·
                                  </span>
                                  <span className="text-slate-500">
                                    {m.lostReport?.category} · {m.distanceMeters}m apart
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {m.lostReport?.title} ↔ {m.foundReport?.title}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                                  {m.explanations.slice(0, 2).join(' · ')}
                                </div>
                              </div>
                            </div>

                            <div className="flex sm:flex-col gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setActiveView('matches')}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                              >
                                Compare Match
                              </button>
                              {m.foundReport && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCanvasExternalTrigger({
                                      report: m.foundReport!,
                                      zoneId: 'ZONE_3_FIND_MATCHES',
                                      ts: Date.now(),
                                    });
                                    setActiveView('canvas');
                                  }}
                                  className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                                >
                                  Open in Canvas
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* SECTION C: CLAIM ACTIVITY */}
                  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Claim Activity &amp; Handover Status
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Track ownership verification reviews and short-lived QR/OTP pickup passes.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveView('claims')}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                      >
                        Manage Claims ({claims.length}) →
                      </button>
                    </div>

                    {claims.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No active claims yet. Review a suggested match to submit an ownership claim.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {claims.slice(0, 4).map((c) => (
                          <div
                            key={c.id}
                            className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-slate-500">{c.id}</span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={`font-semibold uppercase ${
                                    c.status === 'approved' || c.status === 'completed'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : c.status === 'rejected'
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {c.status.replace('_', ' ')}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                                  Evidence: {c.automatedEvidenceSimilarity}%
                                </span>
                              </div>
                              <div className="text-sm font-bold text-slate-900 dark:text-white">
                                {c.foundReportTitle}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Claimant: {c.claimantName} · Pickup window: {c.pickupWindow}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveView('claims')}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors self-start sm:self-center shrink-0"
                            >
                              {c.status === 'approved' ? 'View QR / OTP Pass →' : 'Inspect Claim →'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                {/* RIGHT 4 COLUMNS: Verification Status + Recent Activity & Notifications */}
                <div className="lg:col-span-4 space-y-6">
                  {/* SECTION D: VERIFICATION STATUS CARD */}
                  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Verification Status
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Progressive 3-tier identity &amp; trust profile
                        </p>
                      </div>
                      <span className="text-sm font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                        Tier {user.tier}/3
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {[
                        {
                          label: 'Tier 1 · Campus Email',
                          done: user.emailVerified,
                          sub: user.email,
                        },
                        {
                          label: 'Tier 2 · Phone SMS OTP',
                          done: user.phoneVerified,
                          sub: user.phoneMasked || 'Required for reporting',
                        },
                        {
                          label: 'Tier 3 · Institutional ID',
                          done: user.identityVerified,
                          sub: user.studentOrStaffId || `Status: ${user.identityStatus}`,
                        },
                      ].map((tier) => (
                        <div
                          key={tier.label}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {tier.label}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {tier.sub}
                            </div>
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              tier.done
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {tier.done ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/70 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                          Community Trust Score
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          {user.verifiedReturnsCount} returns · {user.completedHandoversCount} handovers
                        </div>
                      </div>
                      <div className="text-xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                        {user.trustScore}/100
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveView('verification')}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      Manage Verification &amp; Profile
                    </button>
                  </section>

                  {/* SECTION E: NOTIFICATIONS & RECENT ACTIVITY */}
                  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Recent Activity
                      </h2>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {notifications.length} alerts
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 text-xs">
                      {notifications.slice(0, 4).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (n.linkView) setActiveView(n.linkView as ActiveView);
                          }}
                          className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors flex items-start justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {n.title}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              {n.body}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </button>
                      ))}

                      {auditLogs.slice(0, 3).map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-2"
                        >
                          <div>
                            <div className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              {log.action}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              {log.summary}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: DEDICATED INTERACTIVE CANVAS WORKSPACE */}
          {activeView === 'canvas' && user && (
            <InteractiveCanvasWorkspace
              user={user}
              reports={reports}
              matches={matches}
              claims={claims}
              custodyDesks={custodyDesks}
              notifications={notifications}
              auditLogs={auditLogs}
              externalTrigger={canvasExternalTrigger}
              onCreateReport={handleCreateReport}
              onAnalyzeMatchesForReport={handleAnalyzeMatchesForReport}
              onUpdateMatchStatus={handleUpdateMatchStatus}
              onSubmitClaim={handleSubmitClaim}
              onReviewClaim={handleReviewClaim}
              onValidateHandover={handleValidateHandover}
              onRegenerateToken={handleRegenerateToken}
              onArchiveReport={handleArchiveReport}
              onRestoreReport={handleRestoreReport}
              onQuickRoleSwitch={handleQuickRoleSwitch}
              onNavigateView={(v) => setActiveView(v)}
              onOpen3DViewer={(rep) => {
                setViewer3DReport(rep);
                setViewer3DOpen(true);
              }}
            />
          )}

          {/* VIEW 3: EXPLORE ITEMS & MULTI-FILTER SEARCH */}
          {activeView === 'explore' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                      Explore Lost &amp; Found Items
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Showing <span className="font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">{filteredExploreReports.length}</span> active report(s)
                    </p>
                    {aiSearchSummary && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                        AI Discovery Filter: {aiSearchSummary}
                      </p>
                    )}
                  </div>

                  {/* Prominent Search Input */}
                  <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* Multi-Dimensional Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {(['all', 'lost', 'found'] as const).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setTypeFilter(tf)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                          typeFilter === tf
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter by category"
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={zoneFilter}
                    onChange={(e) => setZoneFilter(e.target.value)}
                    aria-label="Filter by campus zone"
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">All Campus Zones</option>
                    {campusZones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by status"
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">All Statuses</option>
                    <option value="unresolved">Unresolved</option>
                    <option value="matched">Matched</option>
                    <option value="returned">Returned</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'priority')}
                    aria-label="Sort items"
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  >
                    <option value="newest">Sort: Most Recent</option>
                    <option value="priority">Sort: Highest Priority</option>
                  </select>
                </div>

                {/* Active Filter Summary */}
                {(typeFilter !== 'all' ||
                  categoryFilter !== 'all' ||
                  zoneFilter !== 'all' ||
                  statusFilter !== 'all' ||
                  searchQuery.trim() !== '') && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Active Filters:
                    </span>
                    {typeFilter !== 'all' && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        Type: {typeFilter}
                      </span>
                    )}
                    {categoryFilter !== 'all' && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        · Category: {categoryFilter}
                      </span>
                    )}
                    {zoneFilter !== 'all' && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        · Zone: {zoneFilter}
                      </span>
                    )}
                    {statusFilter !== 'all' && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        · Status: {statusFilter}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={clearExploreFilters}
                      className="text-rose-600 dark:text-rose-400 font-semibold hover:underline ml-2"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>

              {filteredExploreReports.length === 0 ? (
                <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3 shadow-xs">
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    No matching items found
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Try clearing one or more filters or broadening your search terms.
                  </p>
                  <button
                    type="button"
                    onClick={clearExploreFilters}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredExploreReports.map((rep) => (
                    <div
                      key={rep.id}
                      onClick={() => {
                        setSelectedReport(rep);
                        setActiveView('item_detail');
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-indigo-500 transition-all shadow-xs flex flex-col justify-between group"
                    >
                      <div>
                        {rep.images?.[0] && (
                          <img
                            src={rep.images[0].url}
                            alt={rep.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-44 object-cover border-b border-slate-200 dark:border-slate-800"
                          />
                        )}
                        <div className="p-5 space-y-2">
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={
                                  rep.type === 'lost'
                                    ? 'font-bold uppercase text-rose-600 dark:text-rose-400'
                                    : 'font-bold uppercase text-emerald-600 dark:text-emerald-400'
                                }
                              >
                                {rep.type}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{rep.category}</span>
                            </div>
                            <span className="font-mono text-[11px] capitalize text-slate-500">
                              {rep.status}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                            {rep.title}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                            {rep.distinguishingFeatures}
                          </p>
                        </div>
                      </div>
                      <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="truncate flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="truncate">{rep.approximateLocationLabel}</span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewer3DReport(rep);
                              setViewer3DOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-600 hover:text-white transition-colors"
                          >
                            <Box className="w-3 h-3" />
                            <span>3D View</span>
                          </button>
                          <span className="font-mono tabular-nums">{rep.incidentDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: INTERACTIVE CAMPUS MAP */}
          {activeView === 'map' && (
            <CampusMapView
              reports={reports}
              custodyDesks={custodyDesks}
              onSelectReport={(rep) => {
                setSelectedReport(rep);
                setActiveView('item_detail');
              }}
              onSendToCanvasZone={(rep, zoneId) => {
                setCanvasExternalTrigger({ report: rep, zoneId, ts: Date.now() });
                setActiveView('canvas');
              }}
              onReportLostClick={(coords) => handleOpenReportWizard('lost', coords)}
            />
          )}

          {/* VIEW 5: INTELLIGENT MATCHING DASHBOARD */}
          {activeView === 'matches' && (
            <MatchingDashboard
              matches={matches}
              onOpenClaimModal={(m) => {
                if (m.foundReport) {
                  setSelectedReport(m.foundReport);
                  setActiveView('item_detail');
                }
              }}
              onUpdateMatchStatus={handleUpdateMatchStatus}
              onSelectReport={(rep) => {
                setSelectedReport(rep);
                setActiveView('item_detail');
              }}
            />
          )}

          {/* VIEW 6: CLAIMS & SECURE QR/OTP HANDOVER */}
          {activeView === 'claims' && user && (
            <ClaimsAndHandoverView
              user={user}
              claims={claims}
              custodyDesks={custodyDesks}
              auditLogs={auditLogs}
              onReviewClaim={handleReviewClaim}
              onValidateHandover={handleValidateHandover}
              onRegenerateToken={handleRegenerateToken}
              onQuickSwitchToStaff={() => handleQuickRoleSwitch('staff')}
            />
          )}

          {/* VIEW 7: THREE-TIER IDENTITY VERIFICATION & PROFILE */}
          {activeView === 'verification' && user && (
            <VerificationCenterView user={user} onUserUpdated={(u) => setUser(u)} />
          )}

          {/* VIEW 8: SECURE IN-APP CHAT */}
          {activeView === 'chat' && user && (
            <SecureChatView
              user={user}
              conversations={conversations}
              messages={messages}
              onSendMessage={handleSendChatMessage}
              onReportAbuse={handleReportChatAbuse}
            />
          )}

          {/* VIEW 9: ITEM REPORT DETAIL & CLAIM FORM */}
          {activeView === 'item_detail' && selectedReport && (
            <ItemDetailView
              report={selectedReport}
              matches={matches}
              custodyDesks={custodyDesks}
              onBack={() => setActiveView('explore')}
              onOpen3DViewer={(rep) => {
                setViewer3DReport(rep);
                setViewer3DOpen(true);
              }}
              onSubmitClaim={handleSubmitClaim}
            />
          )}

          {/* VIEW 10: ADMIN & SECURITY-DESK PORTAL */}
          {activeView === 'admin' && user && (
            <AdminGovernancePortal
              user={user}
              reports={reports}
              custodyDesks={custodyDesks}
              verificationRequests={verificationRequests}
              disputes={disputes}
              auditLogs={auditLogs}
              onReviewTier3={handleReviewTier3}
              onResolveDispute={handleResolveDispute}
              onFlagReport={handleFlagReport}
              onArchiveReport={handleArchiveReport}
            />
          )}
        </main>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 grid grid-cols-5 gap-1"
      >
        {(
          [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'canvas', label: 'Canvas', icon: Layers },
            { id: 'explore', label: 'Explore', icon: Compass },
            { id: 'matches', label: 'Matches', icon: ArrowLeftRight },
            { id: 'claims', label: 'Claims', icon: QrCode },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-medium ${
                active
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quiet Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/Screenshot_2026-10-24_211219_4f02c02f.png"
              alt="Findora app icon"
              className="w-6 h-6 rounded-md object-cover shrink-0"
            />
            <span>
              <span className="font-bold text-slate-900 dark:text-white">Findora</span> — Smart Lost &amp; Found Platform · Lost it. Found it. Back to you.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveView('verification')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
            >
              Privacy &amp; Verification Policy
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
            >
              Custody &amp; Audit Governance
            </button>
          </div>
        </div>
      </footer>

      {/* 3-Step Guided Report Wizard Modal */}
      {reportModalOpen && (
        <ReportWizardModal
          initialType={reportModalType}
          initialCoords={reportModalCoords}
          custodyDesks={custodyDesks}
          reports={reports}
          onClose={() => setReportModalOpen(false)}
          onSubmitReport={handleCreateReport}
        />
      )}

      {/* Interactive Three.js 3D Object View & Item Verification Modal */}
      <Item3DViewerModal
        isOpen={viewer3DOpen}
        onClose={() => setViewer3DOpen(false)}
        report={viewer3DReport || selectedReport || activeReports[0] || reports[0] || null}
        allReports={activeReports.length > 0 ? activeReports : reports}
        onSelectReport={(rep) => setViewer3DReport(rep)}
        onStartClaim={(rep) => {
          setSelectedReport(rep);
          setActiveView(rep.type === 'found' ? 'item_detail' : 'matches');
        }}
        onSendToCanvas={(rep) => {
          setCanvasExternalTrigger({
            report: rep,
            zoneId: rep.type === 'found' ? 'ZONE_4_CLAIM_OWNERSHIP' : 'ZONE_3_FIND_MATCHES',
            ts: Date.now(),
          });
          setActiveView('canvas');
        }}
      />

      {/* Sign In / Create Account Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                {authMode === 'login' ? 'Sign In to Findora' : 'Create Campus Account'}
              </h3>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 rounded-xl">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                      placeholder="e.g., Rohan Verma"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="e.g., rohan_v"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {authMode === 'login' ? 'Campus Email or Username *' : 'Campus Email *'}
                </label>
                <input
                  type="text"
                  required
                  value={authIdentifier}
                  onChange={(e) => setAuthIdentifier(e.target.value)}
                  placeholder="arjun.mehta@campus.edu"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                {authMode === 'login' ? 'Sign In' : 'Register & Continue to Verification'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
