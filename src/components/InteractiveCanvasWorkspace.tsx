import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  GripVertical,
  PackagePlus,
  Search,
  ShieldCheck,
  Link2,
  QrCode,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Eye,
  Lock,
  Keyboard,
  Smartphone,
  Clock,
  RefreshCw,
  FileCheck2,
  XCircle,
  HelpCircle,
  FlaskConical,
  Camera,
  Sliders,
  UserCheck,
  Award,
  Box,
} from 'lucide-react';
import {
  User,
  ItemReport,
  PotentialMatch,
  OwnershipClaim,
  CustodyDesk,
  AppNotification,
  AuditLogEntry,
  CanvasCardType,
  CanvasZoneId,
  ItemCategory,
  ReportType,
  PriorityLevel,
} from '../types';
import { CampusMapView } from './CampusMapView';
import { Item3DViewerModal } from './Item3DViewerModal';

export interface CanvasDraggableCard {
  uid: string;
  cardType: CanvasCardType;
  id: string;
  title: string;
  subtitle: string;
  category?: string;
  color?: string;
  badgeText: string;
  locationLabel?: string;
  dateLabel?: string;
  timeWindowLabel?: string;
  distinguishingSnippet?: string;
  matchCount?: number;
  matchStrengthLabel?: string;
  statusLabel: string;
  score?: number;
  imageUrl?: string;
  archived?: boolean;
  isTutorialSandbox?: boolean;
  rawReport?: ItemReport;
  rawMatch?: PotentialMatch;
  rawClaim?: OwnershipClaim;
  rawNotification?: AppNotification;
  draftPreset?: {
    type: ReportType;
    title: string;
    category: ItemCategory;
    brand: string;
    color: string;
    buildingName: string;
    campusZone: string;
    distinguishingFeatures: string;
  };
}

interface ActionZoneSpec {
  id: CanvasZoneId;
  zoneNumber: string;
  title: string;
  dropActionLabel: string;
  description: string;
  nextStepHint: string;
  acceptedTypes: CanvasCardType[];
  accentColor: string;
}

const ACTION_ZONES: ActionZoneSpec[] = [
  {
    id: 'ZONE_1_REPORT_LOST',
    zoneNumber: 'ZONE 1',
    title: 'REPORT LOST',
    dropActionLabel: 'DROP TO REPORT LOST',
    description: 'Accepts Blank or Draft Lost Cards',
    nextStepHint: 'Opens 4-step Lost Report Builder & Commit Zone',
    acceptedTypes: ['draft_report'],
    accentColor: 'rose',
  },
  {
    id: 'ZONE_2_REPORT_FOUND',
    zoneNumber: 'ZONE 2',
    title: 'REPORT FOUND',
    dropActionLabel: 'DROP TO REPORT FOUND',
    description: 'Accepts Blank or Draft Found Cards',
    nextStepHint: 'Opens Found Report Builder with private clue vault',
    acceptedTypes: ['draft_report'],
    accentColor: 'emerald',
  },
  {
    id: 'ZONE_3_FIND_MATCHES',
    zoneNumber: 'ZONE 3',
    title: 'FIND MATCHES',
    dropActionLabel: 'DROP TO ANALYSE MATCHES',
    description: 'Accepts Lost or Found Item Cards',
    nextStepHint: 'Runs 5-signal matching engine & ranks candidates',
    acceptedTypes: ['lost_item', 'found_item'],
    accentColor: 'blue',
  },
  {
    id: 'ZONE_4_CLAIM_OWNERSHIP',
    zoneNumber: 'ZONE 4',
    title: 'START CLAIM',
    dropActionLabel: 'DROP TO START CLAIM',
    description: 'Accepts Found, Match, Claim, or Verification Cards',
    nextStepHint: 'Submits private ownership proof or reviews claim',
    acceptedTypes: ['found_item', 'potential_match', 'claim_card', 'verification_card'],
    accentColor: 'amber',
  },
  {
    id: 'ZONE_5_CONFIRM_MATCH',
    zoneNumber: 'ZONE 5',
    title: 'REVIEW MATCH',
    dropActionLabel: 'DROP TO LINK REPORTS',
    description: 'Accepts Potential Match or Item Cards',
    nextStepHint: 'Links candidate reports side-by-side for claim review',
    acceptedTypes: ['potential_match', 'lost_item', 'found_item'],
    accentColor: 'violet',
  },
  {
    id: 'ZONE_6_COMPLETE_RETURN',
    zoneNumber: 'ZONE 6',
    title: 'COMPLETE RETURN',
    dropActionLabel: 'DROP TO COMPLETE RETURN',
    description: 'Accepts Approved Claim / Return Cards',
    nextStepHint: 'Validates short-lived QR/OTP & records audit trail',
    acceptedTypes: ['return_card', 'claim_card'],
    accentColor: 'teal',
  },
  {
    id: 'ZONE_7_ARCHIVE',
    zoneNumber: 'ZONE 7',
    title: 'ARCHIVE',
    dropActionLabel: 'DROP TO ARCHIVE',
    description: 'Accepts Unresolved Item or Alert Cards',
    nextStepHint: 'Archives report with 1-click Undo support',
    acceptedTypes: ['lost_item', 'found_item', 'notification_card'],
    accentColor: 'slate',
  },
];

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

function classifyMatchStrength(score: number): {
  label: 'Strong Potential Match' | 'Possible Match' | 'Weak Match' | 'No Suitable Match';
  colorClass: string;
} {
  if (score >= 80) {
    return {
      label: 'Strong Potential Match',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  if (score >= 65) {
    return {
      label: 'Possible Match',
      colorClass: 'text-blue-600 dark:text-blue-400',
    };
  }
  if (score >= 45) {
    return {
      label: 'Weak Match',
      colorClass: 'text-amber-600 dark:text-amber-400',
    };
  }
  return {
    label: 'No Suitable Match',
    colorClass: 'text-slate-500',
  };
}

interface CanvasHistoryEntry {
  id: string;
  timestamp: string;
  zoneTitle: string;
  cardTitle: string;
  summary: string;
  status: 'success' | 'rejected';
  isSandbox?: boolean;
  undoReportId?: string;
  undoMatchId?: string;
  previousMatchStatus?: PotentialMatch['status'];
}

interface InteractiveCanvasWorkspaceProps {
  user: User;
  reports: ItemReport[];
  matches: PotentialMatch[];
  claims: OwnershipClaim[];
  custodyDesks: CustodyDesk[];
  notifications: AppNotification[];
  auditLogs: AuditLogEntry[];
  externalTrigger?: { report: ItemReport; zoneId: CanvasZoneId; ts: number } | null;
  onCreateReport: (payload: any) => Promise<any>;
  onAnalyzeMatchesForReport: (reportId: string) => Promise<{ report: ItemReport; matches: PotentialMatch[] }>;
  onUpdateMatchStatus: (matchId: string, status: PotentialMatch['status']) => Promise<void>;
  onSubmitClaim: (payload: any) => Promise<void>;
  onReviewClaim: (claimId: string, decision: 'approved' | 'rejected', reviewerNotes: string) => Promise<void>;
  onValidateHandover: (codeOrToken: string, custodyDeskId: string, staffNotes: string) => Promise<string>;
  onRegenerateToken: (claimId: string, custodyDeskId?: string, pickupWindow?: string) => Promise<void>;
  onArchiveReport: (reportId: string) => Promise<void>;
  onRestoreReport: (reportId: string) => Promise<void>;
  onQuickRoleSwitch: (role: 'student' | 'finder' | 'staff' | 'admin') => Promise<void>;
  onNavigateView: (view: any) => void;
  onOpen3DViewer?: (report: ItemReport) => void;
}

type CenterWorkspaceMode =
  | 'board'
  | 'draft_builder'
  | 'match_analyzer'
  | 'claim_workspace'
  | 'return_terminal'
  | 'map_workspace'
  | 'profile_trust'
  | 'inspect_3d';

type LibraryTab =
  | 'all'
  | 'drafts'
  | 'lost'
  | 'found'
  | 'matches'
  | 'claims_returns'
  | 'archived';

export const InteractiveCanvasWorkspace: React.FC<InteractiveCanvasWorkspaceProps> = ({
  user,
  reports,
  matches,
  claims,
  custodyDesks,
  notifications,
  externalTrigger,
  onCreateReport,
  onAnalyzeMatchesForReport,
  onUpdateMatchStatus,
  onSubmitClaim,
  onReviewClaim,
  onValidateHandover,
  onRegenerateToken,
  onArchiveReport,
  onRestoreReport,
  onQuickRoleSwitch,
  onNavigateView,
  onOpen3DViewer,
}) => {
  // Library filtering & search
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('all');
  const [cardSearch, setCardSearch] = useState('');

  // Onboarding Guide Overlay & Isolated Tutorial Sandbox Mode
  const [showOnboardingGuide, setShowOnboardingGuide] = useState<boolean>(false);
  const [tutorialSandboxActive, setTutorialSandboxActive] = useState<boolean>(false);

  // Drag & Drop + Keyboard / Touch State
  const [draggedCard, setDraggedCard] = useState<CanvasDraggableCard | null>(null);
  const [hoveredZone, setHoveredZone] = useState<CanvasZoneId | null>(null);
  const [selectedCard, setSelectedCard] = useState<CanvasDraggableCard | null>(null);
  const [keyboardGrabbedCard, setKeyboardGrabbedCard] = useState<CanvasDraggableCard | null>(null);
  const [keyboardTargetZoneIdx, setKeyboardTargetZoneIdx] = useState<number>(0);
  const [mobileSheetCard, setMobileSheetCard] = useState<CanvasDraggableCard | null>(null);

  // Center Active Workspace State
  const [workspaceMode, setWorkspaceMode] = useState<CenterWorkspaceMode>('board');
  const [rightInspectorTab, setRightInspectorTab] = useState<'details' | '3d'>('details');
  const [inspectOverrideReport, setInspectOverrideReport] = useState<ItemReport | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    detail: string;
  } | null>(null);
  const [history, setHistory] = useState<CanvasHistoryEntry[]>([]);
  const [busyAction, setBusyAction] = useState(false);

  // Mode 1: Draft Report Builder State (for ZONE 1 & ZONE 2)
  const [draftType, setDraftType] = useState<ReportType>('lost');
  const [draftStep, setDraftStep] = useState<1 | 2 | 3 | 4>(1);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState<ItemCategory>('Electronics');
  const [draftPriority, setDraftPriority] = useState<PriorityLevel>('high');
  const [draftBrand, setDraftBrand] = useState('');
  const [draftModel, setDraftModel] = useState('');
  const [draftColor, setDraftColor] = useState('');
  const [draftMaterial, setDraftMaterial] = useState('');
  const [draftFeatures, setDraftFeatures] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftZone, setDraftZone] = useState('Academic Quadrangle');
  const [draftBuilding, setDraftBuilding] = useState('Central Academic Library');
  const [draftFloor, setDraftFloor] = useState('Level 2 Reading Hall');
  const [draftLat, setDraftLat] = useState<number>(37.4275);
  const [draftLng, setDraftLng] = useState<number>(-122.1697);
  const [draftDate, setDraftDate] = useState(new Date().toISOString().slice(0, 10));
  const [draftTimeWindow, setDraftTimeWindow] = useState('14:00 – 16:30');
  const [draftCustodyDeskId, setDraftCustodyDeskId] = useState(custodyDesks[0]?.id || 'desk-central-1');
  const [draftSecretAnswer, setDraftSecretAnswer] = useState('');
  const [draftSecretQuestion, setDraftSecretQuestion] = useState(
    'What specific sticker, engraving, or lock-screen detail is on this item?'
  );
  const [draftImagePreview, setDraftImagePreview] = useState<string | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [commitZoneHover, setCommitZoneHover] = useState(false);

  // Mode 2: Match Analysis & Configurable Weights State (for ZONE 3 & ZONE 5)
  const [analyzedReport, setAnalyzedReport] = useState<ItemReport | null>(null);
  const [analyzedMatches, setAnalyzedMatches] = useState<PotentialMatch[]>([]);
  const [activeMatchForReview, setActiveMatchForReview] = useState<PotentialMatch | null>(
    matches[0] || null
  );
  const [pairedLostReport, setPairedLostReport] = useState<ItemReport | null>(null);
  const [pairedFoundReport, setPairedFoundReport] = useState<ItemReport | null>(null);
  const [showWeightTuner, setShowWeightTuner] = useState(false);
  const [weights, setWeights] = useState({
    category: 25,
    appearance: 20,
    location: 20,
    timeline: 15,
    description: 20,
  });
  const [aiInsightLoading, setAiInsightLoading] = useState(false);

  // Mode 3: Claim Ownership & Review Workspace State (for ZONE 4)
  const [claimTargetFoundReport, setClaimTargetFoundReport] = useState<ItemReport | null>(null);
  const [claimTargetMatch, setClaimTargetMatch] = useState<PotentialMatch | null>(null);
  const [activeClaimForReview, setActiveClaimForReview] = useState<OwnershipClaim | null>(null);
  const [claimSecretInput, setClaimSecretInput] = useState('');
  const [claimProofInput, setClaimProofInput] = useState('');
  const [claimCustodyDeskId, setClaimCustodyDeskId] = useState(custodyDesks[0]?.id || 'desk-central-1');
  const [claimPickupWindow, setClaimPickupWindow] = useState('Today · 14:00 – 17:30');
  const [claimReviewerNotes, setClaimReviewerNotes] = useState('');

  // Mode 4: Complete Return QR / OTP Workspace State (for ZONE 6)
  const [activeReturnClaim, setActiveReturnClaim] = useState<OwnershipClaim | null>(
    claims.find((c) => c.status === 'approved') || claims[0] || null
  );
  const [handoverOtpInput, setHandoverOtpInput] = useState('');
  const [handoverDeskId, setHandoverDeskId] = useState(custodyDesks[0]?.id || 'desk-central-1');
  const [handoverStaffNotes, setHandoverStaffNotes] = useState('');
  const [confirmHandoverPending, setConfirmHandoverPending] = useState(false);
  const [innerDropHoverId, setInnerDropHoverId] = useState<string | null>(null);

  const handleResetCanvas = () => {
    setSelectedCard(null);
    setDraggedCard(null);
    setHoveredZone(null);
    setKeyboardGrabbedCard(null);
    setMobileSheetCard(null);
    setFeedbackBanner(null);
    setConfirmHandoverPending(false);
    setInnerDropHoverId(null);
    setWorkspaceMode('board');
  };

  // Build unified list of typed draggable cards (Real Database Cards + Isolated Sandbox Cards when toggled)
  const allCards: CanvasDraggableCard[] = useMemo(() => {
    const list: CanvasDraggableCard[] = [];

    // Isolated Tutorial Sandbox Cards (Strictly separated from production data)
    if (tutorialSandboxActive) {
      list.push(
        {
          uid: 'sandbox-card-lost-airpods',
          cardType: 'lost_item',
          id: 'sandbox-lost-1',
          title: '[SANDBOX] White AirPods Pro (2nd Gen)',
          subtitle: 'Electronics · White · Non-Production Tutorial Sample',
          category: 'Electronics',
          color: 'White',
          badgeText: 'TUTORIAL SANDBOX · LOST CARD',
          locationLabel: 'Sandbox Campus Courtyard',
          dateLabel: 'Tutorial Mode',
          timeWindowLabel: '10:00 – 11:00',
          distinguishingSnippet: 'Practice dragging this card into ZONE 3: FIND MATCHES',
          matchCount: 1,
          statusLabel: 'SANDBOX SAMPLE',
          isTutorialSandbox: true,
        },
        {
          uid: 'sandbox-card-match-airpods',
          cardType: 'potential_match',
          id: 'sandbox-match-1',
          title: '[SANDBOX] AirPods Pro Match (92% Strong Match)',
          subtitle: '40m apart · Practice dragging into ZONE 4 or ZONE 5',
          category: 'Electronics',
          badgeText: 'TUTORIAL SANDBOX · 92% MATCH',
          locationLabel: 'Sandbox Desk',
          dateLabel: '1h delta',
          matchStrengthLabel: 'Strong Potential Match',
          statusLabel: 'SANDBOX SAMPLE',
          score: 92,
          isTutorialSandbox: true,
        }
      );
    }

    // 1. Draft / Template Report Cards
    const draftTemplates: CanvasDraggableCard[] = [
      {
        uid: 'card-draft-lost-blank',
        cardType: 'draft_report',
        id: 'draft-lost-blank',
        title: 'New Lost Item Draft Card',
        subtitle: 'Drag to ZONE 1: REPORT LOST to start a lost report',
        category: 'Electronics',
        badgeText: 'DRAFT · LOST TEMPLATE',
        locationLabel: 'Campus Location',
        dateLabel: 'Today',
        statusLabel: 'Ready to Draft',
        draftPreset: {
          type: 'lost',
          title: '',
          category: 'Electronics',
          brand: '',
          color: '',
          buildingName: 'Central Academic Library',
          campusZone: 'Academic Quadrangle',
          distinguishingFeatures: '',
        },
      },
      {
        uid: 'card-draft-found-blank',
        cardType: 'draft_report',
        id: 'draft-found-blank',
        title: 'New Found Item Draft Card',
        subtitle: 'Drag to ZONE 2: REPORT FOUND to log a found item',
        category: 'Wallets and purses',
        badgeText: 'DRAFT · FOUND TEMPLATE',
        locationLabel: 'Custody Desk / Campus',
        dateLabel: 'Today',
        statusLabel: 'Ready to Draft',
        draftPreset: {
          type: 'found',
          title: '',
          category: 'Wallets and purses',
          brand: '',
          color: '',
          buildingName: 'Student Union Commons',
          campusZone: 'North Campus',
          distinguishingFeatures: '',
        },
      },
      {
        uid: 'card-draft-lost-laptop',
        cardType: 'draft_report',
        id: 'draft-lost-laptop',
        title: 'Quick Preset: Lost Laptop / Tablet',
        subtitle: 'Pre-filled Electronics draft — drag to ZONE 1',
        category: 'Electronics',
        badgeText: 'PRESET · LOST ELECTRONICS',
        locationLabel: 'Engineering Lab / Library',
        dateLabel: 'Today',
        statusLabel: 'Preset Template',
        draftPreset: {
          type: 'lost',
          title: '14-inch Silver Laptop in Sleeve',
          category: 'Electronics',
          brand: 'Apple',
          color: 'Silver',
          buildingName: 'Central Academic Library',
          campusZone: 'Academic Quadrangle',
          distinguishingFeatures: 'Matte protective case with robotics club decal on bottom corner',
        },
      },
    ];
    list.push(...draftTemplates);

    // 2. Lost & Found Item Cards from database (with real match counts & full public details)
    for (const rep of reports) {
      const repMatchCount = matches.filter(
        (m) => m.lostReportId === rep.id || m.foundReportId === rep.id
      ).length;
      list.push({
        uid: `card-rep-${rep.id}`,
        cardType: rep.type === 'lost' ? 'lost_item' : 'found_item',
        id: rep.id,
        title: rep.title,
        subtitle: `${rep.category} · ${rep.color}`,
        category: rep.category,
        color: rep.color,
        badgeText: rep.type === 'lost' ? 'LOST ITEM CARD' : 'FOUND ITEM CARD',
        locationLabel: rep.approximateLocationLabel || rep.buildingName,
        dateLabel: rep.incidentDate,
        timeWindowLabel: rep.incidentTimeWindow,
        distinguishingSnippet: rep.distinguishingFeatures,
        matchCount: repMatchCount,
        statusLabel: rep.archived ? 'Archived' : rep.status.toUpperCase(),
        imageUrl: rep.images?.[0]?.url,
        archived: Boolean(rep.archived),
        rawReport: rep,
      });
    }

    // 3. Potential Match Cards (with explicit strength tier classification)
    for (const m of matches) {
      const strength = classifyMatchStrength(m.totalScore);
      list.push({
        uid: `card-match-${m.id}`,
        cardType: 'potential_match',
        id: m.id,
        title: `${m.lostReport?.title || 'Lost Item'} ↔ ${m.foundReport?.title || 'Found Item'}`,
        subtitle: `${m.distanceMeters}m apart · ${m.explanations[0] || 'Multi-signal match'}`,
        category: m.lostReport?.category,
        badgeText: `POTENTIAL MATCH · ${m.totalScore}%`,
        locationLabel: m.foundReport?.approximateLocationLabel,
        dateLabel: `${m.timeDeltaHours}h delta`,
        matchStrengthLabel: strength.label,
        statusLabel: m.status.toUpperCase(),
        score: m.totalScore,
        rawMatch: m,
      });
    }

    // 4. Ownership Claim & Return Cards
    for (const c of claims) {
      const isReturnReady = c.status === 'approved' || c.status === 'completed';
      list.push({
        uid: `card-claim-${c.id}`,
        cardType: isReturnReady ? 'return_card' : 'claim_card',
        id: c.id,
        title: `${c.foundReportTitle} (${c.id})`,
        subtitle: isReturnReady
          ? `Approved Claim · Desk: ${c.custodyDeskId} · ${
              c.handoverOtp ? `OTP Ready` : 'Handover Completed'
            }`
          : `Claimant: ${c.claimantName} · Evidence Similarity: ${c.automatedEvidenceSimilarity}%`,
        badgeText: isReturnReady ? 'RETURN / QR CARD' : 'CLAIM CARD',
        locationLabel: c.custodyDeskId,
        dateLabel: c.pickupWindow,
        distinguishingSnippet: isReturnReady
          ? 'Next step: Present short-lived QR/OTP at Custody Desk (Zone 6)'
          : 'Next step: Authorized Finder / Custody Staff Review (Zone 4)',
        statusLabel: c.status.toUpperCase(),
        score: c.automatedEvidenceSimilarity,
        rawClaim: c,
      });
    }

    // 5. Verification & Notification Cards
    list.push({
      uid: `card-ver-${user.id}`,
      cardType: 'verification_card',
      id: user.id,
      title: `${user.fullName} — Identity & Trust Card`,
      subtitle: `Email: ${user.emailVerified ? 'Verified' : 'Not started'} · Phone: ${
        user.phoneVerified ? 'Verified' : 'Not started'
      } · ID: ${
        user.identityVerified
          ? 'Verified'
          : user.identityStatus === 'pending'
          ? 'Under review'
          : 'Not started'
      }`,
      badgeText: `VERIFICATION · TIER ${user.tier}`,
      locationLabel: user.institutionName || 'Campus Member',
      dateLabel: `Trust ${user.trustScore}`,
      distinguishingSnippet: 'Drop into ZONE 4 to open Verification & Trust Center',
      statusLabel: `TIER ${user.tier}`,
    });

    for (const n of notifications.slice(0, 6)) {
      list.push({
        uid: `card-notif-${n.id}`,
        cardType: 'notification_card',
        id: n.id,
        title: n.title,
        subtitle: n.body,
        badgeText: `ALERT · ${n.type.toUpperCase()}`,
        dateLabel: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        statusLabel: n.read ? 'READ' : 'ACTIVE',
        rawNotification: n,
      });
    }

    return list;
  }, [reports, matches, claims, user, notifications, tutorialSandboxActive]);

  const filteredCards = useMemo(() => {
    return allCards.filter((c) => {
      if (libraryTab === 'archived') {
        if (!c.archived) return false;
      } else {
        if (c.archived) return false;
      }

      if (libraryTab === 'drafts' && c.cardType !== 'draft_report') return false;
      if (libraryTab === 'lost' && c.cardType !== 'lost_item') return false;
      if (libraryTab === 'found' && c.cardType !== 'found_item') return false;
      if (libraryTab === 'matches' && c.cardType !== 'potential_match') return false;
      if (
        libraryTab === 'claims_returns' &&
        c.cardType !== 'claim_card' &&
        c.cardType !== 'return_card'
      ) {
        return false;
      }

      if (cardSearch.trim()) {
        const q = cardSearch.toLowerCase();
        const hay = `${c.title} ${c.subtitle} ${c.badgeText} ${c.locationLabel || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allCards, libraryTab, cardSearch]);

  // Core validation function: validateDrop(card, zone)
  const validateDrop = (
    card: CanvasDraggableCard,
    zone: ActionZoneSpec
  ): { valid: boolean; reason?: string } => {
    if (!zone.acceptedTypes.includes(card.cardType)) {
      return {
        valid: false,
        reason: `"${card.badgeText}" cannot be dropped into ${zone.zoneNumber}: ${zone.title}. Expected: ${zone.description}.`,
      };
    }

    if (zone.id === 'ZONE_7_ARCHIVE' && card.rawReport) {
      if (card.rawReport.status === 'returned') {
        return {
          valid: false,
          reason:
            'Completed return records are locked in the permanent custody audit trail and cannot be archived.',
        };
      }
      const isOwner = card.rawReport.reporterId === user.id;
      const isStaffOrAdmin = user.role === 'admin' || user.role === 'custody_staff';
      if (!isOwner && !isStaffOrAdmin) {
        return {
          valid: false,
          reason: `Permission Denied: Only the reporter (${card.rawReport.reporterName}) or authorized staff can archive this card.`,
        };
      }
    }

    if (zone.id === 'ZONE_4_CLAIM_OWNERSHIP' && card.rawReport?.status === 'returned') {
      return {
        valid: false,
        reason: 'This item has already completed return handover and cannot accept new claims.',
      };
    }

    return { valid: true };
  };

  const recordCanvasHistory = (
    zoneTitle: string,
    cardTitle: string,
    summary: string,
    status: 'success' | 'rejected',
    extra?: Partial<CanvasHistoryEntry>
  ) => {
    setHistory((prev) => [
      {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        zoneTitle,
        cardTitle,
        summary,
        status,
        ...extra,
      },
      ...prev.slice(0, 14),
    ]);
  };

  // Core execution engine: executeCanvasAction(card, zoneId)
  const executeCanvasAction = async (card: CanvasDraggableCard, zoneId: CanvasZoneId) => {
    const zone = ACTION_ZONES.find((z) => z.id === zoneId);
    if (!zone) return;

    const validation = validateDrop(card, zone);
    if (!validation.valid) {
      setFeedbackBanner({
        type: 'error',
        title: `Incompatible Drop Rejected (${zone.zoneNumber})`,
        detail: validation.reason || 'This card type is not compatible with the target Action Zone.',
      });
      recordCanvasHistory(zone.title, card.title, validation.reason || 'Rejected drop', 'rejected');
      return;
    }

    // Handle Isolated Non-Production Tutorial Sandbox Cards safely without mutating real database
    if (card.isTutorialSandbox) {
      setSelectedCard(card);
      setFeedbackBanner({
        type: 'info',
        title: `[TUTORIAL SANDBOX] Simulated Drop into ${zone.zoneNumber}: ${zone.title}`,
        detail: `Great job! In production mode, dropping "${card.title}" into ${zone.title} executes: ${zone.nextStepHint}. Tutorial cards never alter real database records.`,
      });
      recordCanvasHistory(
        zone.title,
        card.title,
        `[Tutorial Sandbox] Practiced dropping "${card.title}" into ${zone.title}.`,
        'success',
        { isSandbox: true }
      );
      setDraggedCard(null);
      setHoveredZone(null);
      setKeyboardGrabbedCard(null);
      setMobileSheetCard(null);
      return;
    }

    setSelectedCard(card);
    setBusyAction(true);

    try {
      // ZONE 1: REPORT LOST
      if (zoneId === 'ZONE_1_REPORT_LOST') {
        setDraftType('lost');
        setDraftStep(1);
        if (card.draftPreset) {
          setDraftTitle(card.draftPreset.title);
          setDraftCategory(card.draftPreset.category);
          setDraftBrand(card.draftPreset.brand);
          setDraftColor(card.draftPreset.color);
          setDraftBuilding(card.draftPreset.buildingName);
          setDraftZone(card.draftPreset.campusZone);
          setDraftFeatures(card.draftPreset.distinguishingFeatures);
        }
        setWorkspaceMode('draft_builder');
        setFeedbackBanner({
          type: 'info',
          title: 'ZONE 1 Activated — Lost Item Report Workspace',
          detail:
            'Complete the 4 structured steps below, then drag the Ready-to-Commit Card into the Commit Drop Zone to persist your Lost Report.',
        });
        recordCanvasHistory(
          zone.title,
          card.title,
          'Opened Lost Item Draft Workspace on center canvas.',
          'success'
        );
      }

      // ZONE 2: REPORT FOUND
      else if (zoneId === 'ZONE_2_REPORT_FOUND') {
        setDraftType('found');
        setDraftStep(1);
        if (card.draftPreset) {
          setDraftTitle(card.draftPreset.title);
          setDraftCategory(card.draftPreset.category);
          setDraftBrand(card.draftPreset.brand);
          setDraftColor(card.draftPreset.color);
          setDraftBuilding(card.draftPreset.buildingName);
          setDraftZone(card.draftPreset.campusZone);
          setDraftFeatures(card.draftPreset.distinguishingFeatures);
        }
        setWorkspaceMode('draft_builder');
        setFeedbackBanner({
          type: 'info',
          title: 'ZONE 2 Activated — Found Item Custody Report Workspace',
          detail:
            'Enter the found item details and private verification clue, then drag the Ready-to-Commit Card into the Commit Drop Zone.',
        });
        recordCanvasHistory(
          zone.title,
          card.title,
          'Opened Found Item Draft Workspace on center canvas.',
          'success'
        );
      }

      // ZONE 3: FIND MATCHES
      else if (zoneId === 'ZONE_3_FIND_MATCHES' && card.rawReport) {
        const result = await onAnalyzeMatchesForReport(card.rawReport.id);
        setAnalyzedReport(result.report);
        setAnalyzedMatches(result.matches);
        if (result.matches[0]) {
          setActiveMatchForReview(result.matches[0]);
        }
        setWorkspaceMode('match_analyzer');
        setFeedbackBanner({
          type: 'success',
          title: `ZONE 3 Match Engine Completed — ${result.matches.length} Candidate Match(es)`,
          detail: `Multi-signal analysis evaluated category, color, proximity, timeline, and descriptions for "${result.report.title}".`,
        });
        recordCanvasHistory(
          zone.title,
          card.title,
          `Ran multi-signal matching: ${result.matches.length} candidate(s) ranked.`,
          'success'
        );
      }

      // ZONE 4: CLAIM OWNERSHIP (OR VERIFICATION WORKFLOW)
      else if (zoneId === 'ZONE_4_CLAIM_OWNERSHIP') {
        if (card.cardType === 'verification_card') {
          onNavigateView('verification');
          return;
        }
        if (card.cardType === 'found_item' && card.rawReport) {
          setClaimTargetFoundReport(card.rawReport);
          setClaimTargetMatch(null);
          setActiveClaimForReview(null);
          setWorkspaceMode('claim_workspace');
          setFeedbackBanner({
            type: 'info',
            title: 'ZONE 4 Activated — Ownership Claim Builder',
            detail: `Provide your private ownership proof for "${card.rawReport.title}", then drag the Prepared Claim Card into the Submit Claim Zone.`,
          });
          recordCanvasHistory(
            zone.title,
            card.title,
            `Initialized ownership claim workflow for "${card.rawReport.title}".`,
            'success'
          );
        } else if (card.cardType === 'potential_match' && card.rawMatch) {
          setClaimTargetMatch(card.rawMatch);
          setClaimTargetFoundReport(card.rawMatch.foundReport || null);
          setActiveClaimForReview(null);
          setWorkspaceMode('claim_workspace');
          setFeedbackBanner({
            type: 'info',
            title: `ZONE 4 Activated — Claim from ${card.rawMatch.totalScore}% Match`,
            detail: `Answer the verification prompt for "${card.rawMatch.foundReport?.title}" and drag the Prepared Claim Card to submit.`,
          });
          recordCanvasHistory(
            zone.title,
            card.title,
            `Started claim from ${card.rawMatch.totalScore}% match card.`,
            'success'
          );
        } else if (card.cardType === 'claim_card' && card.rawClaim) {
          setActiveClaimForReview(card.rawClaim);
          setClaimTargetFoundReport(
            reports.find((r) => r.id === card.rawClaim?.foundReportId) || null
          );
          setWorkspaceMode('claim_workspace');
          setFeedbackBanner({
            type: 'info',
            title: 'ZONE 4 Activated — Authorized Claim Review',
            detail: `Inspect claimant evidence (${card.rawClaim.automatedEvidenceSimilarity}% similarity) and drag the Claim Card into Approve or Reject below.`,
          });
          recordCanvasHistory(
            zone.title,
            card.title,
            `Loaded claim ${card.rawClaim.id} into Authorized Review workspace.`,
            'success'
          );
        }
      }

      // ZONE 5: CONFIRM MATCH
      else if (zoneId === 'ZONE_5_CONFIRM_MATCH') {
        if (card.cardType === 'potential_match' && card.rawMatch) {
          const prevStatus = card.rawMatch.status;
          await onUpdateMatchStatus(card.rawMatch.id, 'confirmed');
          setActiveMatchForReview({ ...card.rawMatch, status: 'confirmed' });
          setWorkspaceMode('match_analyzer');
          setFeedbackBanner({
            type: 'success',
            title: 'ZONE 5 Match Confirmed & Linked',
            detail: `Linked "${card.rawMatch.lostReport?.title}" and "${card.rawMatch.foundReport?.title}" (${card.rawMatch.totalScore}% similarity). Note: Confirming a match does NOT establish ownership—submit or approve a verified Claim next.`,
          });
          recordCanvasHistory(
            zone.title,
            card.title,
            `Confirmed candidate match (${card.rawMatch.totalScore}%). Ready for ownership claim.`,
            'success',
            { undoMatchId: card.rawMatch.id, previousMatchStatus: prevStatus }
          );
        } else if (card.cardType === 'lost_item' && card.rawReport) {
          setPairedLostReport(card.rawReport);
          setWorkspaceMode('match_analyzer');
          if (pairedFoundReport) {
            const existing = matches.find(
              (m) =>
                m.lostReportId === card.rawReport!.id && m.foundReportId === pairedFoundReport.id
            );
            if (existing) {
              await onUpdateMatchStatus(existing.id, 'confirmed');
              setActiveMatchForReview({ ...existing, status: 'confirmed' });
              setFeedbackBanner({
                type: 'success',
                title: 'ZONE 5 Paired Lost + Found Cards Linked',
                detail: `Confirmed link between "${card.rawReport.title}" and "${pairedFoundReport.title}" (${existing.totalScore}% similarity).`,
              });
            }
          } else {
            setFeedbackBanner({
              type: 'info',
              title: 'Lost Item Staged in ZONE 5',
              detail: `Now drag a Found Item Card or Potential Match Card into ZONE 5 to compare and link them.`,
            });
          }
          recordCanvasHistory(
            zone.title,
            card.title,
            `Staged Lost card "${card.rawReport.title}" in Review Match workspace.`,
            'success'
          );
        } else if (card.cardType === 'found_item' && card.rawReport) {
          setPairedFoundReport(card.rawReport);
          setWorkspaceMode('match_analyzer');
          if (pairedLostReport) {
            const existing = matches.find(
              (m) =>
                m.lostReportId === pairedLostReport.id && m.foundReportId === card.rawReport!.id
            );
            if (existing) {
              await onUpdateMatchStatus(existing.id, 'confirmed');
              setActiveMatchForReview({ ...existing, status: 'confirmed' });
              setFeedbackBanner({
                type: 'success',
                title: 'ZONE 5 Paired Lost + Found Cards Linked',
                detail: `Confirmed link between "${pairedLostReport.title}" and "${card.rawReport.title}" (${existing.totalScore}% similarity).`,
              });
            }
          } else {
            setFeedbackBanner({
              type: 'info',
              title: 'Found Item Staged in ZONE 5',
              detail: `Now drag a Lost Item Card or Potential Match Card into ZONE 5 to link them.`,
            });
          }
          recordCanvasHistory(
            zone.title,
            card.title,
            `Staged Found card "${card.rawReport.title}" in Review Match workspace.`,
            'success'
          );
        }
      }

      // ZONE 6: COMPLETE RETURN
      else if (zoneId === 'ZONE_6_COMPLETE_RETURN' && card.rawClaim) {
        setActiveReturnClaim(card.rawClaim);
        setHandoverOtpInput(card.rawClaim.handoverOtp || '');
        setHandoverDeskId(card.rawClaim.custodyDeskId || custodyDesks[0]?.id || 'desk-central-1');
        setWorkspaceMode('return_terminal');
        if (card.rawClaim.status === 'approved') {
          setFeedbackBanner({
            type: 'info',
            title: 'ZONE 6 Activated — Secure QR / OTP Custody Return Terminal',
            detail: `Short-lived pickup pass loaded for "${card.rawClaim.foundReportTitle}". Custody Desk Staff can drag the Return Card into the Finalize Handover Zone below to complete the return.`,
          });
        } else {
          setFeedbackBanner({
            type: 'info',
            title: `Claim Status: ${card.rawClaim.status.toUpperCase()}`,
            detail:
              card.rawClaim.status === 'completed'
                ? 'This item return has already been validated and logged in the custody audit trail.'
                : 'This claim must be approved before a pickup QR/OTP token is issued.',
          });
        }
        recordCanvasHistory(
          zone.title,
          card.title,
          `Loaded "${card.rawClaim.foundReportTitle}" into QR/OTP Return Terminal.`,
          'success'
        );
      }

      // ZONE 7: ARCHIVE OR DELETE
      else if (zoneId === 'ZONE_7_ARCHIVE') {
        if (card.rawReport) {
          await onArchiveReport(card.rawReport.id);
          setFeedbackBanner({
            type: 'success',
            title: 'ZONE 7 — Report Card Archived (Reversible)',
            detail: `"${card.rawReport.title}" was moved to the Archive tab. You can undo this action anytime from the Activity Bar or Archive tab.`,
          });
          recordCanvasHistory(
            zone.title,
            card.title,
            `Archived report "${card.rawReport.title}". Click Undo to restore.`,
            'success',
            { undoReportId: card.rawReport.id }
          );
        } else {
          setFeedbackBanner({
            type: 'success',
            title: 'Alert Card Archived',
            detail: `Dismissed notification card "${card.title}".`,
          });
          recordCanvasHistory(zone.title, card.title, 'Archived notification card.', 'success');
        }
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        title: 'Canvas Operation Failed',
        detail: err?.message || 'Unable to complete action.',
      });
    } finally {
      setBusyAction(false);
      setDraggedCard(null);
      setHoveredZone(null);
      setKeyboardGrabbedCard(null);
      setMobileSheetCard(null);
    }
  };

  // Listen for external Map-to-Canvas triggers
  useEffect(() => {
    if (!externalTrigger) return;
    const card = allCards.find((c) => c.id === externalTrigger.report.id);
    if (card) {
      executeCanvasAction(card, externalTrigger.zoneId);
    }
  }, [externalTrigger]);

  // Handle Photo Upload & Gemini Vision Auto-Analysis in Draft Builder
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzePhotoWithGemini = async () => {
    if (!draftImagePreview) return;
    setAnalyzingPhoto(true);
    try {
      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: draftImagePreview }),
      });
      const data = await res.json();
      if (res.ok && data.suggestion) {
        const s = data.suggestion;
        if (s.title) setDraftTitle(s.title);
        if (s.category && CATEGORIES.includes(s.category)) setDraftCategory(s.category);
        if (s.brand) setDraftBrand(s.brand);
        if (s.color) setDraftColor(s.color);
        if (s.material) setDraftMaterial(s.material);
        if (s.distinguishingFeatures) setDraftFeatures(s.distinguishingFeatures);
        setFeedbackBanner({
          type: 'success',
          title: 'Gemini Vision Photo Analysis Complete',
          detail: `Auto-populated item fields from uploaded photo ("${s.title}"). Review and drag your card to commit.`,
        });
      } else {
        setFeedbackBanner({
          type: 'info',
          title: 'Photo Attached to Draft Card',
          detail: data.error || 'Photo ready for report submission.',
        });
      }
    } catch {
      // handled gracefully
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  // Run Server-Side Gemini Match Comparison Insight
  const handleRequestAiMatchInsight = async (matchId: string) => {
    setAiInsightLoading(true);
    try {
      const res = await fetch('/api/ai/compare-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json();
      if (res.ok && data.aiInsight && activeMatchForReview?.id === matchId) {
        setActiveMatchForReview({ ...activeMatchForReview, aiInsight: data.aiInsight });
      }
    } finally {
      setAiInsightLoading(false);
    }
  };

  // Undo handler for reversible actions (Archive / Match status)
  const handleUndoHistory = async (entry: CanvasHistoryEntry) => {
    setBusyAction(true);
    try {
      if (entry.undoReportId) {
        await onRestoreReport(entry.undoReportId);
        setFeedbackBanner({
          type: 'success',
          title: 'Undo Complete — Report Restored to Active Canvas',
          detail: `Restored "${entry.cardTitle}" and recomputed active matches.`,
        });
      } else if (entry.undoMatchId && entry.previousMatchStatus) {
        await onUpdateMatchStatus(entry.undoMatchId, entry.previousMatchStatus);
        setFeedbackBanner({
          type: 'success',
          title: 'Undo Complete — Match Status Reverted',
          detail: `Reverted "${entry.cardTitle}" to ${entry.previousMatchStatus}.`,
        });
      }
      setHistory((prev) => prev.filter((h) => h.id !== entry.id));
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        title: 'Undo Failed',
        detail: err?.message || 'Could not undo operation.',
      });
    } finally {
      setBusyAction(false);
    }
  };

  // Commit Draft Report via Drag-Drop (inside Draft Builder)
  const handleCommitDraftReport = async () => {
    if (!draftTitle.trim() || !draftColor.trim() || !draftBuilding.trim()) {
      setFeedbackBanner({
        type: 'error',
        title: 'Missing Required Fields in Draft Card',
        detail: 'Please fill in the Item Name, Primary Color, and Campus Building before dropping to commit.',
      });
      return;
    }
    setBusyAction(true);
    try {
      const result = await onCreateReport({
        type: draftType,
        priority: draftPriority,
        title: draftTitle,
        category: draftCategory,
        brand: draftBrand,
        model: draftModel,
        color: draftColor,
        material: draftMaterial,
        distinguishingFeatures: draftFeatures,
        description: draftDescription,
        secretCharacteristic: draftType === 'found' ? draftSecretAnswer : undefined,
        secretPromptQuestion: draftType === 'found' ? draftSecretQuestion : undefined,
        campusZone: draftZone,
        buildingName: draftBuilding,
        floorOrArea: draftFloor,
        lat: draftLat,
        lng: draftLng,
        incidentDate: draftDate,
        incidentTimeWindow: draftTimeWindow,
        designatedCustodyDeskId: draftType === 'found' ? draftCustodyDeskId : undefined,
        images: draftImagePreview
          ? [{ id: `img-${Date.now()}`, url: draftImagePreview, caption: draftTitle }]
          : undefined,
      });

      setFeedbackBanner({
        type: 'success',
        title: `${draftType === 'lost' ? 'Lost' : 'Found'} Item Card Created & Matched!`,
        detail: `Saved "${draftTitle}" to database (${result.matchesFoundCount || 0} automatic candidate matches discovered).`,
      });
      recordCanvasHistory(
        draftType === 'lost' ? 'REPORT LOST' : 'REPORT FOUND',
        draftTitle,
        `Created ${draftType} report card and discovered ${result.matchesFoundCount || 0} candidate match(es).`,
        'success'
      );

      if (result.report) {
        const matchRes = await onAnalyzeMatchesForReport(result.report.id);
        setAnalyzedReport(matchRes.report);
        setAnalyzedMatches(matchRes.matches);
        if (matchRes.matches[0]) setActiveMatchForReview(matchRes.matches[0]);
        setWorkspaceMode('match_analyzer');
      } else {
        setWorkspaceMode('board');
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        title: 'Report Submission Blocked',
        detail: err?.message || 'Failed to save report.',
      });
    } finally {
      setBusyAction(false);
      setCommitZoneHover(false);
    }
  };

  // Submit Claim via Drag-Drop (inside Claim Workspace)
  const handleCommitOwnershipClaim = async () => {
    if (!claimTargetFoundReport) return;
    if (!claimSecretInput.trim() || claimSecretInput.trim().length < 4) {
      setFeedbackBanner({
        type: 'error',
        title: 'Verification Evidence Required',
        detail: 'Please enter the distinguishing ownership answer (min 4 characters) before dropping your Claim Card.',
      });
      return;
    }
    setBusyAction(true);
    try {
      await onSubmitClaim({
        matchId: claimTargetMatch?.id,
        lostReportId: claimTargetMatch?.lostReportId,
        foundReportId: claimTargetFoundReport.id,
        secretCharacteristicAnswer: claimSecretInput,
        additionalOwnershipProof: claimProofInput,
        custodyDeskId: claimCustodyDeskId,
        pickupWindow: claimPickupWindow,
      });
      setClaimSecretInput('');
      setClaimProofInput('');
      setFeedbackBanner({
        type: 'success',
        title: 'Ownership Claim Card Submitted for Authorized Review',
        detail: `Your claim for "${claimTargetFoundReport.title}" is now Under Review. Switch to Finder or Custody Desk Staff to approve and generate the QR/OTP pass.`,
      });
      recordCanvasHistory(
        'START CLAIM',
        claimTargetFoundReport.title,
        'Submitted ownership claim evidence via Canvas Claim Drop Zone.',
        'success'
      );
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        title: 'Claim Submission Failed',
        detail: err?.message || 'Unable to submit ownership claim.',
      });
    } finally {
      setBusyAction(false);
    }
  };

  // Review Claim via Drag-Drop (Approve / Reject Drop Zones)
  const handleDecisionDropOnClaim = async (
    claim: OwnershipClaim,
    decision: 'approved' | 'rejected'
  ) => {
    setBusyAction(true);
    try {
      await onReviewClaim(
        claim.id,
        decision,
        claimReviewerNotes ||
          (decision === 'approved'
            ? 'Verified secret ownership evidence via Canvas Claim Review.'
            : 'Ownership evidence did not match hidden item attributes.')
      );
      setFeedbackBanner({
        type: decision === 'approved' ? 'success' : 'info',
        title:
          decision === 'approved'
            ? 'Claim Approved — Short-Lived QR & 6-Digit OTP Generated!'
            : 'Claim Rejected',
        detail:
          decision === 'approved'
            ? `Issued 30-minute handover token for "${claim.foundReportTitle}". Drag the Return Card into ZONE 6: COMPLETE RETURN to validate pickup.`
            : `Marked claim ${claim.id} as rejected.`,
      });
      recordCanvasHistory(
        'CLAIM REVIEW',
        claim.foundReportTitle,
        `${decision === 'approved' ? 'Approved' : 'Rejected'} ownership claim ${claim.id}.`,
        'success'
      );
      if (decision === 'approved') {
        setWorkspaceMode('return_terminal');
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        title: 'Claim Review Blocked',
        detail: err?.message || 'Not authorized to review this claim.',
      });
    } finally {
      setBusyAction(false);
    }
  };

  // Complete Handover Return via Drag-Drop (inside Return Terminal)
  const handleCompleteReturnDrop = async (claim: OwnershipClaim) => {
    const code = handoverOtpInput.trim() || claim.handoverOtp || claim.handoverToken || '';
    if (!code) {
      setFeedbackBanner({
        type: 'error',
        title: 'Missing Handover Token / OTP',
        detail: 'Enter or load a valid 6-digit OTP or QR token before completing the handover.',
      });
      return;
    }
    setBusyAction(true);
    try {
      const msg = await onValidateHandover(
        code,
        handoverDeskId || claim.custodyDeskId,
        handoverStaffNotes || 'Validated via Canvas Zone 6 Return Terminal'
      );
      setFeedbackBanner({
        type: 'success',
        title: 'Atomic Custody Handover Completed & Audited!',
        detail: msg,
      });
      recordCanvasHistory(
        'COMPLETE RETURN',
        claim.foundReportTitle,
        `Completed QR/OTP handover at desk ${handoverDeskId} and logged permanent audit record.`,
        'success'
      );
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        title: 'Handover Validation Rejected',
        detail: err?.message || 'Only Custody Desk Staff or Admins can validate handover tokens.',
      });
    } finally {
      setBusyAction(false);
    }
  };

  // Return indices of all valid Action Zones for a given card
  const getValidZoneIndices = (card: CanvasDraggableCard): number[] => {
    const indices: number[] = [];
    ACTION_ZONES.forEach((zone, index) => {
      if (validateDrop(card, zone).valid) {
        indices.push(index);
      }
    });
    return indices.length > 0 ? indices : [0];
  };

  // Keyboard Accessibility Handler for Cards (WCAG 2.2 Dragging Alternative — SC 2.1.1 & SC 2.5.7)
  // Allows users to select/grab a card with Enter or Space, navigate/cycle through valid Action Zones with Arrow keys (or 1-7 number keys), and press Enter/Space to move the card to the targeted zone.
  const handleCardKeyDown = (
    e: React.KeyboardEvent,
    card: CanvasDraggableCard,
    onDirectCommit?: () => void
  ) => {
    // Do not intercept keyboard events originating from nested buttons or inputs inside a card
    const targetEl = e.target as HTMLElement;
    if (
      targetEl !== e.currentTarget &&
      (targetEl.tagName === 'BUTTON' ||
        targetEl.tagName === 'INPUT' ||
        targetEl.tagName === 'TEXTAREA' ||
        targetEl.tagName === 'SELECT')
    ) {
      return;
    }

    const validIndices = getValidZoneIndices(card);

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (keyboardGrabbedCard?.uid === card.uid) {
        if (onDirectCommit) {
          setKeyboardGrabbedCard(null);
          onDirectCommit();
          return;
        }
        const targetZone = ACTION_ZONES[keyboardTargetZoneIdx] || ACTION_ZONES[validIndices[0]];
        if (targetZone) {
          executeCanvasAction(card, targetZone.id);
        }
      } else {
        setKeyboardGrabbedCard(card);
        setSelectedCard(card);
        setKeyboardTargetZoneIdx(validIndices[0]);
      }
    } else if (e.key === 'Escape' && keyboardGrabbedCard) {
      e.preventDefault();
      e.stopPropagation();
      setKeyboardGrabbedCard(null);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (keyboardGrabbedCard?.uid !== card.uid) {
        setKeyboardGrabbedCard(card);
        setSelectedCard(card);
        setKeyboardTargetZoneIdx(validIndices[0]);
      } else {
        setKeyboardTargetZoneIdx((prev) => {
          const currentPos = validIndices.indexOf(prev);
          const nextPos = currentPos >= 0 ? (currentPos + 1) % validIndices.length : 0;
          return validIndices[nextPos];
        });
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (keyboardGrabbedCard?.uid !== card.uid) {
        setKeyboardGrabbedCard(card);
        setSelectedCard(card);
        setKeyboardTargetZoneIdx(validIndices[validIndices.length - 1]);
      } else {
        setKeyboardTargetZoneIdx((prev) => {
          const currentPos = validIndices.indexOf(prev);
          const prevPos =
            currentPos >= 0
              ? (currentPos - 1 + validIndices.length) % validIndices.length
              : validIndices.length - 1;
          return validIndices[prevPos];
        });
      }
    } else if (keyboardGrabbedCard?.uid === card.uid && e.key === 'Home') {
      e.preventDefault();
      e.stopPropagation();
      setKeyboardTargetZoneIdx(validIndices[0]);
    } else if (keyboardGrabbedCard?.uid === card.uid && e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      setKeyboardTargetZoneIdx(validIndices[validIndices.length - 1]);
    } else if (
      keyboardGrabbedCard?.uid === card.uid &&
      e.key >= '1' &&
      e.key <= '7'
    ) {
      const requestedIdx = parseInt(e.key, 10) - 1;
      if (validIndices.includes(requestedIdx)) {
        e.preventDefault();
        e.stopPropagation();
        setKeyboardTargetZoneIdx(requestedIdx);
      }
    }
  };

  const activeDragCard = draggedCard || keyboardGrabbedCard;

  // Resolve an ItemReport for any selected or targeted canvas card (Lost, Found, Match, Claim, or Return)
  const resolveReportForCard = (card: CanvasDraggableCard | null): ItemReport | null => {
    if (!card) return null;
    if (card.rawReport) return card.rawReport;
    if (card.rawMatch) {
      return (
        card.rawMatch.foundReport ||
        card.rawMatch.lostReport ||
        reports.find(
          (r) => r.id === card.rawMatch?.foundReportId || r.id === card.rawMatch?.lostReportId
        ) ||
        null
      );
    }
    if (card.rawClaim) {
      return (
        reports.find(
          (r) => r.id === card.rawClaim?.foundReportId || r.id === card.rawClaim?.lostReportId
        ) || null
      );
    }
    return null;
  };

  const activeInspectReport = useMemo<ItemReport | null>(() => {
    return (
      inspectOverrideReport ||
      resolveReportForCard(selectedCard) ||
      claimTargetFoundReport ||
      activeMatchForReview?.foundReport ||
      activeMatchForReview?.lostReport ||
      (activeClaimForReview
        ? reports.find((r) => r.id === activeClaimForReview.foundReportId) || null
        : null) ||
      (activeReturnClaim
        ? reports.find((r) => r.id === activeReturnClaim.foundReportId) || null
        : null) ||
      reports[0] ||
      null
    );
  }, [
    inspectOverrideReport,
    selectedCard,
    claimTargetFoundReport,
    activeMatchForReview,
    activeClaimForReview,
    activeReturnClaim,
    reports,
  ]);

  const openCanvas3DInspect = (rep: ItemReport) => {
    setInspectOverrideReport(rep);
    const matchingCard = allCards.find((c) => c.id === rep.id);
    if (matchingCard) setSelectedCard(matchingCard);
    setWorkspaceMode('inspect_3d');
  };

  const currentWorkflowLabel = useMemo(() => {
    switch (workspaceMode) {
      case 'draft_builder':
        return 'Workflow 1 · Report an Item';
      case 'match_analyzer':
        return 'Workflow 2 · Find & Review a Match';
      case 'claim_workspace':
        return 'Workflow 3 · Review a Claim';
      case 'profile_trust':
        return 'Workflow 4 · Verify Identity';
      case 'return_terminal':
        return 'Workflow 5 · Complete a Handover';
      case 'map_workspace':
        return 'Geospatial Campus Map';
      case 'inspect_3d':
        return '3D Model Inspect View · Pre-Claim & Handover Verification';
      default:
        return 'Canvas Overview Board';
    }
  }, [workspaceMode]);

  // Compute custom weighted score when user adjusts the transparent weight sliders
  const computeCustomWeightedScore = (m: PotentialMatch) => {
    const totalWeight =
      weights.category +
      weights.appearance +
      weights.location +
      weights.timeline +
      weights.description || 100;
    const rawWeighted =
      (m.breakdown.categoryScore / 25) * weights.category +
      (m.breakdown.appearanceScore / 20) * weights.appearance +
      (m.breakdown.locationScore / 20) * weights.location +
      (m.breakdown.timelineScore / 15) * weights.timeline +
      (m.breakdown.descriptionScore / 20) * weights.description;
    return Math.min(99, Math.round((rawWeighted / totalWeight) * 100));
  };

  return (
    <div className="space-y-4">
      {/* Screen-reader live region for WCAG 2.2 drag-and-drop and drop action success/failure */}
      <div role="status" className="sr-only" aria-live="polite" aria-atomic="true">
        {feedbackBanner
          ? `${
              feedbackBanner.type === 'error'
                ? 'Drop action failed'
                : feedbackBanner.type === 'success'
                ? 'Drop action succeeded'
                : 'Canvas status update'
            }: ${feedbackBanner.title}. ${feedbackBanner.detail}`
          : keyboardGrabbedCard
          ? `Card "${keyboardGrabbedCard.title}" picked up. Currently targeting ${ACTION_ZONES[keyboardTargetZoneIdx].zoneNumber}: ${ACTION_ZONES[keyboardTargetZoneIdx].title}. Use Left and Right arrow keys to switch action zones, press Enter or Space to drop, or Escape to cancel.`
          : draggedCard
          ? `Dragging card "${draggedCard.title}". ${
              hoveredZone
                ? `Currently over ${hoveredZone.replace(/ZONE_\d+_/, '').replace(/_/g, ' ')}.`
                : 'Valid drop zones are highlighted.'
            }`
          : ''}
      </div>

      {/* A. CLEAN CANVAS HEADER & B. 5-WORKFLOW NAVIGATION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/Screenshot_2026-10-24_211219_4f02c02f.png"
              alt="Findora App Icon"
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  INTERACTIVE CANVAS
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                  {currentWorkflowLabel}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Drag item cards into highlighted action zones or use keyboard Enter/Space + Arrow keys
              </h1>
            </div>
          </div>

          {/* Contextual Controls: Help, Sandbox, and Reset Canvas */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowOnboardingGuide(!showOnboardingGuide)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showOnboardingGuide ? 'Hide Guide' : 'How Canvas Works'}
            </button>
            <button
              type="button"
              onClick={() => setTutorialSandboxActive(!tutorialSandboxActive)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                tutorialSandboxActive
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {tutorialSandboxActive ? 'Sandbox Cards: ON' : 'Practice Sandbox'}
            </button>
            <button
              type="button"
              onClick={handleResetCanvas}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Clear selected card and return to the Canvas Overview Board"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Canvas
            </button>
          </div>
        </div>

        {/* B. 5-Workflow Navigation Bar */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'board', label: 'Overview Board' },
                { id: 'inspect_3d', label: '3D Inspect View' },
                { id: 'draft_builder', label: '1. Report an Item' },
                { id: 'match_analyzer', label: '2. Find a Match' },
                { id: 'claim_workspace', label: '3. Review a Claim' },
                { id: 'profile_trust', label: '4. Verify Identity' },
                { id: 'return_terminal', label: '5. Complete a Handover' },
                { id: 'map_workspace', label: 'Campus Map' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setWorkspaceMode(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  workspaceMode === m.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Keyboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Keyboard: Focus card → Enter/Space → Arrow keys → Enter</span>
          </div>
        </div>
      </div>

      {/* 5-STEP CANVAS PROTOCOL ONBOARDING GUIDE OVERLAY */}
      {showOnboardingGuide && (
        <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                FIRST-TIME USER ONBOARDING · THE CANVAS PROTOCOL
              </div>
              <h3 className="text-base font-bold mt-0.5">
                How to Perform Any Recovery Operation in 5 Steps
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowOnboardingGuide(false)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold"
            >
              Got It
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            {[
              {
                step: '01',
                title: 'Select or Pick Up a Card',
                desc: 'Grab any Lost, Found, Draft, Match, or Claim card from the Left Data Library (or press Enter for keyboard pick-up).',
              },
              {
                step: '02',
                title: 'Drag into a Highlighted Zone',
                desc: 'Compatible Action Zones in the bottom dock glow green and explain why the drop is permitted.',
              },
              {
                step: '03',
                title: 'Review the Information',
                desc: 'The Center Active Canvas opens side-by-side match explanations, map pins, or claim evidence.',
              },
              {
                step: '04',
                title: 'Complete Required Details',
                desc: 'Fill in any required fields such as incident location, photos, or secret ownership answers.',
              },
              {
                step: '05',
                title: 'Confirm via Card Drop',
                desc: 'Drag the prepared card into the Commit / Submit / Validate drop zone to execute on the server.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1"
              >
                <div className="font-mono font-bold text-indigo-400">{item.step}</div>
                <div className="font-bold text-white">{item.title}</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persistent ARIA Live Wrapper for Status Messages & Drop Action Feedback Containers */}
      <div aria-live="polite" aria-atomic="true" className="space-y-3">
        {/* Live Mouse Drag Visual Feedback Banner */}
        {draggedCard && !keyboardGrabbedCard && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="p-3 bg-emerald-950 text-emerald-100 border-2 border-emerald-500 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold uppercase tracking-wider text-[10px]">
                Dragging Card
              </span>
              <strong className="text-white">&ldquo;{draggedCard.title}&rdquo;</strong>
              <span className="text-emerald-300">· Valid Drop Zones Highlighted:</span>
              <div className="flex flex-wrap items-center gap-1">
                {ACTION_ZONES.filter((z) => validateDrop(draggedCard, z).valid).map((z) => (
                  <span
                    key={z.id}
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-colors ${
                      hoveredZone === z.id
                        ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                        : 'bg-emerald-800/90 text-emerald-100 border border-emerald-500/60'
                    }`}
                  >
                    {z.zoneNumber}: {z.title}
                  </span>
                ))}
              </div>
            </div>
            <span className="text-[11px] font-mono text-blue-300">
              {hoveredZone
                ? `Hovering ${hoveredZone.replace(/ZONE_\d+_/, '').replace(/_/g, ' ')} (Blue Border)`
                : 'Drag over any highlighted zone to turn border Blue & drop'}
            </span>
          </div>
        )}

        {/* Keyboard Grabbed Assist Banner */}
        {keyboardGrabbedCard && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="p-3 bg-indigo-950 text-indigo-100 border border-indigo-700 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>Keyboard Card Picked Up:</strong> &ldquo;{keyboardGrabbedCard.title}&rdquo; ·
                Target Zone:{' '}
                <strong className="underline text-white">
                  {ACTION_ZONES[keyboardTargetZoneIdx].zoneNumber}:{' '}
                  {ACTION_ZONES[keyboardTargetZoneIdx].title}
                </strong>{' '}
                (Use Left/Right arrows to change zone, press Enter to Drop, or Esc to cancel)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  executeCanvasAction(
                    keyboardGrabbedCard,
                    ACTION_ZONES[keyboardTargetZoneIdx].id
                  )
                }
                className="px-3 py-1 bg-indigo-600 text-white font-semibold rounded-lg"
              >
                Drop into {ACTION_ZONES[keyboardTargetZoneIdx].zoneNumber}
              </button>
              <button
                type="button"
                onClick={() => setKeyboardGrabbedCard(null)}
                className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Operation Feedback Banner (Announces Drop Action Success or Failure) */}
        {feedbackBanner && (
          <div
            role={feedbackBanner.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            aria-atomic="true"
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : feedbackBanner.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedbackBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : feedbackBanner.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">{feedbackBanner.title}</div>
                <div className="mt-0.5 opacity-90">{feedbackBanner.detail}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-xs font-semibold underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* MAIN 3-COLUMN CANVAS GRID: Left Card Library (3 cols) + Center Active Workspace (6 cols) + Right Inspector (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: DRAGGABLE DATA CARD LIBRARY */}
        <section
          aria-label="Data Card Library"
          className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                A. DATA LIBRARY · DRAGGABLE CARDS
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Typed Item &amp; Workflow Cards ({filteredCards.length})
              </h2>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-500">
              Drag → Dock
            </span>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              placeholder="Filter cards by title, color, zone..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'drafts', label: 'Drafts' },
                { id: 'lost', label: 'Lost' },
                { id: 'found', label: 'Found' },
                { id: 'matches', label: 'Matches' },
                { id: 'claims_returns', label: 'Claims/QR' },
                { id: 'archived', label: 'Archive' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLibraryTab(tab.id)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                  libraryTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Draggable Card Stack */}
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {filteredCards.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No cards in this filter. Try switching tabs or clearing your search.
              </div>
            ) : (
              filteredCards.map((card) => {
                const isSelected = selectedCard?.uid === card.uid;
                const isDragging = activeDragCard?.uid === card.uid;
                const borderAccent = card.isTutorialSandbox
                  ? 'border-l-4 border-l-cyan-500'
                  : card.cardType === 'lost_item'
                  ? 'border-l-4 border-l-rose-500'
                  : card.cardType === 'found_item'
                  ? 'border-l-4 border-l-emerald-500'
                  : card.cardType === 'potential_match'
                  ? 'border-l-4 border-l-violet-500'
                  : card.cardType === 'return_card'
                  ? 'border-l-4 border-l-teal-500'
                  : card.cardType === 'claim_card'
                  ? 'border-l-4 border-l-amber-500'
                  : card.cardType === 'draft_report'
                  ? 'border-l-4 border-l-indigo-500'
                  : 'border-l-4 border-l-slate-400';

                return (
                  <div
                    key={card.uid}
                    draggable
                    tabIndex={0}
                    role="button"
                    aria-pressed={keyboardGrabbedCard?.uid === card.uid}
                    aria-roledescription="Draggable item card"
                    aria-label={`${card.badgeText}: ${card.title}. Press Enter or Space to select card, use Arrow keys to cycle valid Action Zones, and press Enter or Space to move card.`}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', card.uid);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedCard(card);
                      setSelectedCard(card);
                    }}
                    onDragEnd={() => {
                      setDraggedCard(null);
                      setHoveredZone(null);
                      setInnerDropHoverId(null);
                      setCommitZoneHover(false);
                    }}
                    onClick={() => setSelectedCard(card)}
                    onKeyDown={(e) => handleCardKeyDown(e, card)}
                    className={`group p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${borderAccent} ${
                      isDragging
                        ? 'opacity-90 scale-[0.99] ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/75 dark:bg-indigo-950/60'
                        : isSelected
                        ? 'bg-slate-100/90 dark:bg-slate-800/90 border-indigo-500 dark:border-indigo-400 shadow-xs'
                        : 'bg-slate-50/80 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-indigo-500" />
                        <span>{card.badgeText}</span>
                      </div>
                      <span className="text-[10px] font-mono tabular-nums font-semibold text-slate-500 dark:text-slate-400">
                        {keyboardGrabbedCard?.uid === card.uid ? 'KEYBOARD SELECTED' : card.statusLabel}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-start gap-2.5">
                      {card.imageUrl && (
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {card.title}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {card.subtitle}
                        </div>
                        {card.distinguishingSnippet && (
                          <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {card.distinguishingSnippet}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline WCAG 2.2 Keyboard Valid Action Zone Selector when card is selected via Enter/Space */}
                    {keyboardGrabbedCard?.uid === card.uid && (
                      <div
                        role="listbox"
                        aria-label={`Valid destination Action Zones for ${card.title}`}
                        className="mt-2 p-2 rounded-lg bg-blue-950 text-blue-100 border border-blue-500 space-y-1.5 text-[10px]"
                      >
                        <div className="flex items-center justify-between font-semibold text-blue-300">
                          <span className="flex items-center gap-1">
                            <Keyboard className="w-3 h-3" />
                            Arrow Keys Cycle Valid Zones:
                          </span>
                          <span>Enter/Space = Move · Esc = Cancel</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {getValidZoneIndices(card).map((zIdx) => {
                            const z = ACTION_ZONES[zIdx];
                            const isTarget = keyboardTargetZoneIdx === zIdx;
                            return (
                              <button
                                key={z.id}
                                type="button"
                                role="option"
                                aria-selected={isTarget}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setKeyboardTargetZoneIdx(zIdx);
                                  executeCanvasAction(card, z.id);
                                }}
                                className={`px-1.5 py-0.5 rounded font-mono font-bold transition-colors ${
                                  isTarget
                                    ? 'bg-blue-500 text-white ring-1 ring-white'
                                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {z.zoneNumber}: {z.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Match Strength or Potential Match Count Row */}
                    {(typeof card.matchCount === 'number' || card.matchStrengthLabel) && (
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono tabular-nums text-blue-600 dark:text-blue-400">
                        {typeof card.matchCount === 'number' && (
                          <span>
                            {card.matchCount} Potential Match{card.matchCount === 1 ? '' : 'es'}
                          </span>
                        )}
                        {card.matchStrengthLabel && <span>{card.matchStrengthLabel}</span>}
                        {card.timeWindowLabel && (
                          <span className="text-slate-400">{card.timeWindowLabel}</span>
                        )}
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                      <span className="truncate">
                        {card.locationLabel || 'Campus'} · {card.dateLabel}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {card.archived && card.rawReport ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestoreReport(card.rawReport!.id);
                            }}
                            className="px-2 py-0.5 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700"
                          >
                            Restore
                          </button>
                        ) : (
                          <>
                            {resolveReportForCard(card) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rep = resolveReportForCard(card);
                                  setSelectedCard(card);
                                  if (rep) openCanvas3DInspect(rep);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded font-semibold hover:bg-indigo-600 hover:text-white transition-colors"
                                title="Rotate and inspect 3D model in Canvas Inspect View"
                              >
                                <Box className="w-3 h-3" />
                                <span>3D Inspect</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMobileSheetCard(card);
                                setSelectedCard(card);
                              }}
                              className="px-2 py-0.5 bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold hover:bg-blue-600 hover:text-white transition-colors"
                              title="Accessible Single-Pointer / Touch Action Selector"
                            >
                              Select Zone →
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* CENTER COLUMN: ACTIVE WORKSPACE ENGINE */}
        <section
          aria-label="Center Active Canvas Workspace"
          className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 min-h-[600px] flex flex-col justify-between space-y-5"
        >
          {/* MODE 0: OVERVIEW BOARD */}
          {workspaceMode === 'board' && (
            <div className="space-y-5">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    B. ACTIVE CANVAS · WORKFLOW ORCHESTRATION SURFACE
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Drag Any Card into an Action Zone or Use Guided Canvas Workflows
                  </h2>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {reports.filter((r) => !r.archived).length} Active · {matches.length} Matches
                </span>
              </div>

              {/* Guided Interactive Demo Scenarios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    WORKFLOW 1 · REPORT LOST OR FOUND
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Drag a Draft Template Card → ZONE 1 or ZONE 2
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Opens the 4-step Report Builder with photo upload &amp; Gemini Vision analysis. Final creation happens by dropping the Ready-to-Commit Card into the Commit Zone.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const draftLost = allCards.find((c) => c.id === 'draft-lost-blank');
                        if (draftLost) executeCanvasAction(draftLost, 'ZONE_1_REPORT_LOST');
                      }}
                      className="px-2.5 py-1 bg-rose-600 text-white text-[11px] font-semibold rounded-lg"
                    >
                      Drop Lost Draft → Zone 1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const draftFound = allCards.find((c) => c.id === 'draft-found-blank');
                        if (draftFound) executeCanvasAction(draftFound, 'ZONE_2_REPORT_FOUND');
                      }}
                      className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg"
                    >
                      Drop Found Draft → Zone 2
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    WORKFLOW 2 · EXPLAINABLE MATCHING
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Drag a Lost or Found Card → ZONE 3: FIND MATCHES
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Evaluates Category, Appearance, Location Proximity, Timeline, and Distinguishing Details with configurable weights.
                  </p>
                  {reports[0] && (
                    <button
                      type="button"
                      onClick={() => {
                        const repCard = allCards.find((c) => c.id === reports[0].id);
                        if (repCard) executeCanvasAction(repCard, 'ZONE_3_FIND_MATCHES');
                      }}
                      className="mt-1 px-2.5 py-1 bg-blue-600 text-white text-[11px] font-semibold rounded-lg"
                    >
                      Drop &ldquo;{reports[0].title.slice(0, 22)}...&rdquo; → Zone 3
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    WORKFLOW 3 · CLAIM &amp; VERIFY OWNERSHIP
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Drag Match or Found Card → ZONE 4: START CLAIM
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Findora never auto-assigns ownership from similarity scores alone. Submit hidden ownership proof and review claims securely.
                  </p>
                  {matches[0] && (
                    <button
                      type="button"
                      onClick={() => {
                        const mCard = allCards.find((c) => c.id === matches[0].id);
                        if (mCard) executeCanvasAction(mCard, 'ZONE_4_CLAIM_OWNERSHIP');
                      }}
                      className="mt-1 px-2.5 py-1 bg-amber-600 text-white text-[11px] font-semibold rounded-lg"
                    >
                      Drop {matches[0].totalScore}% Match Card → Zone 4
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-teal-600 dark:text-teal-400">
                    WORKFLOW 4 · QR &amp; OTP CUSTODY HANDOVER
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Drag Return Card → ZONE 6: COMPLETE RETURN
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Generates a short-lived 30-min QR code &amp; 6-digit OTP token. Custody Desk Staff validate it atomically to mark the item Returned.
                  </p>
                  {claims[0] && (
                    <button
                      type="button"
                      onClick={() => {
                        const cCard = allCards.find((c) => c.id === claims[0].id);
                        if (cCard) executeCanvasAction(cCard, 'ZONE_6_COMPLETE_RETURN');
                      }}
                      className="mt-1 px-2.5 py-1 bg-teal-600 text-white text-[11px] font-semibold rounded-lg"
                    >
                      Drop Return Pass → Zone 6
                    </button>
                  )}
                </div>
              </div>

              {/* Center Canvas Smart Drop Surface */}
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (innerDropHoverId !== 'smart-surface') setInnerDropHoverId('smart-surface');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (innerDropHoverId !== 'smart-surface') setInnerDropHoverId('smart-surface');
                }}
                onDragLeave={(e) => {
                  if (
                    !e.currentTarget.contains(e.relatedTarget as Node) &&
                    innerDropHoverId === 'smart-surface'
                  ) {
                    setInnerDropHoverId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setInnerDropHoverId(null);
                  if (!draggedCard) return;
                  if (draggedCard.cardType === 'draft_report') {
                    executeCanvasAction(
                      draggedCard,
                      draggedCard.draftPreset?.type === 'found'
                        ? 'ZONE_2_REPORT_FOUND'
                        : 'ZONE_1_REPORT_LOST'
                    );
                  } else if (
                    draggedCard.cardType === 'lost_item' ||
                    draggedCard.cardType === 'found_item'
                  ) {
                    executeCanvasAction(draggedCard, 'ZONE_3_FIND_MATCHES');
                  } else if (draggedCard.cardType === 'potential_match') {
                    executeCanvasAction(draggedCard, 'ZONE_5_CONFIRM_MATCH');
                  } else if (
                    draggedCard.cardType === 'claim_card' ||
                    draggedCard.cardType === 'verification_card'
                  ) {
                    executeCanvasAction(draggedCard, 'ZONE_4_CLAIM_OWNERSHIP');
                  } else if (draggedCard.cardType === 'return_card') {
                    executeCanvasAction(draggedCard, 'ZONE_6_COMPLETE_RETURN');
                  }
                }}
                className={`p-6 rounded-2xl border-2 transition-all text-center space-y-2 ${
                  innerDropHoverId === 'smart-surface'
                    ? 'border-solid border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/35 bg-blue-50/90 dark:bg-blue-950/75 scale-[1.01] shadow-md'
                    : activeDragCard
                    ? 'border-dashed border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/35 bg-emerald-50/75 dark:bg-emerald-950/45 scale-[1.01] shadow-xs'
                    : 'border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Layers
                    className={`w-6 h-6 ${
                      innerDropHoverId === 'smart-surface'
                        ? 'text-blue-600 dark:text-blue-400'
                        : activeDragCard
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-blue-600'
                    }`}
                  />
                  {innerDropHoverId === 'smart-surface' ? (
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                      DROP HERE · BLUE BORDER ACTIVE
                    </span>
                  ) : activeDragCard ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                      VALID DROP ZONE · AUTO-ROUTING READY
                    </span>
                  ) : null}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {innerDropHoverId === 'smart-surface' && activeDragCard
                    ? `Release "${activeDragCard.title}" Now to Open Its Primary Workflow`
                    : activeDragCard
                    ? `Drop "${activeDragCard.title}" Here for Smart Auto-Routing — or Drop into Any Highlighted Action Zone Below`
                    : 'Living Canvas Drop Surface'}
                </div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Dropping any card here automatically opens its primary workflow (Draft Builder, Match Lab, Claim Studio, or QR/OTP Handover Terminal).
                </p>
              </div>
            </div>
          )}

          {/* MODE 1: 4-STEP DRAFT REPORT BUILDER WITH PHOTO & GEMINI VISION (ZONE 1 & ZONE 2) */}
          {workspaceMode === 'draft_builder' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <div
                    className={`text-xs font-bold uppercase ${
                      draftType === 'lost' ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {draftType === 'lost'
                      ? 'ZONE 1 · LOST ITEM REPORT WORKSPACE'
                      : 'ZONE 2 · FOUND ITEM REPORT WORKSPACE'}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Step {draftStep} of 4 — Configure Report &amp; Drag Card to Commit
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  {([1, 2, 3, 4] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDraftStep(s)}
                      className={`px-2.5 py-1 rounded text-xs font-mono tabular-nums font-bold ${
                        draftStep === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {user.tier < 2 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                  <span>
                    Tier 2 Phone Verification is required to commit a new Lost or Found report.
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigateView('verification')}
                    className="px-2.5 py-1 bg-amber-600 text-white font-semibold rounded-lg shrink-0"
                  >
                    Verify Phone →
                  </button>
                </div>
              )}

              {/* Step 1: Item Identity & Appearance */}
              {draftStep === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1">Item Title *</label>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="e.g., Space Gray MacBook Pro 14-inch"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Category *</label>
                    <select
                      value={draftCategory}
                      onChange={(e) => setDraftCategory(e.target.value as ItemCategory)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Primary Color *</label>
                    <input
                      type="text"
                      value={draftColor}
                      onChange={(e) => setDraftColor(e.target.value)}
                      placeholder="e.g., Space Gray, Matte Black, Navy"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Brand</label>
                    <input
                      type="text"
                      value={draftBrand}
                      onChange={(e) => setDraftBrand(e.target.value)}
                      placeholder="e.g., Apple, Sony, Fossil"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Urgency / Priority</label>
                    <select
                      value={draftPriority}
                      onChange={(e) => setDraftPriority(e.target.value as PriorityLevel)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                      <option value="high">High Priority (ID / Essential Tech)</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2: Campus Location & Time */}
              {draftStep === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Campus Building *</label>
                    <input
                      type="text"
                      value={draftBuilding}
                      onChange={(e) => setDraftBuilding(e.target.value)}
                      placeholder="e.g., Central Academic Library"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Campus Sector / Zone</label>
                    <input
                      type="text"
                      value={draftZone}
                      onChange={(e) => setDraftZone(e.target.value)}
                      placeholder="e.g., Academic Quadrangle"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Incident Date</label>
                    <input
                      type="date"
                      value={draftDate}
                      onChange={(e) => setDraftDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Time Window</label>
                    <input
                      type="text"
                      value={draftTimeWindow}
                      onChange={(e) => setDraftTimeWindow(e.target.value)}
                      placeholder="14:00 – 16:30"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      Coordinates: {draftLat.toFixed(4)}, {draftLng.toFixed(4)} (Approximate Campus Pin)
                    </span>
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('map_workspace')}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Pick on Campus Map →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Photo Upload, Gemini Vision Analysis & Hidden Ownership Clue */}
              {draftStep === 3 && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Camera className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Item Photograph &amp; AI Vision Auto-Fill
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Upload a photo to preview and optionally auto-extract item traits.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold cursor-pointer hover:bg-slate-100">
                        Choose Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {draftImagePreview && (
                        <button
                          type="button"
                          disabled={analyzingPhoto}
                          onClick={handleAnalyzePhotoWithGemini}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {analyzingPhoto ? 'Analyzing...' : 'Auto-Fill via AI Vision'}
                        </button>
                      )}
                    </div>
                  </div>

                  {draftImagePreview && (
                    <img
                      src={draftImagePreview}
                      alt="Draft preview"
                      className="h-24 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                    />
                  )}

                  <div>
                    <label className="block font-semibold mb-1">
                      Public Distinguishing Features
                    </label>
                    <textarea
                      rows={2}
                      value={draftFeatures}
                      onChange={(e) => setDraftFeatures(e.target.value)}
                      placeholder="Describe visible marks, case style, or exterior details..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>

                  {draftType === 'found' && (
                    <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                      <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Private Ownership Verification Clue (Never Shown Publicly)
                      </div>
                      <input
                        type="text"
                        value={draftSecretQuestion}
                        onChange={(e) => setDraftSecretQuestion(e.target.value)}
                        placeholder="Challenge question for claimant..."
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-lg"
                      />
                      <input
                        type="text"
                        value={draftSecretAnswer}
                        onChange={(e) => setDraftSecretAnswer(e.target.value)}
                        placeholder="Expected hidden detail (e.g., Robotics sticker / initials inside flap)"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review & Drag-to-Commit Protocol */}
              {draftStep === 4 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Summary: {draftTitle || 'Untitled Item'} ({draftCategory})
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    Color: {draftColor || 'Not set'} · Location: {draftBuilding} ({draftZone}) · Date:{' '}
                    {draftDate}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={draftStep === 1}
                  onClick={() => setDraftStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40"
                >
                  ← Previous Step
                </button>
                {draftStep < 4 && (
                  <button
                    type="button"
                    onClick={() => setDraftStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s))}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg"
                  >
                    Next Step →
                  </button>
                )}
              </div>

              {/* DRAG-TO-COMMIT PROTOCOL: Draggable Completed Draft Card + Commit Drop Target */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                <div
                  draggable
                  tabIndex={0}
                  role="button"
                  aria-roledescription="Draggable item card"
                  aria-label={`Ready-to-commit ${draftType} card. Press Enter or Space to select card, use Arrow keys to navigate Action Zones, and press Enter or Space to commit report.`}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', 'commit-draft-card');
                    e.dataTransfer.effectAllowed = 'move';
                    const draftCard = allCards.find(
                      (c) =>
                        c.id ===
                        (draftType === 'found' ? 'draft-found-blank' : 'draft-lost-blank')
                    );
                    if (draftCard) setDraggedCard(draftCard);
                  }}
                  onDragEnd={() => {
                    setDraggedCard(null);
                    setCommitZoneHover(false);
                  }}
                  onKeyDown={(e) => {
                    const draftCard = allCards.find(
                      (c) =>
                        c.id ===
                        (draftType === 'found' ? 'draft-found-blank' : 'draft-lost-blank')
                    );
                    if (draftCard) {
                      handleCardKeyDown(e, draftCard, handleCommitDraftReport);
                    } else if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCommitDraftReport();
                    }
                  }}
                  className="p-3.5 rounded-xl border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 cursor-grab active:cursor-grabbing flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">
                    <span className="flex items-center gap-1">
                      <GripVertical className="w-3.5 h-3.5" />
                      READY-TO-COMMIT {draftType.toUpperCase()} CARD
                    </span>
                    <span>
                      {keyboardGrabbedCard?.id ===
                      (draftType === 'found' ? 'draft-found-blank' : 'draft-lost-blank')
                        ? 'KEYBOARD SELECTED (ENTER TO COMMIT)'
                        : 'DRAG OR PRESS ENTER →'}
                    </span>
                  </div>
                  <div className="my-1.5">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {draftTitle || 'Enter Item Title Above'}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                      {draftCategory} · {draftColor || 'Color'} · {draftBuilding}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleCommitDraftReport}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg"
                  >
                    {busyAction ? 'Saving Report...' : 'Drop / Commit Report to Database →'}
                  </button>
                </div>

                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setCommitZoneHover(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (!commitZoneHover) setCommitZoneHover(true);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setCommitZoneHover(false);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCommitZoneHover(false);
                    setDraggedCard(null);
                    handleCommitDraftReport();
                  }}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                    commitZoneHover
                      ? 'border-solid border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/40 bg-blue-50/90 dark:bg-blue-950/75 scale-[1.02] shadow-md'
                      : activeDragCard
                      ? 'border-dashed border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/50 scale-[1.01] shadow-xs'
                      : 'border-dashed border-emerald-500/70 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <PackagePlus
                      className={`w-5 h-5 ${
                        commitZoneHover ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600'
                      }`}
                    />
                    {commitZoneHover ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-mono font-bold uppercase">
                        DROP HERE
                      </span>
                    ) : activeDragCard ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-mono font-bold uppercase">
                        VALID DROP ZONE
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    {commitZoneHover
                      ? 'RELEASE TO COMMIT REPORT'
                      : draftType === 'lost'
                      ? 'DROP TO REPORT LOST'
                      : 'DROP TO REPORT FOUND'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Release the Ready-to-Commit Card here to save &amp; trigger matching
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: MULTI-SIGNAL MATCH ANALYZER & CONFIGURABLE WEIGHTS LAB (ZONE 3 & ZONE 5) */}
          {workspaceMode === 'match_analyzer' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-bold uppercase text-violet-600 dark:text-violet-400">
                    ZONE 3 &amp; ZONE 5 · EXPLAINABLE MATCHING &amp; LINKING LAB
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {analyzedReport
                      ? `Candidate Matches for "${analyzedReport.title}"`
                      : 'Side-by-Side Multi-Signal Match Comparison'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWeightTuner(!showWeightTuner)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    {showWeightTuner ? 'Hide Weights' : 'Configure Weights'}
                  </button>
                  <span className="text-xs font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                    {(analyzedMatches.length > 0 ? analyzedMatches : matches).length} Ranked Pair(s)
                  </span>
                </div>
              </div>

              {/* Configurable Scoring Weights Panel */}
              {showWeightTuner && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Transparent Multi-Signal Scoring Model (Configurable Weights)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {(
                      [
                        { key: 'category', label: 'Category' },
                        { key: 'appearance', label: 'Appearance' },
                        { key: 'location', label: 'Location' },
                        { key: 'timeline', label: 'Timeline' },
                        { key: 'description', label: 'Description' },
                      ] as const
                    ).map((w) => (
                      <div key={w.key}>
                        <div className="flex justify-between text-[11px] font-mono tabular-nums">
                          <span>{w.label}</span>
                          <strong>{weights[w.key]}%</strong>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={50}
                          value={weights[w.key]}
                          onChange={(e) =>
                            setWeights((prev) => ({
                              ...prev,
                              [w.key]: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Candidate Match Selector Strip */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(analyzedMatches.length > 0 ? analyzedMatches : matches).map((m) => {
                  const strength = classifyMatchStrength(m.totalScore);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMatchForReview(m)}
                      className={`px-3 py-2 rounded-xl border text-left shrink-0 transition-colors ${
                        activeMatchForReview?.id === m.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold font-mono tabular-nums">
                        {m.totalScore}% · {strength.label}
                      </div>
                      <div className="text-[11px] truncate max-w-[180px] opacity-90">
                        {m.lostReport?.title} ↔ {m.foundReport?.title}
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeMatchForReview ? (
                <div className="space-y-4">
                  {/* Side-by-Side Report Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
                        LOST REPORT · {activeMatchForReview.lostReport?.id}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {activeMatchForReview.lostReport?.title}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        {activeMatchForReview.lostReport?.category} ·{' '}
                        {activeMatchForReview.lostReport?.color} ·{' '}
                        {activeMatchForReview.lostReport?.buildingName}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-2">
                        {activeMatchForReview.lostReport?.distinguishingFeatures}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                        FOUND REPORT · {activeMatchForReview.foundReport?.id}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {activeMatchForReview.foundReport?.title}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        {activeMatchForReview.foundReport?.category} ·{' '}
                        {activeMatchForReview.foundReport?.color} ·{' '}
                        {activeMatchForReview.foundReport?.approximateLocationLabel}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-2">
                        {activeMatchForReview.foundReport?.distinguishingFeatures}
                      </div>
                    </div>
                  </div>

                  {/* 5-Signal Breakdown Bars */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {classifyMatchStrength(activeMatchForReview.totalScore).label} — Similarity Does Not Auto-Establish Ownership
                      </span>
                      <span className="font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                        {computeCustomWeightedScore(activeMatchForReview)}% Weighted Score
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-[10px] font-mono tabular-nums">
                      {[
                        {
                          label: 'Category',
                          val: activeMatchForReview.breakdown.categoryScore,
                          max: 25,
                        },
                        {
                          label: 'Appearance',
                          val: activeMatchForReview.breakdown.appearanceScore,
                          max: 20,
                        },
                        {
                          label: 'Location',
                          val: activeMatchForReview.breakdown.locationScore,
                          max: 20,
                        },
                        {
                          label: 'Timeline',
                          val: activeMatchForReview.breakdown.timelineScore,
                          max: 15,
                        },
                        {
                          label: 'Details',
                          val: activeMatchForReview.breakdown.descriptionScore,
                          max: 20,
                        },
                      ].map((sig) => (
                        <div
                          key={sig.label}
                          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center"
                        >
                          <div className="text-slate-500 font-sans">{sig.label}</div>
                          <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                            {sig.val}/{sig.max}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      {activeMatchForReview.explanations.join(' · ')}
                    </div>

                    {/* Optional Gemini AI Comparison Summary */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      {activeMatchForReview.aiInsight ? (
                        <p className="text-[11px] text-violet-700 dark:text-violet-300">
                          <strong>AI Comparison Insight:</strong> {activeMatchForReview.aiInsight}
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Need a natural-language comparison of public traits?
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={aiInsightLoading}
                        onClick={() => handleRequestAiMatchInsight(activeMatchForReview.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-600 text-white text-[11px] font-semibold rounded-lg shrink-0"
                      >
                        <Sparkles className="w-3 h-3" />
                        {aiInsightLoading ? 'Comparing...' : 'Explain Match with AI'}
                      </button>
                    </div>
                  </div>

                  {/* Draggable Active Match Card for Dropping into Zone 5 (Confirm) or Zone 4 (Claim) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      draggable
                      tabIndex={0}
                      role="button"
                      aria-pressed={keyboardGrabbedCard?.id === activeMatchForReview.id}
                      aria-roledescription="Draggable item card"
                      aria-label={`Draggable Match Card (${activeMatchForReview.totalScore}%). Press Enter or Space to select and use Arrow keys to cycle valid Action Zones.`}
                      onDragStart={(e) => {
                        const matchCard = allCards.find((c) => c.id === activeMatchForReview.id);
                        if (matchCard) {
                          e.dataTransfer.setData('text/plain', matchCard.uid);
                          setDraggedCard(matchCard);
                        }
                      }}
                      onDragEnd={() => setDraggedCard(null)}
                      onKeyDown={(e) => {
                        const matchCard = allCards.find((c) => c.id === activeMatchForReview.id);
                        if (matchCard) handleCardKeyDown(e, matchCard);
                      }}
                      className="p-3.5 rounded-xl border-2 border-violet-500 bg-violet-50/40 dark:bg-violet-950/30 cursor-grab active:cursor-grabbing space-y-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-violet-700 dark:text-violet-300">
                        <span className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5" />
                          DRAGGABLE MATCH CARD ({activeMatchForReview.totalScore}%)
                        </span>
                        <span>
                          {keyboardGrabbedCard?.id === activeMatchForReview.id
                            ? `TARGET: ${ACTION_ZONES[keyboardTargetZoneIdx]?.zoneNumber}`
                            : `STATUS: ${activeMatchForReview.status.toUpperCase()}`}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Drag or press Enter + Arrow keys to move to ZONE 5 (Review Match) or ZONE 4 (Start Claim)
                      </div>
                      {keyboardGrabbedCard?.id === activeMatchForReview.id && (
                        <div className="p-2 rounded-lg bg-blue-950 text-blue-100 border border-blue-500 text-[10px] flex flex-wrap items-center justify-between gap-1">
                          <span className="font-semibold text-blue-300">
                            Target: {ACTION_ZONES[keyboardTargetZoneIdx]?.zoneNumber} (
                            {ACTION_ZONES[keyboardTargetZoneIdx]?.title})
                          </span>
                          <span className="font-mono">←/→ Cycle · Enter = Move</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const mCard = allCards.find((c) => c.id === activeMatchForReview.id);
                            if (mCard) executeCanvasAction(mCard, 'ZONE_5_CONFIRM_MATCH');
                          }}
                          className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold rounded-lg"
                        >
                          Drop → Zone 5 (Link)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const mCard = allCards.find((c) => c.id === activeMatchForReview.id);
                            if (mCard) executeCanvasAction(mCard, 'ZONE_4_CLAIM_OWNERSHIP');
                          }}
                          className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded-lg"
                        >
                          Drop → Zone 4 (Claim)
                        </button>
                      </div>
                    </div>

                    <div
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (innerDropHoverId !== 'zone-5-link') setInnerDropHoverId('zone-5-link');
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (innerDropHoverId !== 'zone-5-link') setInnerDropHoverId('zone-5-link');
                      }}
                      onDragLeave={(e) => {
                        if (
                          !e.currentTarget.contains(e.relatedTarget as Node) &&
                          innerDropHoverId === 'zone-5-link'
                        ) {
                          setInnerDropHoverId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setInnerDropHoverId(null);
                        const mCard = allCards.find((c) => c.id === activeMatchForReview.id);
                        if (mCard) executeCanvasAction(mCard, 'ZONE_5_CONFIRM_MATCH');
                      }}
                      className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                        innerDropHoverId === 'zone-5-link'
                          ? 'border-solid border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/40 bg-blue-50/90 dark:bg-blue-950/75 scale-[1.02] shadow-md'
                          : activeDragCard
                          ? 'border-dashed border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/35 bg-emerald-50/75 dark:bg-emerald-950/45 scale-[1.01]'
                          : 'border-dashed border-violet-400 dark:border-violet-800 bg-slate-50 dark:bg-slate-950'
                      }`}
                    >
                      <Link2
                        className={`w-5 h-5 mb-1 ${
                          innerDropHoverId === 'zone-5-link'
                            ? 'text-blue-600 dark:text-blue-400'
                            : activeDragCard
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-violet-600'
                        }`}
                      />
                      <div className="text-xs font-bold uppercase text-slate-900 dark:text-white">
                        {innerDropHoverId === 'zone-5-link'
                          ? 'RELEASE TO LINK REPORTS (ZONE 5)'
                          : 'DROP TO LINK REPORTS (ZONE 5)'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Links the Lost &amp; Found reports as a Confirmed Candidate Match
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  Drag any Lost or Found card into ZONE 3: FIND MATCHES to compute candidate matches.
                </div>
              )}
            </div>
          )}

          {/* MODE 3: OWNERSHIP CLAIM & AUTHORIZED REVIEW WORKSPACE (ZONE 4) */}
          {workspaceMode === 'claim_workspace' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">
                    ZONE 4 · OWNERSHIP CLAIM &amp; EVIDENCE VERIFICATION
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeClaimForReview
                      ? `Reviewing Claim ${activeClaimForReview.id} (${activeClaimForReview.foundReportTitle})`
                      : `Submit Ownership Proof for "${claimTargetFoundReport?.title || 'Selected Found Item'}"`}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {(claimTargetFoundReport || activeInspectReport) && (
                    <button
                      type="button"
                      onClick={() => {
                        const rep = claimTargetFoundReport || activeInspectReport;
                        if (rep) openCanvas3DInspect(rep);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>Inspect 3D Model Before Claim</span>
                    </button>
                  )}
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    Tier {user.tier} Session
                  </span>
                </div>
              </div>

              {/* Sub-mode A: Submit a new Claim by dragging the Prepared Claim Card into Submit Zone */}
              {!activeClaimForReview && claimTargetFoundReport && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Target Found Report: {claimTargetFoundReport.title} ({claimTargetFoundReport.id})
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Prompt Question:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {claimTargetFoundReport.secretPromptQuestion ||
                          'Describe the hidden distinguishing detail, sticker, engraving, or contents.'}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">
                      Your Secret Identifying Answer * (Verified Server-Side Against Hidden Clue)
                    </label>
                    <textarea
                      rows={2}
                      value={claimSecretInput}
                      onChange={(e) => setClaimSecretInput(e.target.value)}
                      placeholder="e.g., Blue robotics team sticker near bottom-left trackpad and lock screen alias 'arjun-dev'..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Additional Proof / Serial Hint</label>
                      <input
                        type="text"
                        value={claimProofInput}
                        onChange={(e) => setClaimProofInput(e.target.value)}
                        placeholder="e.g., Serial ends in Q8X4 / Receipt ref"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Designated Custody Desk</label>
                      <select
                        value={claimCustodyDeskId}
                        onChange={(e) => setClaimCustodyDeskId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        {custodyDesks.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.floorRoom})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Drag-to-Submit Claim Card + Drop Target */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      draggable
                      tabIndex={0}
                      role="button"
                      aria-roledescription="Draggable item card"
                      aria-label="Prepared Ownership Claim Card. Press Enter or Space to select card, use Arrow keys to navigate Action Zones, and press Enter or Space to submit claim."
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', 'submit-claim-card');
                        e.dataTransfer.effectAllowed = 'move';
                        const targetCard = allCards.find(
                          (c) => c.id === claimTargetFoundReport.id
                        );
                        if (targetCard) setDraggedCard(targetCard);
                      }}
                      onDragEnd={() => {
                        setDraggedCard(null);
                        if (innerDropHoverId === 'zone-4-submit') setInnerDropHoverId(null);
                      }}
                      onKeyDown={(e) => {
                        const targetCard = allCards.find(
                          (c) => c.id === claimTargetFoundReport.id
                        );
                        if (targetCard) {
                          handleCardKeyDown(e, targetCard, handleCommitOwnershipClaim);
                        } else if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleCommitOwnershipClaim();
                        }
                      }}
                      className="p-3.5 rounded-xl border-2 border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 cursor-grab active:cursor-grabbing space-y-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                        <span className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5" />
                          PREPARED OWNERSHIP CLAIM CARD
                        </span>
                        <span>
                          {keyboardGrabbedCard?.id === claimTargetFoundReport.id
                            ? 'KEYBOARD SELECTED (ENTER TO SUBMIT)'
                            : 'DRAG OR PRESS ENTER →'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Claim: {claimTargetFoundReport.title}
                      </div>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={handleCommitOwnershipClaim}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded-lg"
                      >
                        {busyAction ? 'Submitting...' : 'Drop / Submit Ownership Claim →'}
                      </button>
                    </div>

                    <div
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (innerDropHoverId !== 'zone-4-submit') setInnerDropHoverId('zone-4-submit');
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (innerDropHoverId !== 'zone-4-submit') setInnerDropHoverId('zone-4-submit');
                      }}
                      onDragLeave={(e) => {
                        if (
                          !e.currentTarget.contains(e.relatedTarget as Node) &&
                          innerDropHoverId === 'zone-4-submit'
                        ) {
                          setInnerDropHoverId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setInnerDropHoverId(null);
                        setDraggedCard(null);
                        handleCommitOwnershipClaim();
                      }}
                      className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                        innerDropHoverId === 'zone-4-submit'
                          ? 'border-solid border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/40 bg-blue-50/90 dark:bg-blue-950/75 scale-[1.02] shadow-md'
                          : activeDragCard
                          ? 'border-dashed border-emerald-500 dark:border-emerald-400 bg-emerald-50/75 dark:bg-emerald-950/45 ring-2 ring-emerald-500/40 scale-[1.01]'
                          : 'border-dashed border-amber-400 dark:border-amber-800 bg-slate-50 dark:bg-slate-950'
                      }`}
                    >
                      <ShieldCheck
                        className={`w-5 h-5 mb-1 ${
                          innerDropHoverId === 'zone-4-submit'
                            ? 'text-blue-600 dark:text-blue-400'
                            : activeDragCard
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600'
                        }`}
                      />
                      <div className="text-xs font-bold uppercase text-slate-900 dark:text-white">
                        {innerDropHoverId === 'zone-4-submit'
                          ? 'RELEASE TO SUBMIT CLAIM'
                          : 'DROP TO START CLAIM'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Verifies secret evidence similarity &amp; routes to Custody Review
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-mode B: Authorized Review of Existing Pending Claim */}
              {activeClaimForReview && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Claimant: {activeClaimForReview.claimantName} (Tier{' '}
                        {activeClaimForReview.claimantTier})
                      </span>
                      <span className="font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                        Evidence Match: {activeClaimForReview.automatedEvidenceSimilarity}%
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <strong>Submitted Answer:</strong> &ldquo;
                      {activeClaimForReview.secretCharacteristicAnswer}&rdquo;
                    </div>
                    {activeClaimForReview.additionalOwnershipProof && (
                      <div className="text-slate-500">
                        <strong>Supporting Proof:</strong>{' '}
                        {activeClaimForReview.additionalOwnershipProof}
                      </div>
                    )}
                  </div>

                  {user.id === activeClaimForReview.claimantId &&
                    user.role !== 'custody_staff' &&
                    user.role !== 'admin' && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between">
                        <span>
                          Security Guardrail: Claimants cannot self-approve their own claim. Switch to Custody Desk Staff to approve &amp; generate the QR/OTP pass.
                        </span>
                        <button
                          type="button"
                          onClick={() => onQuickRoleSwitch('staff')}
                          className="px-2.5 py-1 bg-slate-900 text-white font-semibold rounded-lg shrink-0"
                        >
                          Switch to Staff Role
                        </button>
                      </div>
                    )}

                  <div>
                    <label className="block font-semibold mb-1">Reviewer Audit Notes</label>
                    <input
                      type="text"
                      value={claimReviewerNotes}
                      onChange={(e) => setClaimReviewerNotes(e.target.value)}
                      placeholder="Verified secret characteristic against custody record..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>

                  {/* Drag Claim Card into Approve or Reject Drop Zones */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (innerDropHoverId !== 'zone-4-approve') {
                          setInnerDropHoverId('zone-4-approve');
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (innerDropHoverId !== 'zone-4-approve') {
                          setInnerDropHoverId('zone-4-approve');
                        }
                      }}
                      onDragLeave={(e) => {
                        if (
                          !e.currentTarget.contains(e.relatedTarget as Node) &&
                          innerDropHoverId === 'zone-4-approve'
                        ) {
                          setInnerDropHoverId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setInnerDropHoverId(null);
                        handleDecisionDropOnClaim(activeClaimForReview, 'approved');
                      }}
                      className={`p-3.5 rounded-xl border-2 text-center space-y-1.5 transition-all ${
                        innerDropHoverId === 'zone-4-approve'
                          ? 'border-solid border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/40 bg-blue-50/90 dark:bg-blue-950/75 scale-[1.02] shadow-md'
                          : activeDragCard
                          ? 'border-dashed border-emerald-500 dark:border-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/50 ring-2 ring-emerald-500/40 scale-[1.01]'
                          : 'border-dashed border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
                      }`}
                    >
                      <FileCheck2
                        className={`w-5 h-5 mx-auto ${
                          innerDropHoverId === 'zone-4-approve'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-emerald-600'
                        }`}
                      />
                      <div className="font-bold uppercase text-emerald-900 dark:text-emerald-200">
                        {innerDropHoverId === 'zone-4-approve'
                          ? 'RELEASE TO APPROVE & ISSUE QR/OTP'
                          : 'DROP CLAIM TO APPROVE & ISSUE QR/OTP'}
                      </div>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() =>
                          handleDecisionDropOnClaim(activeClaimForReview, 'approved')
                        }
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                      >
                        Approve Claim &amp; Generate 30m Token
                      </button>
                    </div>

                    <div
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (innerDropHoverId !== 'zone-4-reject') {
                          setInnerDropHoverId('zone-4-reject');
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (innerDropHoverId !== 'zone-4-reject') {
                          setInnerDropHoverId('zone-4-reject');
                        }
                      }}
                      onDragLeave={(e) => {
                        if (
                          !e.currentTarget.contains(e.relatedTarget as Node) &&
                          innerDropHoverId === 'zone-4-reject'
                        ) {
                          setInnerDropHoverId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setInnerDropHoverId(null);
                        handleDecisionDropOnClaim(activeClaimForReview, 'rejected');
                      }}
                      className={`p-3.5 rounded-xl border-2 text-center space-y-1.5 transition-all ${
                        innerDropHoverId === 'zone-4-reject'
                          ? 'border-solid border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/40 bg-blue-50/90 dark:bg-blue-950/75 scale-[1.02] shadow-md'
                          : activeDragCard
                          ? 'border-dashed border-emerald-500 dark:border-emerald-400 bg-emerald-50/75 dark:bg-emerald-950/45 ring-2 ring-emerald-500/35 scale-[1.01]'
                          : 'border-dashed border-rose-400 bg-rose-50/40 dark:bg-rose-950/30'
                      }`}
                    >
                      <XCircle
                        className={`w-5 h-5 mx-auto ${
                          innerDropHoverId === 'zone-4-reject'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-rose-600'
                        }`}
                      />
                      <div className="font-bold uppercase text-rose-900 dark:text-rose-200">
                        {innerDropHoverId === 'zone-4-reject'
                          ? 'RELEASE TO REJECT CLAIM'
                          : 'DROP CLAIM TO REJECT'}
                      </div>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() =>
                          handleDecisionDropOnClaim(activeClaimForReview, 'rejected')
                        }
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg"
                      >
                        Reject Ownership Claim
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Switch between existing Claims */}
              {claims.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">Inspect Existing Claim Card:</span>
                  {claims.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveClaimForReview(c)}
                      className={`px-2.5 py-1 rounded-lg font-medium ${
                        activeClaimForReview?.id === c.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {c.foundReportTitle} ({c.status})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODE 4: SECURE QR / OTP CUSTODY HANDOVER TERMINAL (ZONE 6) */}
          {workspaceMode === 'return_terminal' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400">
                    ZONE 6 · SHORT-LIVED QR &amp; OTP CUSTODY HANDOVER TERMINAL
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Validate Pickup Token &amp; Record Auditable Return
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeInspectReport && (
                    <button
                      type="button"
                      onClick={() => openCanvas3DInspect(activeInspectReport)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>Inspect 3D Before Handover</span>
                    </button>
                  )}
                  {claims.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveReturnClaim(c);
                        setHandoverOtpInput(c.handoverOtp || '');
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        activeReturnClaim?.id === c.id
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {c.foundReportTitle.slice(0, 16)} ({c.status})
                    </button>
                  ))}
                </div>
              </div>

              {activeReturnClaim ? (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Left: Short-Lived QR Code & 6-Digit OTP Pass */}
                  <div className="sm:col-span-5 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-2.5">
                    {activeReturnClaim.status === 'approved' && activeReturnClaim.handoverToken ? (
                      <>
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <QRCodeSVG
                            value={activeReturnClaim.handoverToken}
                            size={132}
                            level="M"
                          />
                        </div>
                        <div className="text-[11px] text-slate-500">One-Time 6-Digit Handover OTP</div>
                        <div className="text-2xl font-bold font-mono tabular-nums tracking-widest text-teal-600 dark:text-teal-400">
                          {activeReturnClaim.handoverOtp}
                        </div>
                        <div className="text-[10px] font-mono tabular-nums text-slate-500">
                          Token: {activeReturnClaim.handoverToken}
                        </div>
                        <button
                          type="button"
                          onClick={() => onRegenerateToken(activeReturnClaim.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Rotate 30-Min Token
                        </button>
                      </>
                    ) : activeReturnClaim.status === 'completed' ? (
                      <div className="py-6 space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          HANDOVER COMPLETED &amp; AUDITED
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-500">
                          {activeReturnClaim.handoverCompletedAt
                            ? new Date(activeReturnClaim.handoverCompletedAt).toLocaleString()
                            : 'Verified'}
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 space-y-2">
                        <Clock className="w-8 h-8 text-amber-500 mx-auto" />
                        <div className="text-xs font-bold">
                          Claim Status: {activeReturnClaim.status.toUpperCase()}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveClaimForReview(activeReturnClaim);
                            setWorkspaceMode('claim_workspace');
                          }}
                          className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg"
                        >
                          Open in Zone 4 to Approve →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Custody Desk Validation & Drag-to-Complete Zone */}
                  <div className="sm:col-span-7 space-y-3 text-xs">
                    {user.role !== 'custody_staff' && user.role !== 'admin' && (
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between">
                        <span>
                          Switch to <strong>Custody Desk Staff</strong> to validate the QR/OTP token at the desk.
                        </span>
                        <button
                          type="button"
                          onClick={() => onQuickRoleSwitch('staff')}
                          className="px-2.5 py-1 bg-slate-900 text-white font-semibold rounded-lg shrink-0"
                        >
                          Switch to Staff
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold mb-1">
                        6-Digit Handover OTP or Scanned QR Token *
                      </label>
                      <input
                        type="text"
                        value={handoverOtpInput}
                        onChange={(e) => setHandoverOtpInput(e.target.value)}
                        placeholder={activeReturnClaim.handoverOtp || 'Enter 6-digit OTP'}
                        className="w-full px-3 py-2 font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Custody Desk Location</label>
                      <select
                        value={handoverDeskId}
                        onChange={(e) => setHandoverDeskId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        {custodyDesks.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.floorRoom})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Drag Return Card to Finalize Handover with Confirmation Guardrail */}
                    <div
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (innerDropHoverId !== 'zone-6-finalize') {
                          setInnerDropHoverId('zone-6-finalize');
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (innerDropHoverId !== 'zone-6-finalize') {
                          setInnerDropHoverId('zone-6-finalize');
                        }
                      }}
                      onDragLeave={(e) => {
                        if (
                          !e.currentTarget.contains(e.relatedTarget as Node) &&
                          innerDropHoverId === 'zone-6-finalize'
                        ) {
                          setInnerDropHoverId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setInnerDropHoverId(null);
                        setConfirmHandoverPending(true);
                      }}
                      className={`p-4 rounded-xl border-2 text-center space-y-2 transition-all ${
                        innerDropHoverId === 'zone-6-finalize'
                          ? 'border-solid border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/40 bg-blue-50/90 dark:bg-blue-950/75 scale-[1.02] shadow-md'
                          : activeDragCard
                          ? 'border-dashed border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/50 scale-[1.01]'
                          : 'border-dashed border-teal-500 bg-teal-50/40 dark:bg-teal-950/30'
                      }`}
                    >
                      <QrCode
                        className={`w-5 h-5 mx-auto ${
                          innerDropHoverId === 'zone-6-finalize'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-teal-600'
                        }`}
                      />
                      <div className="font-bold uppercase text-teal-950 dark:text-teal-200">
                        {innerDropHoverId === 'zone-6-finalize'
                          ? 'RELEASE RETURN CARD TO COMPLETE HANDOVER (ZONE 6)'
                          : 'DROP RETURN CARD TO COMPLETE HANDOVER (ZONE 6)'}
                      </div>
                      {!confirmHandoverPending ? (
                        <button
                          type="button"
                          disabled={busyAction || activeReturnClaim.status !== 'approved'}
                          onClick={() => setConfirmHandoverPending(true)}
                          className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-semibold rounded-lg"
                        >
                          {busyAction
                            ? 'Validating Handover...'
                            : 'Validate QR/OTP & Mark Item Returned'}
                        </button>
                      ) : (
                        <div
                          role="status"
                          aria-live="polite"
                          aria-atomic="true"
                          className="p-3 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-lg space-y-2 text-left"
                        >
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            Confirm Physical Custody Handover?
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            This will verify OTP{' '}
                            <span className="font-mono font-bold">
                              {handoverOtpInput || activeReturnClaim.handoverOtp}
                            </span>{' '}
                            at desk <span className="font-semibold">{handoverDeskId}</span> and permanently record the completed return in the audit log.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busyAction}
                              onClick={() => {
                                setConfirmHandoverPending(false);
                                handleCompleteReturnDrop(activeReturnClaim);
                              }}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                            >
                              Confirm &amp; Complete Return
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmHandoverPending(false)}
                              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* MODE 5: INTERACTIVE GOOGLE MAPS WORKSPACE WITH MAP-TO-CANVAS ROUTING */}
          {workspaceMode === 'map_workspace' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <div className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                    CAMPUS GEOSPATIAL CANVAS · GOOGLE MAPS PLATFORM
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Select Any Pin to Send Card to Find Matches (Zone 3) or Populate Draft Coordinates
                  </h2>
                </div>
              </div>
              <CampusMapView
                reports={reports.filter((r) => !r.archived)}
                custodyDesks={custodyDesks}
                onSelectReport={(rep) => {
                  const foundCard = allCards.find((c) => c.id === rep.id);
                  if (foundCard) setSelectedCard(foundCard);
                }}
                onSendToCanvasZone={(rep, zId) => {
                  const foundCard = allCards.find((c) => c.id === rep.id);
                  if (foundCard) executeCanvasAction(foundCard, zId);
                }}
                onReportLostClick={(coords) => {
                  if (coords) {
                    setDraftLat(coords.lat);
                    setDraftLng(coords.lng);
                    if (coords.label) setDraftBuilding(coords.label);
                  }
                  setDraftType('lost');
                  setDraftStep(2);
                  setWorkspaceMode('draft_builder');
                }}
              />
            </div>
          )}

          {/* MODE 6: USER PROFILE, TRANSPARENT TRUST FORMULA & ACTIVITY HISTORY */}
          {workspaceMode === 'profile_trust' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                    USER PROFILE · VERIFICATION &amp; TRANSPARENT TRUST CENTER
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {user.fullName} (@{user.username}) · {user.institutionName || 'Campus Member'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateView('verification')}
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg"
                >
                  Open Verification Center →
                </button>
              </div>

              {/* Genuine Verification Status Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-500">Tier 1 · Campus Email</div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    {user.emailVerified ? 'Verified' : 'Not started'}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-500">Tier 2 · SMS Phone OTP</div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    {user.phoneVerified ? `Verified (${user.phoneMasked || 'Masked'})` : 'Not started'}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-500">Tier 3 · Institutional ID</div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-violet-600" />
                    {user.identityVerified
                      ? 'Verified'
                      : user.identityStatus === 'pending'
                      ? 'Under review'
                      : user.identityStatus === 'rejected'
                      ? 'Rejected'
                      : 'Not started'}
                  </div>
                </div>
              </div>

              {/* Transparent Trust Score Calculation Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Transparent Trust Score Calculation
                  </span>
                  <span className="font-mono tabular-nums text-sm font-bold text-blue-600 dark:text-blue-400">
                    {user.trustScore} / 100 pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Formula: Base Account (50) + Email Verified ({user.emailVerified ? '+10' : '+0'}) + Phone OTP Verified ({user.phoneVerified ? '+15' : '+0'}) + Institutional ID Verified ({user.identityVerified ? '+10' : '+0'}) + Completed Handovers ({user.completedHandoversCount} returns).
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  Important Guardrail: Verification and trust metrics indicate account accountability only and are never treated as automatic proof of item ownership.
                </p>
              </div>

              {/* User-Owned Reports & Visible Claims Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Your Reported Items ({reports.filter((r) => r.reporterId === user.id).length})
                  </div>
                  {reports
                    .filter((r) => r.reporterId === user.id)
                    .slice(0, 4)
                    .map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0"
                      >
                        <span className="truncate font-medium">{r.title}</span>
                        <span className="font-mono uppercase text-[10px] text-slate-500">
                          {r.status}
                        </span>
                      </div>
                    ))}
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Your Claim &amp; Return History ({claims.length})
                  </div>
                  {claims.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0"
                    >
                      <span className="truncate font-medium">{c.foundReportTitle}</span>
                      <span className="font-mono uppercase text-[10px] text-emerald-600">
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODE 7: EMBEDDED 3D MODEL INSPECTOR FOR SELECTED ITEM CARDS */}
          {workspaceMode === 'inspect_3d' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                    HIGH-FIDELITY 3D ITEM INSPECTOR · PRE-CLAIM &amp; HANDOVER VERIFICATION
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Rotate, Explode &amp; Verify Item Traits Before Starting a Claim or Handover
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {activeInspectReport && onOpen3DViewer && (
                    <button
                      type="button"
                      onClick={() => onOpen3DViewer(activeInspectReport)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open Fullscreen 3D Studio</span>
                    </button>
                  )}
                </div>
              </div>

              {activeInspectReport ? (
                <div className="space-y-3">
                  <Item3DViewerModal
                    isOpen={true}
                    embedded={true}
                    heightClassName="h-[520px]"
                    report={activeInspectReport}
                    allReports={reports.filter((r) => !r.archived)}
                    onSelectReport={(rep) => {
                      setInspectOverrideReport(rep);
                      const foundCard = allCards.find((c) => c.id === rep.id);
                      if (foundCard) setSelectedCard(foundCard);
                    }}
                    onSendToCanvas={(rep) => {
                      const foundCard = allCards.find((c) => c.id === rep.id);
                      if (foundCard) executeCanvasAction(foundCard, 'ZONE_3_FIND_MATCHES');
                    }}
                    onStartClaim={(rep) => {
                      const foundCard = allCards.find((c) => c.id === rep.id);
                      if (foundCard) {
                        executeCanvasAction(
                          foundCard,
                          rep.type === 'found' ? 'ZONE_4_CLAIM_OWNERSHIP' : 'ZONE_3_FIND_MATCHES'
                        );
                      }
                    }}
                    onStartHandover={(rep) => {
                      const existingClaim =
                        claims.find(
                          (c) => c.foundReportId === rep.id || c.lostReportId === rep.id
                        ) || claims[0];
                      if (existingClaim) {
                        setActiveReturnClaim(existingClaim);
                        setHandoverOtpInput(existingClaim.handoverOtp || '');
                      }
                      setWorkspaceMode('return_terminal');
                    }}
                    onExpandFullscreen={onOpen3DViewer}
                  />

                  {/* Workflow Continuity Bar: Proceed from 3D Inspection to Claim or Handover */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        Finished 3D Inspection of &ldquo;{activeInspectReport.title}&rdquo;?
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Proceed directly to Ownership Claim (Zone 4), Match Analysis (Zone 3), or Custody Handover (Zone 6).
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const foundCard = allCards.find((c) => c.id === activeInspectReport.id);
                          if (foundCard) executeCanvasAction(foundCard, 'ZONE_3_FIND_MATCHES');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        Find Matches (Zone 3)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClaimTargetFoundReport(activeInspectReport);
                          setActiveClaimForReview(null);
                          setWorkspaceMode('claim_workspace');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                      >
                        Start Claim (Zone 4) →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const existingClaim =
                            claims.find(
                              (c) =>
                                c.foundReportId === activeInspectReport.id ||
                                c.lostReportId === activeInspectReport.id
                            ) || claims[0];
                          if (existingClaim) {
                            setActiveReturnClaim(existingClaim);
                            setHandoverOtpInput(existingClaim.handoverOtp || '');
                          }
                          setWorkspaceMode('return_terminal');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                      >
                        Proceed to Handover (Zone 6) →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  Select any item card from the Left Data Card Library to inspect its 3D model.
                </div>
              )}
            </div>
          )}

          {/* Bottom Activity & Reversible Undo Timeline inside Center Workspace */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Canvas Operation History &amp; Reversible Undo Log
              </span>
              <span className="font-mono tabular-nums text-[11px] text-slate-400">
                {history.length} recent action(s)
              </span>
            </div>
            {history.length === 0 ? (
              <div className="text-[11px] text-slate-500">
                No canvas drop actions performed yet in this session. Drag any card from the left deck into an Action Zone below.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="truncate">
                      <span className="font-mono tabular-nums text-slate-400 mr-2">
                        {h.timestamp}
                      </span>
                      <strong
                        className={
                          h.status === 'rejected'
                            ? 'text-rose-600 mr-1.5'
                            : 'text-blue-600 dark:text-blue-400 mr-1.5'
                        }
                      >
                        [{h.zoneTitle}]
                      </strong>
                      <span className="text-slate-700 dark:text-slate-300">{h.summary}</span>
                    </div>
                    {(h.undoReportId || h.undoMatchId) && (
                      <button
                        type="button"
                        onClick={() => handleUndoHistory(h)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded font-semibold hover:bg-blue-600 hover:text-white shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Undo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: CONTEXTUAL CARD INSPECTOR & EMBEDDED 3D PREVIEW */}
        <aside
          aria-label="Contextual Card Details Inspector"
          className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4"
        >
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                RIGHT INSPECTOR · CARD &amp; 3D VIEW
              </div>
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setRightInspectorTab('details')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    rightInspectorTab === 'details'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setRightInspectorTab('3d')}
                  className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
                    rightInspectorTab === '3d'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Box className="w-3 h-3" />
                  <span>3D Inspect</span>
                </button>
              </div>
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {selectedCard ? selectedCard.title : 'Select or Drag Any Card'}
            </h2>
          </div>

          {selectedCard ? (
            <div className="space-y-3 text-xs">
              {rightInspectorTab === '3d' && resolveReportForCard(selectedCard) ? (
                <div className="space-y-2.5">
                  <Item3DViewerModal
                    isOpen={true}
                    embedded={true}
                    heightClassName="h-[340px]"
                    report={resolveReportForCard(selectedCard)}
                    allReports={reports.filter((r) => !r.archived)}
                    onExpandFullscreen={onOpen3DViewer}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const rep = resolveReportForCard(selectedCard);
                        if (rep) openCanvas3DInspect(rep);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-colors"
                    >
                      Expand in Center Canvas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rep = resolveReportForCard(selectedCard);
                        if (rep) {
                          setClaimTargetFoundReport(rep);
                          setActiveClaimForReview(null);
                          setWorkspaceMode('claim_workspace');
                        }
                      }}
                      className="px-2.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-colors"
                    >
                      Start Claim (Zone 4)
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {selectedCard.imageUrl && (
                    <img
                      src={selectedCard.imageUrl}
                      alt={selectedCard.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-36 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                    />
                  )}

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {selectedCard.badgeText}
                      </span>
                      <span className="font-mono tabular-nums font-semibold">
                        {selectedCard.statusLabel}
                      </span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300">{selectedCard.subtitle}</div>
                    {selectedCard.rawReport && (
                      <>
                        <div className="text-[11px] text-slate-500 pt-1">
                          <strong>Location:</strong>{' '}
                          {selectedCard.rawReport.approximateLocationLabel} (
                          {selectedCard.rawReport.campusZone})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <strong>Approx Time:</strong> {selectedCard.rawReport.incidentDate} ·{' '}
                          {selectedCard.rawReport.incidentTimeWindow}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <strong>Distinguishing Traits:</strong>{' '}
                          {selectedCard.rawReport.distinguishingFeatures}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <strong>Reporter:</strong> {selectedCard.rawReport.reporterName} (Tier{' '}
                          {selectedCard.rawReport.reporterTier})
                        </div>
                      </>
                    )}
                    {resolveReportForCard(selectedCard) && (
                      <div className="pt-2 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const rep = resolveReportForCard(selectedCard);
                            if (rep) openCanvas3DInspect(rep);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs"
                        >
                          <Box className="w-3.5 h-3.5" />
                          <span>Open 3D Inspect View in Canvas</span>
                        </button>
                        {onOpen3DViewer && (
                          <button
                            type="button"
                            onClick={() => {
                              const rep = resolveReportForCard(selectedCard);
                              if (rep) onOpen3DViewer(rep);
                            }}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Fullscreen 3D Studio</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Privacy Guardrail Notice */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-500">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Privacy &amp; Verification Guardrail
                </div>
                <p>
                  Hidden ownership characteristics, raw student ID uploads, and exact coordinates are never exposed in public card views.
                </p>
              </div>

              {/* Compatible Action Zones Quick Drop List */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase text-slate-400">
                  Valid Destination Zones for Selected Card:
                </div>
                {ACTION_ZONES.filter((z) => z.acceptedTypes.includes(selectedCard.cardType)).map(
                  (z) => {
                    const isZoneHovered = hoveredZone === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onDragEnter={(e) => {
                          e.preventDefault();
                          if (hoveredZone !== z.id) setHoveredZone(z.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (hoveredZone !== z.id) setHoveredZone(z.id);
                        }}
                        onDragLeave={(e) => {
                          if (
                            !e.currentTarget.contains(e.relatedTarget as Node) &&
                            hoveredZone === z.id
                          ) {
                            setHoveredZone(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setHoveredZone(null);
                          const card = draggedCard || selectedCard;
                          if (card) executeCanvasAction(card, z.id);
                        }}
                        onClick={() => executeCanvasAction(selectedCard, z.id)}
                        className={`w-full px-3 py-2 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                          isZoneHovered
                            ? 'border-solid border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/40 bg-blue-50/90 dark:bg-blue-950/80 text-blue-950 dark:text-blue-100 shadow-sm'
                            : activeDragCard
                            ? 'border-dashed border-emerald-500 dark:border-emerald-400 bg-emerald-50/75 dark:bg-emerald-950/45 text-emerald-950 dark:text-emerald-100'
                            : 'border-transparent bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-bold">
                            {z.zoneNumber}: {z.title}
                          </div>
                          <div className="text-[10px] opacity-80">{z.nextStepHint}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 space-y-2">
              <Eye className="w-6 h-6 text-slate-400 mx-auto" />
              <p>
                Click or drag any card from the Left Data Card Library to inspect its metadata and see which Action Zones are valid destinations.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* BOTTOM PERSISTENT DOCK: C. 7 ACTION ZONES */}
      <section
        aria-label="Persistent 7 Action Zones Dock"
        className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-4 space-y-3 shadow-sm transition-all ${
          hoveredZone
            ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/30'
            : activeDragCard
            ? 'border-emerald-500/80 dark:border-emerald-500/70 ring-2 ring-emerald-500/20'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div
          aria-live="polite"
          aria-atomic="true"
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              C. ACTION ZONE DOCK (LIVING CANVAS DROP TARGETS)
            </span>
            {hoveredZone ? (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 border border-blue-500 text-xs font-semibold text-blue-700 dark:text-blue-300">
                Drop Target Active (Blue Border):{' '}
                {ACTION_ZONES.find((z) => z.id === hoveredZone)?.zoneNumber}{' '}
                {ACTION_ZONES.find((z) => z.id === hoveredZone)?.title}
              </span>
            ) : activeDragCard ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Highlighting valid drop zones for &ldquo;{activeDragCard.title}&rdquo;
              </span>
            ) : null}
          </div>
          <span className="text-[11px] text-slate-500">
            Emerald = Valid Drop Zone · Blue Border = Drag-Over Active · Dimmed = Incompatible
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
          {ACTION_ZONES.map((zone, idx) => {
            const isHovered = hoveredZone === zone.id;
            const isKeyboardTargeted =
              Boolean(keyboardGrabbedCard) && keyboardTargetZoneIdx === idx;
            const referenceCard = activeDragCard || selectedCard;
            const compatibility = referenceCard
              ? validateDrop(referenceCard, zone)
              : null;

            let zoneStyle =
              'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/80 text-slate-800 dark:text-slate-200';

            if (isHovered || isKeyboardTargeted) {
              // Distinct solid blue border & ring when a card is dragged over the drop zone or keyboard targeted
              zoneStyle =
                compatibility && !compatibility.valid
                  ? 'border-solid border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/35 bg-rose-50/85 dark:bg-rose-950/75 text-rose-950 dark:text-rose-100 scale-[1.01] shadow-md'
                  : 'border-solid border-blue-500 dark:border-blue-400 bg-blue-50/95 dark:bg-blue-950/85 text-blue-950 dark:text-blue-100 scale-[1.02] shadow-md ring-4 ring-blue-500/40';
            } else if (activeDragCard && compatibility) {
              // Highlight valid drop zones when a card is dragged
              if (compatibility.valid) {
                zoneStyle =
                  'border-dashed border-emerald-500 dark:border-emerald-400 bg-emerald-50/85 dark:bg-emerald-950/55 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/40 shadow-xs scale-[1.01]';
              } else {
                zoneStyle =
                  'border-dashed border-rose-300/60 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 opacity-45';
              }
            } else if (selectedCard && compatibility?.valid) {
              zoneStyle =
                'border-dashed border-emerald-500/70 dark:border-emerald-500/70 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100';
            }

            return (
              <div
                key={zone.id}
                tabIndex={0}
                role="button"
                aria-label={`${zone.zoneNumber}: ${zone.title} — ${zone.dropActionLabel}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (hoveredZone !== zone.id) setHoveredZone(zone.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (hoveredZone !== zone.id) setHoveredZone(zone.id);
                }}
                onDragLeave={(e) => {
                  if (
                    !e.currentTarget.contains(e.relatedTarget as Node) &&
                    hoveredZone === zone.id
                  ) {
                    setHoveredZone(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setHoveredZone(null);
                  const uid = e.dataTransfer.getData('text/plain');
                  const card =
                    draggedCard || allCards.find((c) => c.uid === uid) || selectedCard;
                  if (card) {
                    executeCanvasAction(card, zone.id);
                  }
                }}
                onClick={() => {
                  const targetCard = keyboardGrabbedCard || selectedCard;
                  if (targetCard) {
                    executeCanvasAction(targetCard, zone.id);
                  } else if (zone.id === 'ZONE_1_REPORT_LOST') {
                    executeCanvasAction(allCards[0], 'ZONE_1_REPORT_LOST');
                  } else if (zone.id === 'ZONE_2_REPORT_FOUND') {
                    executeCanvasAction(allCards[1], 'ZONE_2_REPORT_FOUND');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const targetCard = keyboardGrabbedCard || selectedCard;
                    if (targetCard) {
                      executeCanvasAction(targetCard, zone.id);
                    } else if (zone.id === 'ZONE_1_REPORT_LOST') {
                      executeCanvasAction(allCards[0], 'ZONE_1_REPORT_LOST');
                    } else if (zone.id === 'ZONE_2_REPORT_FOUND') {
                      executeCanvasAction(allCards[1], 'ZONE_2_REPORT_FOUND');
                    }
                  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    setKeyboardTargetZoneIdx((idx + 1) % ACTION_ZONES.length);
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    setKeyboardTargetZoneIdx((idx - 1 + ACTION_ZONES.length) % ACTION_ZONES.length);
                  }
                }}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[124px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${zoneStyle}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono tabular-nums font-bold">
                    <span className="opacity-80">{zone.zoneNumber}</span>
                    {(isHovered || isKeyboardTargeted) && compatibility?.valid ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px]">
                        DROP HERE
                      </span>
                    ) : isHovered ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px]">
                        DRAG OVER
                      </span>
                    ) : referenceCard && compatibility ? (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] ${
                          compatibility.valid
                            ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-600/15 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {compatibility.valid ? 'VALID DROP' : 'INCOMPATIBLE'}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs font-extrabold tracking-tight mt-1">
                    {zone.title}
                  </div>
                  <div className="text-[10px] opacity-85 mt-1 line-clamp-2">
                    {referenceCard && compatibility?.valid
                      ? `Next: ${zone.nextStepHint}`
                      : zone.description}
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-current/15 text-[10px] font-bold uppercase tracking-wider">
                  {isHovered && compatibility?.valid ? 'Release to Execute →' : zone.dropActionLabel}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MOBILE / SINGLE-POINTER ACCESSIBLE ACTION ZONE SHEET */}
      {mobileSheetCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Choose Valid Action Zone for Card
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetCard(null)}
                className="text-xs font-semibold text-slate-500"
              >
                Close
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                {mobileSheetCard.title}
              </div>
              <div className="text-slate-500 mt-0.5">{mobileSheetCard.badgeText}</div>
            </div>

            <div className="space-y-2">
              {ACTION_ZONES.map((z) => {
                const check = validateDrop(mobileSheetCard, z);
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => executeCanvasAction(mobileSheetCard, z.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      check.valid
                        ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/30 text-slate-900 dark:text-white hover:bg-emerald-600 hover:text-white'
                        : 'border-slate-200 dark:border-slate-800 opacity-50 text-slate-500'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">
                        {z.zoneNumber}: {z.title}
                      </div>
                      <div className="text-[11px] opacity-80">{z.nextStepHint}</div>
                    </div>
                    <span className="text-[10px] font-mono uppercase font-bold">
                      {check.valid ? 'Execute →' : 'Incompatible'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
