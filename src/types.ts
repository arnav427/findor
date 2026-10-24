export type UserRole = 'standard' | 'verified' | 'custody_staff' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  tier: 0 | 1 | 2 | 3;
  emailVerified: boolean;
  phoneVerified: boolean;
  phoneMasked?: string;
  identityVerified: boolean;
  identityStatus: 'none' | 'pending' | 'approved' | 'rejected';
  institutionName?: string;
  studentOrStaffId?: string;
  trustScore: number;
  verifiedReturnsCount: number;
  completedHandoversCount: number;
  positiveFeedbackCount: number;
  createdAt: string;
}

export type ReportType = 'lost' | 'found';
export type ReportStatus = 'unresolved' | 'matched' | 'returned';
export type PriorityLevel = 'low' | 'medium' | 'high';

export type ItemCategory =
  | 'Electronics'
  | 'Bags and backpacks'
  | 'Wallets and purses'
  | 'Keys'
  | 'Identity cards'
  | 'Documents'
  | 'Books and stationery'
  | 'Clothing'
  | 'Jewellery'
  | 'Accessories'
  | 'Water bottles'
  | 'Other';

export interface ItemImage {
  id: string;
  url: string;
  caption?: string;
}

export interface ItemReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterTier: number;
  type: ReportType;
  status: ReportStatus;
  priority: PriorityLevel;
  title: string;
  category: ItemCategory;
  brand: string;
  model: string;
  color: string;
  material: string;
  distinguishingFeatures: string;
  description: string;
  serialHint?: string;
  hasSecretCharacteristic: boolean;
  secretPromptQuestion?: string;
  campusZone: string;
  buildingName: string;
  floorOrArea: string;
  approximateLocationLabel: string;
  locationPrivacy: 'approximate' | 'exact_authorized';
  lat: number;
  lng: number;
  incidentDate: string;
  incidentTimeWindow: string;
  designatedCustodyDeskId?: string;
  images: ItemImage[];
  flaggedForModeration?: boolean;
  archived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CanvasCardType =
  | 'draft_report'
  | 'lost_item'
  | 'found_item'
  | 'potential_match'
  | 'claim_card'
  | 'return_card'
  | 'verification_card'
  | 'notification_card';

export type CanvasZoneId =
  | 'ZONE_1_REPORT_LOST'
  | 'ZONE_2_REPORT_FOUND'
  | 'ZONE_3_FIND_MATCHES'
  | 'ZONE_4_CLAIM_OWNERSHIP'
  | 'ZONE_5_CONFIRM_MATCH'
  | 'ZONE_6_COMPLETE_RETURN'
  | 'ZONE_7_ARCHIVE';

export type MatchStatus = 'suggested' | 'under_review' | 'confirmed' | 'dismissed';

export interface MatchSignalBreakdown {
  categoryScore: number;
  appearanceScore: number;
  locationScore: number;
  timelineScore: number;
  descriptionScore: number;
}

export interface PotentialMatch {
  id: string;
  lostReportId: string;
  foundReportId: string;
  lostReport?: ItemReport;
  foundReport?: ItemReport;
  totalScore: number;
  breakdown: MatchSignalBreakdown;
  explanations: string[];
  distanceMeters: number;
  timeDeltaHours: number;
  status: MatchStatus;
  aiInsight?: string;
  createdAt: string;
}

export type ClaimStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface OwnershipClaim {
  id: string;
  matchId?: string;
  lostReportId?: string;
  foundReportId: string;
  foundReportTitle: string;
  claimantId: string;
  claimantName: string;
  claimantTier: number;
  finderId: string;
  secretCharacteristicAnswer: string;
  additionalOwnershipProof: string;
  automatedEvidenceSimilarity: number;
  status: ClaimStatus;
  reviewerNotes?: string;
  reviewedBy?: string;
  custodyDeskId: string;
  pickupWindow: string;
  handoverOtp?: string;
  handoverToken?: string;
  handoverExpiresAt?: string;
  handoverCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustodyDesk {
  id: string;
  name: string;
  zoneLabel: string;
  floorRoom: string;
  operatingHours: string;
  supportedHandoverTypes: string[];
  contactChannel: string;
  lat: number;
  lng: number;
  activeQueueCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderTier: number;
  text: string;
  translatedText?: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  reportId: string;
  reportTitle: string;
  claimId?: string;
  participantIds: string[];
  participantNames: string[];
  status: 'active' | 'reported' | 'closed';
  unreadCount: number;
  lastMessageText: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'match' | 'claim' | 'verification' | 'chat' | 'handover' | 'system';
  title: string;
  body: string;
  linkView: string;
  linkTargetId?: string;
  read: boolean;
  createdAt: string;
}

export interface VerificationRequestRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  tier: 1 | 2 | 3;
  institutionName?: string;
  studentOrStaffId?: string;
  documentReference?: string;
  documentRetentionPolicy: string;
  documentDeletedAfterReview: boolean;
  status: 'pending' | 'approved' | 'rejected';
  reviewerNotes?: string;
  createdAt: string;
}

export interface DisputeRecord {
  id: string;
  claimId?: string;
  reportId?: string;
  raisedByUserId: string;
  raisedByName: string;
  reason: string;
  status: 'open' | 'investigating' | 'resolved';
  resolutionNotes?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
}
