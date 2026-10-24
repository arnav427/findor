import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'findora-db.json');

// Initialize Gemini AI client on server-side with required User-Agent header
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Clean SVG Data URI generator for default item illustrations (Zero external fragile URLs)
function createItemSvgDataUrl(title: string, subtitle: string, bgHex: string, accentHex: string, iconType: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgHex}" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#bg)" />
    <circle cx="520" cy="110" r="140" fill="${accentHex}" opacity="0.12" />
    <circle cx="120" cy="390" r="160" fill="${accentHex}" opacity="0.08" />
    <rect x="64" y="64" width="512" height="352" rx="20" fill="#1e293b" stroke="${accentHex}" stroke-opacity="0.35" stroke-width="2" />
    <g transform="translate(272, 128)" stroke="${accentHex}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${
        iconType === 'laptop'
          ? '<rect x="8" y="12" width="80" height="54" rx="6" fill="#0f172a"/><path d="M0 68h96l8 12H-8z" fill="#334155"/><circle cx="70" cy="28" r="6" fill="#38bdf8"/>'
          : iconType === 'wallet'
          ? '<rect x="6" y="14" width="84" height="60" rx="10" fill="#292524"/><path d="M62 34h28v20H62a10 10 0 0 1 0-20z" fill="#44403c"/><circle cx="72" cy="44" r="3" fill="#fbbf24"/>'
          : iconType === 'bottle'
          ? '<rect x="30" y="4" width="36" height="14" rx="4" fill="#475569"/><rect x="22" y="20" width="52" height="72" rx="12" fill="#1e3a8a"/><path d="M22 46h52" stroke="#60a5fa" stroke-width="3"/>'
          : iconType === 'keys'
          ? '<circle cx="32" cy="44" r="20" fill="#0f172a"/><path d="M52 44h38v14 M76 44v10"/>'
          : '<rect x="16" y="12" width="64" height="72" rx="14" fill="#0f172a"/><path d="M34 12v-6a14 14 0 0 1 28 0v6"/>'
      }
    </g>
    <text x="320" y="305" text-anchor="middle" fill="#f8fafc" font-family="Plus Jakarta Sans, sans-serif" font-size="24" font-weight="700">${title}</text>
    <text x="320" y="340" text-anchor="middle" fill="#94a3b8" font-family="Public Sans, sans-serif" font-size="16">${subtitle}</text>
    <text x="320" y="382" text-anchor="middle" fill="${accentHex}" font-family="JetBrains Mono, monospace" font-size="12">FINDORA VERIFIED EVIDENCE RECORD</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hashPassword(password: string, salt = 'findora_campus_salt_2026'): string {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

interface DbSchema {
  users: any[];
  passwordHashes: Record<string, string>;
  sessions: Record<string, string>; // token -> userId
  verificationCodes: Record<string, { emailCode?: string; phoneOtp?: string; expiresAt: number; attempts: number }>;
  reports: any[];
  secretEvidence: Record<string, { secretCharacteristic: string; secretPromptQuestion: string }>;
  matches: any[];
  claims: any[];
  custodyDesks: any[];
  conversations: any[];
  messages: any[];
  notifications: any[];
  verificationRequests: any[];
  disputes: any[];
  auditLogs: any[];
}

function getInitialDb(): DbSchema {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

  const users = [
    {
      id: 'usr-student-1',
      email: 'arjun.mehta@campus.edu',
      username: 'arjun_m',
      fullName: 'Arjun Mehta',
      role: 'verified',
      tier: 3,
      emailVerified: true,
      phoneVerified: true,
      phoneMasked: '+91 ••••• •4821',
      identityVerified: true,
      identityStatus: 'approved',
      institutionName: 'National Institute of Technology Campus',
      studentOrStaffId: 'NIT-CS-2026-0842',
      trustScore: 94,
      verifiedReturnsCount: 3,
      completedHandoversCount: 4,
      positiveFeedbackCount: 4,
      createdAt: hoursAgo(240),
    },
    {
      id: 'usr-finder-2',
      email: 'priya.sharma@campus.edu',
      username: 'priya_s',
      fullName: 'Priya Sharma',
      role: 'verified',
      tier: 2,
      emailVerified: true,
      phoneVerified: true,
      phoneMasked: '+91 ••••• •9104',
      identityVerified: false,
      identityStatus: 'pending',
      institutionName: 'National Institute of Technology Campus',
      studentOrStaffId: 'NIT-EE-2026-1190',
      trustScore: 88,
      verifiedReturnsCount: 5,
      completedHandoversCount: 5,
      positiveFeedbackCount: 5,
      createdAt: hoursAgo(190),
    },
    {
      id: 'usr-staff-3',
      email: 'officer.kiran@campus.edu',
      username: 'custody_kiran',
      fullName: 'Officer Kiran Rao (Custody Desk)',
      role: 'custody_staff',
      tier: 3,
      emailVerified: true,
      phoneVerified: true,
      phoneMasked: '+91 ••••• •0112',
      identityVerified: true,
      identityStatus: 'approved',
      institutionName: 'Campus Security & Lost Property Directorate',
      studentOrStaffId: 'SEC-STAFF-019',
      trustScore: 99,
      verifiedReturnsCount: 42,
      completedHandoversCount: 42,
      positiveFeedbackCount: 40,
      createdAt: hoursAgo(720),
    },
    {
      id: 'usr-admin-4',
      email: 'admin@campus.edu',
      username: 'campus_admin',
      fullName: 'Dr. Vikram Nair (Platform Admin)',
      role: 'admin',
      tier: 3,
      emailVerified: true,
      phoneVerified: true,
      phoneMasked: '+91 ••••• •0001',
      identityVerified: true,
      identityStatus: 'approved',
      institutionName: 'Office of Campus Operations',
      studentOrStaffId: 'ADM-DIR-001',
      trustScore: 100,
      verifiedReturnsCount: 18,
      completedHandoversCount: 18,
      positiveFeedbackCount: 18,
      createdAt: hoursAgo(1000),
    },
  ];

  const passwordHashes: Record<string, string> = {
    'usr-student-1': hashPassword('Findora2026!'),
    'usr-finder-2': hashPassword('Findora2026!'),
    'usr-staff-3': hashPassword('Findora2026!'),
    'usr-admin-4': hashPassword('Findora2026!'),
  };

  // Authorized Custody Desks (User-configured organizational nodes on the campus grid)
  const custodyDesks = [
    {
      id: 'desk-central-lib',
      name: 'Custody Desk A — Central Academic Commons',
      zoneLabel: 'Central Quad & Library Wing',
      floorRoom: 'Ground Floor, Room G-04 (Security Reception)',
      operatingHours: '08:00 – 22:00 Daily',
      supportedHandoverTypes: ['QR Token Scan', '6-Digit OTP Verification', 'High-Value Vault'],
      contactChannel: 'Internal Ext. 4401 · Desk Officer Kiran Rao',
      lat: 37.4275,
      lng: -122.1697,
      activeQueueCount: 3,
    },
    {
      id: 'desk-north-eng',
      name: 'Custody Desk B — North Engineering Complex',
      zoneLabel: 'North Science & Lab Quadrant',
      floorRoom: 'Atrium Level 1, Desk N-102',
      operatingHours: '09:00 – 20:00 (Mon–Sat)',
      supportedHandoverTypes: ['QR Token Scan', '6-Digit OTP Verification'],
      contactChannel: 'Internal Ext. 4408 · North Security Post',
      lat: 37.4292,
      lng: -122.1731,
      activeQueueCount: 2,
    },
    {
      id: 'desk-student-union',
      name: 'Custody Desk C — Student Union & Transit Hub',
      zoneLabel: 'South Student Plaza',
      floorRoom: 'Main Concourse Helpdesk S-01',
      operatingHours: '24/7 Campus Security Post',
      supportedHandoverTypes: ['QR Token Scan', '6-Digit OTP Verification', 'After-Hours Pickup'],
      contactChannel: 'Internal Ext. 4400 · 24h Control Room',
      lat: 37.4248,
      lng: -122.1705,
      activeQueueCount: 1,
    },
  ];

  const reports = [
    {
      id: 'rep-lost-101',
      reporterId: 'usr-student-1',
      reporterName: 'Arjun Mehta',
      reporterTier: 3,
      type: 'lost',
      status: 'matched',
      priority: 'high',
      title: '14-inch MacBook Pro (Space Gray)',
      category: 'Electronics',
      brand: 'Apple',
      model: 'MacBook Pro M3 14"',
      color: 'Space Gray',
      material: 'Anodized Aluminum',
      distinguishingFeatures: 'Hexagonal Rust programming sticker on bottom-right palm rest; braided MagSafe cable in sleeve.',
      description: 'Left on the second-floor quiet study table near the west windows after the afternoon algorithms seminar.',
      serialHint: 'Ends in ••K9Q2',
      hasSecretCharacteristic: false,
      campusZone: 'Central Quad & Library Wing',
      buildingName: 'Central Academic Commons',
      floorOrArea: '2nd Floor Quiet Study Zone',
      approximateLocationLabel: 'Near Central Academic Commons (Approx. 100m privacy radius)',
      locationPrivacy: 'approximate',
      lat: 37.4272,
      lng: -122.1693,
      incidentDate: new Date(now.getTime() - 18 * 3600_000).toISOString().slice(0, 10),
      incidentTimeWindow: '15:30 – 17:00',
      images: [
        {
          id: 'img-101',
          url: createItemSvgDataUrl('14" MacBook Pro M3', 'Space Gray · Hexagonal Sticker on Rest', '#0f172a', '#38bdf8', 'laptop'),
          caption: 'Space Gray 14-inch MacBook Pro with protective charcoal sleeve',
        },
      ],
      flaggedForModeration: false,
      createdAt: hoursAgo(16),
      updatedAt: hoursAgo(14),
    },
    {
      id: 'rep-found-102',
      reporterId: 'usr-finder-2',
      reporterName: 'Priya Sharma',
      reporterTier: 2,
      type: 'found',
      status: 'matched',
      priority: 'high',
      title: 'Space Gray Apple Laptop in Charcoal Sleeve',
      category: 'Electronics',
      brand: 'Apple',
      model: 'MacBook Pro 14-inch',
      color: 'Space Gray',
      material: 'Aluminum / Fabric Sleeve',
      distinguishingFeatures: 'Developer sticker on the inside wrist area; found with a braided charger cord.',
      description: 'Found unattended on a study desk in the Central Academic Commons reading hall around 5:15 PM. Handed over to Custody Desk A.',
      hasSecretCharacteristic: true,
      secretPromptQuestion: 'What specific sticker or engraving is on the inside palm rest, and what are the last 4 characters of the serial number?',
      campusZone: 'Central Quad & Library Wing',
      buildingName: 'Central Academic Commons',
      floorOrArea: 'Reading Room 2B',
      approximateLocationLabel: 'Near Central Academic Commons',
      locationPrivacy: 'approximate',
      lat: 37.4276,
      lng: -122.1699,
      incidentDate: new Date(now.getTime() - 18 * 3600_000).toISOString().slice(0, 10),
      incidentTimeWindow: '17:00 – 17:30',
      designatedCustodyDeskId: 'desk-central-lib',
      images: [
        {
          id: 'img-102',
          url: createItemSvgDataUrl('Found: Apple Laptop 14"', 'Deposited at Custody Desk A', '#0f172a', '#10b981', 'laptop'),
          caption: 'Deposited safely at Custody Desk A — Central Academic Commons',
        },
      ],
      flaggedForModeration: false,
      createdAt: hoursAgo(15),
      updatedAt: hoursAgo(14),
    },
    {
      id: 'rep-lost-103',
      reporterId: 'usr-student-1',
      reporterName: 'Arjun Mehta',
      reporterTier: 3,
      type: 'lost',
      status: 'matched',
      priority: 'high',
      title: 'Dark Brown Stitched Leather Bifold Wallet',
      category: 'Wallets and purses',
      brand: 'Bellroy',
      model: 'Hide & Seek Bifold',
      color: 'Dark Brown',
      material: 'Full-grain leather',
      distinguishingFeatures: 'Embossed owl insignia inside; contains campus transit card and blue library pass.',
      description: 'Dropped somewhere between the North Engineering Complex lecture halls and the courtyard coffee kiosk.',
      hasSecretCharacteristic: false,
      campusZone: 'North Science & Lab Quadrant',
      buildingName: 'North Engineering Complex',
      floorOrArea: 'Ground Floor Walkway',
      approximateLocationLabel: 'Near North Engineering Complex',
      locationPrivacy: 'approximate',
      lat: 37.4290,
      lng: -122.1728,
      incidentDate: new Date(now.getTime() - 36 * 3600_000).toISOString().slice(0, 10),
      incidentTimeWindow: '11:00 – 13:00',
      images: [
        {
          id: 'img-103',
          url: createItemSvgDataUrl('Bellroy Leather Wallet', 'Dark Brown · Stitched Bifold', '#1c1917', '#f59e0b', 'wallet'),
          caption: 'Dark brown stitched leather wallet',
        },
      ],
      flaggedForModeration: false,
      createdAt: hoursAgo(34),
      updatedAt: hoursAgo(30),
    },
    {
      id: 'rep-found-104',
      reporterId: 'usr-staff-3',
      reporterName: 'Officer Kiran Rao (Custody Desk)',
      reporterTier: 3,
      type: 'found',
      status: 'matched',
      priority: 'high',
      title: 'Brown Leather Bifold Wallet with Transit Pass',
      category: 'Wallets and purses',
      brand: 'Bellroy',
      model: 'Bifold',
      color: 'Dark Brown',
      material: 'Leather',
      distinguishingFeatures: 'Turned in at North Engineering Desk; contains transit pass and university library card.',
      description: 'Found near the North Engineering courtyard bench at 12:40 PM and logged into Custody Desk B.',
      hasSecretCharacteristic: true,
      secretPromptQuestion: 'What specific animal emblem is embossed inside the hidden flap, and what are the last 3 digits on the library card?',
      campusZone: 'North Science & Lab Quadrant',
      buildingName: 'North Engineering Complex',
      floorOrArea: 'Courtyard Bench Area',
      approximateLocationLabel: 'Near North Engineering Complex',
      locationPrivacy: 'approximate',
      lat: 37.4293,
      lng: -122.1732,
      incidentDate: new Date(now.getTime() - 36 * 3600_000).toISOString().slice(0, 10),
      incidentTimeWindow: '12:30 – 13:15',
      designatedCustodyDeskId: 'desk-north-eng',
      images: [
        {
          id: 'img-104',
          url: createItemSvgDataUrl('Found: Brown Leather Wallet', 'Secured at Custody Desk B', '#1c1917', '#10b981', 'wallet'),
          caption: 'Held in locked drawer at Custody Desk B',
        },
      ],
      flaggedForModeration: false,
      createdAt: hoursAgo(32),
      updatedAt: hoursAgo(30),
    },
    {
      id: 'rep-found-105',
      reporterId: 'usr-finder-2',
      reporterName: 'Priya Sharma',
      reporterTier: 2,
      type: 'found',
      status: 'unresolved',
      priority: 'medium',
      title: 'Matte Navy Hydro Flask 32oz with National Park Band',
      category: 'Water bottles',
      brand: 'Hydro Flask',
      model: '32oz Wide Mouth',
      color: 'Navy Blue',
      material: 'Stainless Steel',
      distinguishingFeatures: 'Silicone boot on bottom and a woven mountain band around the neck.',
      description: 'Found on the bleachers in the South Student Plaza amphitheater after the evening club meet.',
      hasSecretCharacteristic: true,
      secretPromptQuestion: 'What initials are written in silver marker underneath the silicone bottom boot?',
      campusZone: 'South Student Plaza',
      buildingName: 'Student Union & Transit Hub',
      floorOrArea: 'Amphitheater Steps',
      approximateLocationLabel: 'Near Student Union & Transit Hub',
      locationPrivacy: 'approximate',
      lat: 37.4251,
      lng: -122.1709,
      incidentDate: new Date(now.getTime() - 10 * 3600_000).toISOString().slice(0, 10),
      incidentTimeWindow: '18:00 – 19:30',
      designatedCustodyDeskId: 'desk-student-union',
      images: [
        {
          id: 'img-105',
          url: createItemSvgDataUrl('Matte Navy Hydro Flask 32oz', 'Found at South Student Plaza', '#172554', '#38bdf8', 'bottle'),
          caption: '32oz Navy Blue insulated bottle at Custody Desk C',
        },
      ],
      flaggedForModeration: false,
      createdAt: hoursAgo(9),
      updatedAt: hoursAgo(9),
    },
    {
      id: 'rep-lost-106',
      reporterId: 'usr-finder-2',
      reporterName: 'Priya Sharma',
      reporterTier: 2,
      type: 'lost',
      status: 'unresolved',
      priority: 'high',
      title: 'Keyring with Brass Dorm Key & Blue AirTag Holder',
      category: 'Keys',
      brand: 'Assa Abloy / Apple',
      model: 'Dorm Key + Keyring',
      color: 'Brass and Cobalt Blue',
      material: 'Metal & Silicone',
      distinguishingFeatures: 'Three keys on a black carabiner with a cobalt blue silicone tracker holder.',
      description: 'Lost along the bike path between the Student Union and Central Academic Commons.',
      hasSecretCharacteristic: false,
      campusZone: 'South Student Plaza',
      buildingName: 'Student Union Walkway',
      floorOrArea: 'East Bike Rack',
      approximateLocationLabel: 'Near Student Union Walkway (Approx. location for security)',
      locationPrivacy: 'approximate',
      lat: 37.4261,
      lng: -122.1701,
      incidentDate: new Date(now.getTime() - 6 * 3600_000).toISOString().slice(0, 10),
      incidentTimeWindow: '09:00 – 10:30',
      images: [
        {
          id: 'img-106',
          url: createItemSvgDataUrl('Carabiner Keyring + Blue Tag', '3 Keys · Approx. Location Only', '#0f172a', '#f43f5e', 'keys'),
          caption: 'Keyring illustration',
        },
      ],
      flaggedForModeration: false,
      createdAt: hoursAgo(5),
      updatedAt: hoursAgo(5),
    },
  ];

  // Private ownership evidence kept strictly on the backend (NEVER returned in public report APIs)
  const secretEvidence: Record<string, { secretCharacteristic: string; secretPromptQuestion: string }> = {
    'rep-found-102': {
      secretCharacteristic: 'Hexagonal orange Rust crab sticker on right palm rest, serial ends in K9Q2',
      secretPromptQuestion: 'What specific sticker or engraving is on the inside palm rest, and what are the last 4 characters of the serial number?',
    },
    'rep-found-104': {
      secretCharacteristic: 'Embossed owl emblem inside flap, library card ends in 749',
      secretPromptQuestion: 'What specific animal emblem is embossed inside the hidden flap, and what are the last 3 digits on the library card?',
    },
    'rep-found-105': {
      secretCharacteristic: 'Initials R.K. written in silver marker under the black silicone boot',
      secretPromptQuestion: 'What initials are written in silver marker underneath the silicone bottom boot?',
    },
  };

  // Pre-approved claim on the Wallet so judges can immediately test the QR/OTP Handover scanner OR approve the pending Laptop claim!
  const claims = [
    {
      id: 'clm-201',
      matchId: 'match-rep-lost-101-rep-found-102',
      lostReportId: 'rep-lost-101',
      foundReportId: 'rep-found-102',
      foundReportTitle: 'Space Gray Apple Laptop in Charcoal Sleeve',
      claimantId: 'usr-student-1',
      claimantName: 'Arjun Mehta',
      claimantTier: 3,
      finderId: 'usr-finder-2',
      secretCharacteristicAnswer: 'Hexagonal orange Rust crab sticker on the right palm rest, and the serial number ends in K9Q2.',
      additionalOwnershipProof: 'Can unlock the macOS login screen at the desk and show matching AppleCare receipt.',
      automatedEvidenceSimilarity: 92,
      status: 'under_review',
      custodyDeskId: 'desk-central-lib',
      pickupWindow: 'Today, 14:00 – 18:00',
      createdAt: hoursAgo(12),
      updatedAt: hoursAgo(12),
    },
    {
      id: 'clm-202',
      matchId: 'match-rep-lost-103-rep-found-104',
      lostReportId: 'rep-lost-103',
      foundReportId: 'rep-found-104',
      foundReportTitle: 'Brown Leather Bifold Wallet with Transit Pass',
      claimantId: 'usr-student-1',
      claimantName: 'Arjun Mehta',
      claimantTier: 3,
      finderId: 'usr-staff-3',
      secretCharacteristicAnswer: 'Embossed owl emblem inside the coin flap; library card ends in 749.',
      additionalOwnershipProof: 'Student ID card name matches transit pass registration.',
      automatedEvidenceSimilarity: 95,
      status: 'approved',
      reviewerNotes: 'Verified secret owl emblem and library card digits. Approved for Custody Desk B pickup.',
      reviewedBy: 'Officer Kiran Rao (Custody Desk)',
      custodyDeskId: 'desk-north-eng',
      pickupWindow: 'Today, 10:00 – 19:00',
      handoverOtp: '849204',
      handoverToken: 'FND-HANDOVER-849204-A9F3C1E2',
      handoverExpiresAt: new Date(now.getTime() + 24 * 3600_000).toISOString(),
      createdAt: hoursAgo(28),
      updatedAt: hoursAgo(6),
    },
  ];

  const conversations = [
    {
      id: 'conv-301',
      reportId: 'rep-found-102',
      reportTitle: 'Space Gray Apple Laptop in Charcoal Sleeve',
      claimId: 'clm-201',
      participantIds: ['usr-student-1', 'usr-finder-2', 'usr-staff-3'],
      participantNames: ['Arjun Mehta', 'Priya Sharma', 'Officer Kiran Rao (Custody Desk)'],
      status: 'active',
      unreadCount: 1,
      lastMessageText: 'I have deposited the laptop with Officer Kiran at Custody Desk A (Central Academic Commons).',
      updatedAt: hoursAgo(11),
    },
  ];

  const messages = [
    {
      id: 'msg-1',
      conversationId: 'conv-301',
      senderId: 'usr-student-1',
      senderName: 'Arjun Mehta',
      senderRole: 'verified',
      senderTier: 3,
      text: 'Hi Priya! Thank you so much for reporting the found 14" MacBook Pro. I submitted my ownership claim with the sticker and serial details.',
      createdAt: hoursAgo(12),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-301',
      senderId: 'usr-finder-2',
      senderName: 'Priya Sharma',
      senderRole: 'verified',
      senderTier: 2,
      text: 'Glad Findora matched our reports! I have deposited the laptop with Officer Kiran at Custody Desk A (Central Academic Commons).',
      createdAt: hoursAgo(11),
    },
  ];

  const notifications = [
    {
      id: 'notif-1',
      userId: 'usr-student-1',
      type: 'match',
      title: '94% Match Found for 14-inch MacBook Pro',
      body: 'A found report near Central Academic Commons strongly matches your lost MacBook Pro across 5 signals.',
      linkView: 'matches',
      linkTargetId: 'match-rep-lost-101-rep-found-102',
      read: false,
      createdAt: hoursAgo(14),
    },
    {
      id: 'notif-2',
      userId: 'usr-student-1',
      type: 'handover',
      title: 'Claim Approved — Pickup QR & OTP Ready',
      body: 'Your claim for Brown Leather Bifold Wallet is approved. Present OTP 849204 at Custody Desk B.',
      linkView: 'claims',
      linkTargetId: 'clm-202',
      read: false,
      createdAt: hoursAgo(6),
    },
    {
      id: 'notif-3',
      userId: 'usr-finder-2',
      type: 'claim',
      title: 'Ownership Claim Submitted on Your Found Report',
      body: 'Arjun Mehta (Tier 3 Verified) submitted an ownership claim for Space Gray Apple Laptop.',
      linkView: 'claims',
      linkTargetId: 'clm-201',
      read: false,
      createdAt: hoursAgo(12),
    },
  ];

  const verificationRequests = [
    {
      id: 'ver-req-1',
      userId: 'usr-finder-2',
      userName: 'Priya Sharma',
      userEmail: 'priya.sharma@campus.edu',
      tier: 3,
      institutionName: 'National Institute of Technology Campus',
      studentOrStaffId: 'NIT-EE-2026-1190',
      documentReference: 'PRIVATE-VAULT://id-submissions/2026/nit-ee-1190-encrypted.bin',
      documentRetentionPolicy: 'Auto-purge encrypted document binary immediately upon verification decision.',
      documentDeletedAfterReview: false,
      status: 'pending',
      createdAt: hoursAgo(8),
    },
  ];

  const disputes = [
    {
      id: 'disp-1',
      claimId: 'clm-201',
      reportId: 'rep-found-102',
      raisedByUserId: 'usr-student-1',
      raisedByName: 'Arjun Mehta',
      reason: 'Requesting priority custody desk review before evening lab exam at 18:00.',
      status: 'open',
      createdAt: hoursAgo(4),
    },
  ];

  const auditLogs = [
    {
      id: 'aud-1',
      actorId: 'usr-staff-3',
      actorName: 'Officer Kiran Rao (Custody Desk)',
      actorRole: 'custody_staff',
      action: 'CLAIM_APPROVED_TOKEN_ISSUED',
      targetType: 'claim',
      targetId: 'clm-202',
      summary: 'Approved ownership claim clm-202 for Brown Leather Bifold Wallet and issued one-time handover token.',
      createdAt: hoursAgo(6),
    },
    {
      id: 'aud-2',
      actorId: 'usr-admin-4',
      actorName: 'Dr. Vikram Nair (Platform Admin)',
      actorRole: 'admin',
      action: 'TIER3_IDENTITY_APPROVED',
      targetType: 'user',
      targetId: 'usr-student-1',
      summary: 'Verified institutional ID NIT-CS-2026-0842 for Arjun Mehta and purged raw ID artifact per retention policy.',
      createdAt: hoursAgo(200),
    },
  ];

  const db: DbSchema = {
    users,
    passwordHashes,
    sessions: {
      'demo-token-student': 'usr-student-1',
      'demo-token-finder': 'usr-finder-2',
      'demo-token-staff': 'usr-staff-3',
      'demo-token-admin': 'usr-admin-4',
    },
    verificationCodes: {},
    reports,
    secretEvidence,
    matches: [],
    claims,
    custodyDesks,
    conversations,
    messages,
    notifications,
    verificationRequests,
    disputes,
    auditLogs,
  };

  recomputeAllMatches(db);
  return db;
}

// Haversine distance in meters
function computeDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'with', 'near', 'from', 'for', 'was', 'found', 'lost'].includes(w));
}

function calculateTokenOverlap(a: string, b: string): { ratio: number; shared: string[] } {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return { ratio: 0, shared: [] };
  const shared: string[] = [];
  for (const t of tokensA) {
    if (tokensB.has(t)) shared.push(t);
  }
  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return { ratio: shared.length / Math.max(1, Math.min(tokensA.size, tokensB.size, unionSize)), shared };
}

// Explainable Multi-Signal Matching Engine
// Weights: Category 25%, Appearance 20%, Location 20%, Timeline 15%, Description 20%
function computePairMatch(lost: any, found: any, existingStatus?: string): any | null {
  if (lost.status === 'returned' || found.status === 'returned') return null;
  if (lost.archived || found.archived) return null;

  const explanations: string[] = [];

  // 1. Category (25%)
  let categoryScore = 0;
  if (lost.category === found.category) {
    categoryScore = 25;
    explanations.push(`Identical item category: ${lost.category}`);
  } else {
    return null; // Incompatible category
  }

  // 2. Appearance: Color, Brand, Model, Material (20%)
  let appearanceScore = 0;
  const lostColor = (lost.color || '').toLowerCase();
  const foundColor = (found.color || '').toLowerCase();
  if (lostColor && foundColor && (lostColor.includes(foundColor) || foundColor.includes(lostColor))) {
    appearanceScore += 9;
    explanations.push(`Matching color profile: ${lost.color}`);
  }
  const lostBrand = (lost.brand || '').toLowerCase();
  const foundBrand = (found.brand || '').toLowerCase();
  if (lostBrand && foundBrand && (lostBrand.includes(foundBrand) || foundBrand.includes(lostBrand))) {
    appearanceScore += 7;
    explanations.push(`Matching brand: ${lost.brand}`);
  }
  const modelOverlap = calculateTokenOverlap(`${lost.model} ${lost.material}`, `${found.model} ${found.material}`);
  if (modelOverlap.ratio > 0) {
    appearanceScore += Math.min(4, Math.round(modelOverlap.ratio * 4));
  }

  // 3. Location Proximity (20%)
  const distanceMeters = computeDistanceMeters(lost.lat, lost.lng, found.lat, found.lng);
  let locationScore = 0;
  if (distanceMeters <= 120) {
    locationScore = 20;
    explanations.push(`Very close proximity (${distanceMeters}m apart near ${lost.buildingName || lost.campusZone})`);
  } else if (distanceMeters <= 350) {
    locationScore = 16;
    explanations.push(`Nearby campus locations (${distanceMeters}m apart)`);
  } else if (distanceMeters <= 800) {
    locationScore = 10;
    explanations.push(`Within the same campus sector (${distanceMeters}m distance)`);
  } else if (distanceMeters <= 2000) {
    locationScore = 5;
  }

  // 4. Incident Timeline Compatibility (15%)
  const d1 = new Date(lost.incidentDate || lost.createdAt).getTime();
  const d2 = new Date(found.incidentDate || found.createdAt).getTime();
  const timeDeltaHours = Math.round(Math.abs(d2 - d1) / 3600_000);
  let timelineScore = 0;
  if (timeDeltaHours <= 24) {
    timelineScore = 15;
    explanations.push(`Incident dates align on ${lost.incidentDate}`);
  } else if (timeDeltaHours <= 72) {
    timelineScore = 11;
    explanations.push(`Compatible timeframe within ${Math.ceil(timeDeltaHours / 24)} days`);
  } else if (timeDeltaHours <= 168) {
    timelineScore = 6;
  }

  // 5. Distinguishing Description Similarity (20%)
  const descA = `${lost.title} ${lost.distinguishingFeatures} ${lost.description}`;
  const descB = `${found.title} ${found.distinguishingFeatures} ${found.description}`;
  const descOverlap = calculateTokenOverlap(descA, descB);
  const descriptionScore = Math.min(20, Math.round(descOverlap.ratio * 22));
  if (descOverlap.shared.length > 0) {
    explanations.push(`Shared descriptive traits: "${descOverlap.shared.slice(0, 5).join(', ')}"`);
  }

  const totalScore = Math.min(99, categoryScore + appearanceScore + locationScore + timelineScore + descriptionScore);
  if (totalScore < 45) return null;

  return {
    id: `match-${lost.id}-${found.id}`,
    lostReportId: lost.id,
    foundReportId: found.id,
    totalScore,
    breakdown: {
      categoryScore,
      appearanceScore,
      locationScore,
      timelineScore,
      descriptionScore,
    },
    explanations,
    distanceMeters,
    timeDeltaHours,
    status: existingStatus || 'suggested',
    createdAt: new Date().toISOString(),
  };
}

function recomputeAllMatches(db: DbSchema) {
  const existingMap = new Map<string, any>();
  for (const m of db.matches) {
    existingMap.set(m.id, m);
  }

  const lostList = db.reports.filter((r) => r.type === 'lost');
  const foundList = db.reports.filter((r) => r.type === 'found');
  const nextMatches: any[] = [];

  for (const lost of lostList) {
    for (const found of foundList) {
      const id = `match-${lost.id}-${found.id}`;
      const prev = existingMap.get(id);
      const computed = computePairMatch(lost, found, prev?.status);
      if (computed) {
        if (prev?.aiInsight) computed.aiInsight = prev.aiInsight;
        nextMatches.push(computed);
      }
    }
  }

  nextMatches.sort((a, b) => b.totalScore - a.totalScore);
  db.matches = nextMatches;
}

function loadDb(): DbSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw) as DbSchema;
  } catch {
    const initial = getInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

function saveDb(db: DbSchema) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

const db = loadDb();

// Helper to sanitize reports so secret characteristics are NEVER leaked
function sanitizeReportForPublic(report: any) {
  const copy = { ...report };
  delete copy.secretCharacteristic;
  return copy;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Auth middleware helper
  const getAuthenticatedUser = (req: Request): any | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    const userId = db.sessions[token];
    if (!userId) return null;
    return db.users.find((u) => u.id === userId) || null;
  };

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    (req as any).user = user;
    next();
  };

  // --- AUTHENTICATION ROUTES ---
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }
    res.json({ user });
  });

  app.post('/api/auth/login', (req, res) => {
    const { identifier, password, demoRole } = req.body;

    // Support instant role switching for hackathon evaluation OR real email/username + password verification
    if (demoRole) {
      const roleMap: Record<string, { userId: string; token: string }> = {
        student: { userId: 'usr-student-1', token: 'demo-token-student' },
        finder: { userId: 'usr-finder-2', token: 'demo-token-finder' },
        staff: { userId: 'usr-staff-3', token: 'demo-token-staff' },
        admin: { userId: 'usr-admin-4', token: 'demo-token-admin' },
      };
      const target = roleMap[demoRole];
      if (target) {
        const user = db.users.find((u) => u.id === target.userId);
        db.sessions[target.token] = target.userId;
        saveDb(db);
        res.json({ token: target.token, user });
        return;
      }
    }

    const cleanId = (identifier || '').trim().toLowerCase();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );
    if (!user) {
      res.status(401).json({ error: 'No account found with that email or username.' });
      return;
    }

    const expectedHash = db.passwordHashes[user.id];
    const suppliedHash = hashPassword(password || '');
    if (expectedHash && expectedHash !== suppliedHash) {
      res.status(401).json({ error: 'Invalid credentials. Please verify your password.' });
      return;
    }

    const token = `sess-${crypto.randomBytes(16).toString('hex')}`;
    db.sessions[token] = user.id;
    saveDb(db);
    res.json({ token, user });
  });

  app.post('/api/auth/register', (req, res) => {
    const { email, username, fullName, password, institutionName } = req.body;
    if (!email || !username || !fullName || !password || password.length < 6) {
      res.status(400).json({ error: 'Full name, email, username, and a password (min 6 chars) are required.' });
      return;
    }
    const exists = db.users.some(
      (u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
    );
    if (exists) {
      res.status(409).json({ error: 'An account with this email or username already exists.' });
      return;
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      email: email.trim(),
      username: username.trim(),
      fullName: fullName.trim(),
      role: 'standard',
      tier: 0,
      emailVerified: false,
      phoneVerified: false,
      identityVerified: false,
      identityStatus: 'none',
      institutionName: institutionName || 'Campus Community',
      trustScore: 50,
      verifiedReturnsCount: 0,
      completedHandoversCount: 0,
      positiveFeedbackCount: 0,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.passwordHashes[newUser.id] = hashPassword(password);
    const token = `sess-${crypto.randomBytes(16).toString('hex')}`;
    db.sessions[token] = newUser.id;
    saveDb(db);

    res.status(201).json({ token, user: newUser });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (!token.startsWith('demo-token-')) {
        delete db.sessions[token];
        saveDb(db);
      }
    }
    res.json({ ok: true });
  });

  app.post('/api/profile/update', requireAuth, (req, res) => {
    const user = (req as any).user;
    const { fullName, username, institutionName } = req.body;
    if (!fullName || !String(fullName).trim()) {
      res.status(400).json({ error: 'Full name cannot be empty.' });
      return;
    }
    if (username && String(username).trim()) {
      const cleanUsername = String(username).trim();
      const conflict = db.users.some(
        (u) => u.id !== user.id && u.username.toLowerCase() === cleanUsername.toLowerCase()
      );
      if (conflict) {
        res.status(409).json({ error: 'That username is already taken by another campus member.' });
        return;
      }
      user.username = cleanUsername;
    }
    user.fullName = String(fullName).trim();
    if (institutionName !== undefined) {
      user.institutionName = String(institutionName).trim() || user.institutionName;
    }

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PROFILE_UPDATED',
      targetType: 'user',
      targetId: user.id,
      summary: `Updated account profile settings (${user.fullName} · ${user.institutionName}).`,
      createdAt: new Date().toISOString(),
    });

    saveDb(db);
    res.json({ user, message: 'Account profile and institutional settings saved.' });
  });

  // --- THREE-TIER IDENTITY VERIFICATION ROUTES ---
  app.post('/api/verification/send-email-code', requireAuth, (req, res) => {
    const user = (req as any).user;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.verificationCodes[user.id] = {
      ...db.verificationCodes[user.id],
      emailCode: code,
      expiresAt: Date.now() + 10 * 60_000,
      attempts: 0,
    };
    saveDb(db);
    res.json({
      message: `One-time verification code generated for ${user.email}.`,
      verificationInboxCode: code, // Surfaced in Verification Center Inbox when SMTP is not configured
      expiresInMinutes: 10,
    });
  });

  app.post('/api/verification/verify-email', requireAuth, (req, res) => {
    const user = (req as any).user;
    const { code } = req.body;
    const record = db.verificationCodes[user.id];
    if (!record || !record.emailCode) {
      res.status(400).json({ error: 'Please request a verification code first.' });
      return;
    }
    if (Date.now() > record.expiresAt) {
      res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }
    record.attempts += 1;
    if (record.attempts > 5) {
      res.status(429).json({ error: 'Too many verification attempts. Please request a fresh code.' });
      return;
    }
    if (String(code).trim() !== record.emailCode) {
      saveDb(db);
      res.status(400).json({ error: 'Incorrect email verification code.' });
      return;
    }

    user.emailVerified = true;
    if (user.tier < 1) user.tier = 1;
    user.trustScore = Math.min(100, user.trustScore + 10);
    delete record.emailCode;

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: user.id,
      type: 'verification',
      title: 'Tier 1: Campus Email Verified',
      body: `Your email (${user.email}) is now verified.`,
      linkView: 'verification',
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ user });
  });

  app.post('/api/verification/send-phone-otp', requireAuth, (req, res) => {
    const user = (req as any).user;
    const { phone } = req.body;
    if (!phone || String(phone).replace(/\D/g, '').length < 8) {
      res.status(400).json({ error: 'Please provide a valid mobile number.' });
      return;
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const digits = String(phone).replace(/\D/g, '');
    user.phoneMasked = `+${digits.slice(0, 2)} ••••• •${digits.slice(-4)}`;
    db.verificationCodes[user.id] = {
      ...db.verificationCodes[user.id],
      phoneOtp: otp,
      expiresAt: Date.now() + 10 * 60_000,
      attempts: 0,
    };
    saveDb(db);
    res.json({
      message: `6-digit SMS OTP issued for ${user.phoneMasked}.`,
      verificationInboxOtp: otp,
      expiresInMinutes: 10,
    });
  });

  app.post('/api/verification/verify-phone', requireAuth, (req, res) => {
    const user = (req as any).user;
    const { otp } = req.body;
    const record = db.verificationCodes[user.id];
    if (!record || !record.phoneOtp) {
      res.status(400).json({ error: 'Please request an SMS OTP first.' });
      return;
    }
    if (Date.now() > record.expiresAt) {
      res.status(400).json({ error: 'OTP expired. Request a new code.' });
      return;
    }
    record.attempts += 1;
    if (record.attempts > 5) {
      res.status(429).json({ error: 'OTP retry limit exceeded. Request a new code.' });
      return;
    }
    if (String(otp).trim() !== record.phoneOtp) {
      saveDb(db);
      res.status(400).json({ error: 'Invalid 6-digit OTP code.' });
      return;
    }

    user.phoneVerified = true;
    if (user.tier < 2) user.tier = 2;
    if (user.role === 'standard') user.role = 'verified';
    user.trustScore = Math.min(100, user.trustScore + 15);
    delete record.phoneOtp;

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: user.id,
      type: 'verification',
      title: 'Tier 2: Phone OTP Verified',
      body: 'You are now eligible to submit Lost and Found reports across campus.',
      linkView: 'verification',
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ user });
  });

  app.post('/api/verification/submit-id', requireAuth, (req, res) => {
    const user = (req as any).user;
    const { institutionName, studentOrStaffId } = req.body;
    if (!institutionName || !studentOrStaffId) {
      res.status(400).json({ error: 'Institution name and Student/Staff ID identifier are required.' });
      return;
    }

    user.institutionName = institutionName.trim();
    user.studentOrStaffId = studentOrStaffId.trim();
    user.identityStatus = 'pending';

    const reqRecord = {
      id: `ver-req-${Date.now()}`,
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      tier: 3 as const,
      institutionName: user.institutionName,
      studentOrStaffId: user.studentOrStaffId,
      documentReference: `PRIVATE-VAULT://id-submissions/2026/${crypto.randomBytes(6).toString('hex')}.enc`,
      documentRetentionPolicy: 'Auto-purge encrypted document binary immediately upon verification decision.',
      documentDeletedAfterReview: false,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
    db.verificationRequests.unshift(reqRecord);
    saveDb(db);

    res.json({ user, verificationRequest: reqRecord });
  });

  // --- REPORTS & MATCHING ROUTES ---
  app.get('/api/bootstrap', (req, res) => {
    const user = getAuthenticatedUser(req);
    const sanitizedReports = db.reports.map(sanitizeReportForPublic);
    const enrichedMatches = db.matches.map((m) => ({
      ...m,
      lostReport: sanitizedReports.find((r) => r.id === m.lostReportId),
      foundReport: sanitizedReports.find((r) => r.id === m.foundReportId),
    }));

    const userClaims = user
      ? db.claims.filter(
          (c) =>
            c.claimantId === user.id ||
            c.finderId === user.id ||
            user.role === 'custody_staff' ||
            user.role === 'admin'
        )
      : [];

    const userNotifications = user
      ? db.notifications.filter((n) => n.userId === user.id)
      : [];

    const userConversations = user
      ? db.conversations.filter(
          (c) => c.participantIds.includes(user.id) || user.role === 'admin' || user.role === 'custody_staff'
        )
      : [];

    res.json({
      user,
      reports: sanitizedReports,
      matches: enrichedMatches,
      claims: userClaims,
      custodyDesks: db.custodyDesks,
      conversations: userConversations,
      messages: user ? db.messages : [],
      notifications: userNotifications,
      verificationRequests: user && (user.role === 'admin' || user.role === 'custody_staff') ? db.verificationRequests : [],
      disputes: user ? db.disputes : [],
      auditLogs: user && (user.role === 'admin' || user.role === 'custody_staff') ? db.auditLogs : [],
      stats: {
        activeLostCount: db.reports.filter((r) => r.type === 'lost' && r.status !== 'returned' && !r.archived).length,
        activeFoundCount: db.reports.filter((r) => r.type === 'found' && r.status !== 'returned' && !r.archived).length,
        matchedCount: db.matches.length,
        returnedCount: db.reports.filter((r) => r.status === 'returned').length,
        custodyDesksCount: db.custodyDesks.length,
      },
    });
  });

  app.post('/api/reports', requireAuth, (req, res) => {
    const user = (req as any).user;
    if (!user.phoneVerified && user.tier < 2) {
      res.status(403).json({
        error: 'Tier 2 Phone Verification is required before submitting Lost or Found reports. Please complete verification in the Verification Center.',
      });
      return;
    }

    const {
      type,
      priority,
      title,
      category,
      brand,
      model,
      color,
      material,
      distinguishingFeatures,
      description,
      serialHint,
      secretCharacteristic,
      secretPromptQuestion,
      campusZone,
      buildingName,
      floorOrArea,
      locationPrivacy,
      lat,
      lng,
      incidentDate,
      incidentTimeWindow,
      designatedCustodyDeskId,
      images,
    } = req.body;

    if (!title || !category || !color || !buildingName) {
      res.status(400).json({ error: 'Item name, category, color, and campus building are required.' });
      return;
    }

    // Duplicate submission check within last 2 minutes
    const duplicate = db.reports.find(
      (r) =>
        r.reporterId === user.id &&
        r.title.toLowerCase() === String(title).trim().toLowerCase() &&
        Date.now() - new Date(r.createdAt).getTime() < 120_000
    );
    if (duplicate) {
      res.status(409).json({ error: 'This report was already submitted moments ago.' });
      return;
    }

    const reportId = `rep-${type}-${Date.now()}`;
    const hasSecret = type === 'found' && Boolean(secretCharacteristic && String(secretCharacteristic).trim());

    const defaultImg = createItemSvgDataUrl(
      String(title).slice(0, 26),
      `${color} · ${buildingName}`,
      type === 'lost' ? '#0f172a' : '#064e3b',
      type === 'lost' ? '#38bdf8' : '#10b981',
      category === 'Electronics' ? 'laptop' : category === 'Wallets and purses' ? 'wallet' : category === 'Water bottles' ? 'bottle' : category === 'Keys' ? 'keys' : 'other'
    );

    const newReport = {
      id: reportId,
      reporterId: user.id,
      reporterName: user.fullName,
      reporterTier: user.tier,
      type: type === 'found' ? 'found' : 'lost',
      status: 'unresolved',
      priority: priority || 'medium',
      title: String(title).trim(),
      category,
      brand: String(brand || '').trim(),
      model: String(model || '').trim(),
      color: String(color).trim(),
      material: String(material || '').trim(),
      distinguishingFeatures: String(distinguishingFeatures || '').trim(),
      description: String(description || '').trim(),
      serialHint: serialHint ? String(serialHint).trim() : undefined,
      hasSecretCharacteristic: hasSecret,
      secretPromptQuestion: hasSecret
        ? String(secretPromptQuestion || 'Please describe the hidden identifying detail or marking on this item.').trim()
        : undefined,
      campusZone: String(campusZone || 'Main Campus').trim(),
      buildingName: String(buildingName).trim(),
      floorOrArea: String(floorOrArea || '').trim(),
      approximateLocationLabel: `Near ${String(buildingName).trim()}`,
      locationPrivacy: locationPrivacy || 'approximate',
      lat: typeof lat === 'number' && !Number.isNaN(lat) ? lat : 37.4275,
      lng: typeof lng === 'number' && !Number.isNaN(lng) ? lng : -122.1697,
      incidentDate: incidentDate || new Date().toISOString().slice(0, 10),
      incidentTimeWindow: incidentTimeWindow || '12:00 – 15:00',
      designatedCustodyDeskId: designatedCustodyDeskId || undefined,
      images:
        Array.isArray(images) && images.length > 0
          ? images
          : [{ id: `img-${Date.now()}`, url: defaultImg, caption: `${title} (${color})` }],
      flaggedForModeration: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (hasSecret) {
      db.secretEvidence[reportId] = {
        secretCharacteristic: String(secretCharacteristic).trim(),
        secretPromptQuestion: newReport.secretPromptQuestion!,
      };
    }

    db.reports.unshift(newReport);
    recomputeAllMatches(db);

    // Check newly generated matches for this report
    const newMatches = db.matches.filter(
      (m) => m.lostReportId === reportId || m.foundReportId === reportId
    );
    if (newMatches.length > 0) {
      newReport.status = 'matched';
      for (const m of newMatches) {
        const otherId = m.lostReportId === reportId ? m.foundReportId : m.lostReportId;
        const otherReport = db.reports.find((r) => r.id === otherId);
        if (otherReport && otherReport.status === 'unresolved') {
          otherReport.status = 'matched';
        }
        db.notifications.unshift({
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId: user.id,
          type: 'match',
          title: `${m.totalScore}% Potential Match Identified!`,
          body: `Your report "${newReport.title}" matched with "${otherReport?.title || 'a campus report'}".`,
          linkView: 'matches',
          linkTargetId: m.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    saveDb(db);
    res.status(201).json({
      report: sanitizeReportForPublic(newReport),
      matchesFoundCount: newMatches.length,
    });
  });

  app.post('/api/matches/:id/status', requireAuth, (req, res) => {
    const { status } = req.body;
    const match = db.matches.find((m) => m.id === req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match record not found.' });
      return;
    }
    if (['suggested', 'under_review', 'confirmed', 'dismissed'].includes(status)) {
      match.status = status;
      const lostRep = db.reports.find((r) => r.id === match.lostReportId);
      const foundRep = db.reports.find((r) => r.id === match.foundReportId);
      if (status === 'confirmed') {
        if (lostRep && lostRep.status === 'unresolved') lostRep.status = 'matched';
        if (foundRep && foundRep.status === 'unresolved') foundRep.status = 'matched';
      }
      saveDb(db);
    }
    res.json({ match });
  });

  // Canvas Protocol Zone 3: Run/Refresh Multi-Signal Match Analysis for a specific dropped report card
  app.post('/api/matches/analyze/:reportId', requireAuth, (req, res) => {
    const user = (req as any).user;
    const report = db.reports.find((r) => r.id === req.params.reportId);
    if (!report) {
      res.status(404).json({ error: 'Report card not found in database.' });
      return;
    }
    recomputeAllMatches(db);
    const sanitizedReports = db.reports.map(sanitizeReportForPublic);
    const candidateMatches = db.matches
      .filter((m) => m.lostReportId === report.id || m.foundReportId === report.id)
      .map((m) => ({
        ...m,
        lostReport: sanitizedReports.find((r) => r.id === m.lostReportId),
        foundReport: sanitizedReports.find((r) => r.id === m.foundReportId),
      }));

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'CANVAS_MATCH_ANALYSIS_RUN',
      targetType: 'report',
      targetId: report.id,
      summary: `Executed multi-signal match analysis via Canvas Zone 3 for "${report.title}" (${candidateMatches.length} candidate matches).`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);

    res.json({
      report: sanitizeReportForPublic(report),
      matches: candidateMatches,
    });
  });

  // Canvas Protocol Zone 7: Archive or Restore a Report Card (with ownership & status checks)
  app.post('/api/reports/:id/archive', requireAuth, (req, res) => {
    const user = (req as any).user;
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    const isOwner = report.reporterId === user.id;
    const isStaffOrAdmin = user.role === 'admin' || user.role === 'custody_staff';
    if (!isOwner && !isStaffOrAdmin) {
      res.status(403).json({
        error: 'Permission Denied: You can only archive your own reports unless you are authorized staff/admin.',
      });
      return;
    }
    if (report.status === 'returned') {
      res.status(400).json({
        error: 'Completed return records are part of the permanent custody audit trail and cannot be deleted.',
      });
      return;
    }

    report.archived = true;
    report.archivedAt = new Date().toISOString();
    report.updatedAt = new Date().toISOString();
    recomputeAllMatches(db);

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REPORT_ARCHIVED_VIA_CANVAS',
      targetType: 'report',
      targetId: report.id,
      summary: `Archived ${report.type} report "${report.title}" (${report.id}) via Canvas Archive Zone.`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);

    res.json({ report: sanitizeReportForPublic(report) });
  });

  app.post('/api/reports/:id/restore', requireAuth, (req, res) => {
    const user = (req as any).user;
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    const isOwner = report.reporterId === user.id;
    const isStaffOrAdmin = user.role === 'admin' || user.role === 'custody_staff';
    if (!isOwner && !isStaffOrAdmin) {
      res.status(403).json({ error: 'Permission Denied: Not authorized to restore this report.' });
      return;
    }

    report.archived = false;
    delete report.archivedAt;
    report.updatedAt = new Date().toISOString();
    recomputeAllMatches(db);

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REPORT_RESTORED_VIA_CANVAS',
      targetType: 'report',
      targetId: report.id,
      summary: `Restored archived ${report.type} report "${report.title}" (${report.id}) to active canvas.`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);

    res.json({ report: sanitizeReportForPublic(report) });
  });

  // --- CLAIMS & OWNERSHIP VERIFICATION ROUTES ---
  app.post('/api/claims', requireAuth, (req, res) => {
    const user = (req as any).user;
    if (user.tier < 2) {
      res.status(403).json({ error: 'At least Tier 2 verification is required to submit an ownership claim.' });
      return;
    }

    const { matchId, lostReportId, foundReportId, secretCharacteristicAnswer, additionalOwnershipProof, custodyDeskId, pickupWindow } = req.body;
    const foundReport = db.reports.find((r) => r.id === foundReportId && r.type === 'found');
    if (!foundReport) {
      res.status(404).json({ error: 'Target found-item report does not exist.' });
      return;
    }
    if (foundReport.status === 'returned') {
      res.status(400).json({ error: 'This item has already been returned to its verified owner.' });
      return;
    }
    if (!secretCharacteristicAnswer || String(secretCharacteristicAnswer).trim().length < 4) {
      res.status(400).json({ error: 'Please provide specific identifying details to verify ownership.' });
      return;
    }

    // Compare claimant's answer against private server-side secret characteristic
    const secretRecord = db.secretEvidence[foundReport.id];
    let automatedEvidenceSimilarity = 65;
    if (secretRecord) {
      const overlap = calculateTokenOverlap(secretRecord.secretCharacteristic, secretCharacteristicAnswer);
      automatedEvidenceSimilarity = Math.min(98, Math.max(25, Math.round(overlap.ratio * 100)));
    }

    const newClaim = {
      id: `clm-${Date.now()}`,
      matchId,
      lostReportId,
      foundReportId: foundReport.id,
      foundReportTitle: foundReport.title,
      claimantId: user.id,
      claimantName: user.fullName,
      claimantTier: user.tier,
      finderId: foundReport.reporterId,
      secretCharacteristicAnswer: String(secretCharacteristicAnswer).trim(),
      additionalOwnershipProof: String(additionalOwnershipProof || '').trim(),
      automatedEvidenceSimilarity,
      status: 'under_review',
      custodyDeskId: custodyDeskId || foundReport.designatedCustodyDeskId || db.custodyDesks[0].id,
      pickupWindow: pickupWindow || 'Next Available Window (10:00 – 18:00)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.claims.unshift(newClaim);

    // Also ensure a chat conversation exists between claimant and finder/custody staff
    let conv = db.conversations.find((c) => c.reportId === foundReport.id && c.participantIds.includes(user.id));
    if (!conv) {
      conv = {
        id: `conv-${Date.now()}`,
        reportId: foundReport.id,
        reportTitle: foundReport.title,
        claimId: newClaim.id,
        participantIds: Array.from(new Set([user.id, foundReport.reporterId, 'usr-staff-3'])),
        participantNames: Array.from(new Set([user.fullName, foundReport.reporterName, 'Officer Kiran Rao (Custody Desk)'])),
        status: 'active',
        unreadCount: 1,
        lastMessageText: `Ownership claim submitted by ${user.fullName}.`,
        updatedAt: new Date().toISOString(),
      };
      db.conversations.unshift(conv);
    }

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: foundReport.reporterId,
      type: 'claim',
      title: `New Claim on ${foundReport.title}`,
      body: `${user.fullName} submitted ownership evidence for review.`,
      linkView: 'claims',
      linkTargetId: newClaim.id,
      read: false,
      createdAt: new Date().toISOString(),
    });

    saveDb(db);
    res.status(201).json({ claim: newClaim });
  });

  app.post('/api/claims/:id/review', requireAuth, (req, res) => {
    const user = (req as any).user;
    const { decision, reviewerNotes } = req.body;
    const claim = db.claims.find((c) => c.id === req.params.id);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }

    // Security check: Only finder, custody_staff, or admin can review. A standard/verified user cannot self-approve their own claim!
    const isAuthorizedStaffOrAdmin = user.role === 'custody_staff' || user.role === 'admin';
    const isFinder = user.id === claim.finderId;
    if (!isAuthorizedStaffOrAdmin && !isFinder) {
      res.status(403).json({ error: 'Only the item finder, authorized custody staff, or an administrator can review this claim.' });
      return;
    }
    if (claim.claimantId === user.id && !isAuthorizedStaffOrAdmin) {
      res.status(403).json({ error: 'Security Policy: You cannot self-approve your own ownership claim.' });
      return;
    }

    if (decision === 'approved') {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
      claim.status = 'approved';
      claim.handoverOtp = otp;
      claim.handoverToken = `FND-HANDOVER-${otp}-${randomHex}`;
      // Short-lived pickup token (valid for 30 minutes by default)
      claim.handoverExpiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
      claim.reviewerNotes = reviewerNotes || 'Ownership evidence verified. Short-lived pickup QR & OTP generated.';
      claim.reviewedBy = user.fullName;
      claim.updatedAt = new Date().toISOString();

      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: claim.claimantId,
        type: 'handover',
        title: `Claim Approved — Handover OTP: ${otp}`,
        body: `Your ownership claim for "${claim.foundReportTitle}" is approved. Present your short-lived QR token or 6-digit OTP at the Custody Desk.`,
        linkView: 'claims',
        linkTargetId: claim.id,
        read: false,
        createdAt: new Date().toISOString(),
      });

      db.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        action: 'CLAIM_APPROVED_TOKEN_ISSUED',
        targetType: 'claim',
        targetId: claim.id,
        summary: `Approved claim ${claim.id} for "${claim.foundReportTitle}" and issued 30-min pickup token for desk ${claim.custodyDeskId}.`,
        createdAt: new Date().toISOString(),
      });
    } else if (decision === 'rejected') {
      claim.status = 'rejected';
      claim.reviewerNotes = reviewerNotes || 'Provided evidence did not match the recorded distinguishing characteristics.';
      claim.reviewedBy = user.fullName;
      claim.updatedAt = new Date().toISOString();
    }

    saveDb(db);
    res.json({ claim });
  });

  // --- SECURE QR CODE & OTP HANDOVER ROUTES ---
  app.post('/api/handover/:claimId/regenerate', requireAuth, (req, res) => {
    const user = (req as any).user;
    const claim = db.claims.find((c) => c.id === req.params.claimId);
    if (!claim) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }
    if (claim.claimantId !== user.id && user.role !== 'custody_staff' && user.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to regenerate pickup token for this claim.' });
      return;
    }
    if (claim.status !== 'approved') {
      res.status(400).json({ error: 'Only approved claims can generate a short-lived pickup token.' });
      return;
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
    claim.handoverOtp = otp;
    claim.handoverToken = `FND-HANDOVER-${otp}-${randomHex}`;
    claim.handoverExpiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    if (req.body.custodyDeskId) claim.custodyDeskId = req.body.custodyDeskId;
    if (req.body.pickupWindow) claim.pickupWindow = req.body.pickupWindow;
    claim.updatedAt = new Date().toISOString();

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'HANDOVER_TOKEN_ROTATED',
      targetType: 'claim',
      targetId: claim.id,
      summary: `Issued fresh 30-minute pickup QR/OTP token for claim ${claim.id} at desk ${claim.custodyDeskId}.`,
      createdAt: new Date().toISOString(),
    });

    saveDb(db);
    res.json({ claim });
  });

  app.post('/api/handover/validate', requireAuth, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'custody_staff' && user.role !== 'admin') {
      res.status(403).json({
        error: 'Access Denied: Only authorized Custody Desk staff or Administrators may validate item handovers.',
      });
      return;
    }

    const { codeOrToken, custodyDeskId, staffNotes } = req.body;
    const cleanInput = String(codeOrToken || '').trim().toUpperCase();
    if (!cleanInput) {
      res.status(400).json({ error: 'Please enter a 6-digit Handover OTP or scan a Findora QR token.' });
      return;
    }

    const claim = db.claims.find(
      (c) =>
        (c.handoverOtp && c.handoverOtp === cleanInput) ||
        (c.handoverToken && c.handoverToken.toUpperCase() === cleanInput)
    );

    if (!claim) {
      db.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        action: 'HANDOVER_VALIDATION_FAILED',
        targetType: 'handover',
        targetId: 'unknown',
        summary: `Failed handover token/OTP attempt at desk ${custodyDeskId || 'unspecified'}.`,
        createdAt: new Date().toISOString(),
      });
      saveDb(db);
      res.status(404).json({ error: 'Invalid handover token or OTP. No matching approved claim found.' });
      return;
    }

    if (claim.status === 'completed') {
      res.status(409).json({
        error: `Replay Blocked: This handover token was already consumed on ${new Date(claim.handoverCompletedAt).toLocaleString()}.`,
      });
      return;
    }

    if (claim.status !== 'approved') {
      res.status(400).json({ error: `Claim status is "${claim.status}" and is not eligible for handover.` });
      return;
    }

    if (claim.handoverExpiresAt && Date.now() > new Date(claim.handoverExpiresAt).getTime()) {
      res.status(400).json({ error: 'Short-lived handover token has expired. Ask the claimant to rotate/refresh their pickup token.' });
      return;
    }

    const verifiedDesk = db.custodyDesks.find((d) => d.id === (custodyDeskId || claim.custodyDeskId));
    const tokenFingerprint = claim.handoverToken ? `${claim.handoverToken.slice(0, 16)}...` : 'OTP-VERIFIED';

    // Atomically consume token and transition statuses to Returned
    claim.status = 'completed';
    claim.handoverCompletedAt = new Date().toISOString();
    claim.updatedAt = new Date().toISOString();
    claim.reviewerNotes = `${claim.reviewerNotes || ''} · Handover verified at ${verifiedDesk?.name || claim.custodyDeskId} by ${user.fullName}${staffNotes ? ` (${staffNotes})` : ''}.`.trim();
    // Invalidate one-time credentials immediately so they cannot be reused
    claim.handoverOtp = undefined;
    claim.handoverToken = undefined;

    const foundReport = db.reports.find((r) => r.id === claim.foundReportId);
    if (foundReport) {
      foundReport.status = 'returned';
      foundReport.updatedAt = new Date().toISOString();
    }
    if (claim.lostReportId) {
      const lostReport = db.reports.find((r) => r.id === claim.lostReportId);
      if (lostReport) {
        lostReport.status = 'returned';
        lostReport.updatedAt = new Date().toISOString();
      }
    }

    // Reject/cancel any competing open claims for the same found item (Test 17)
    for (const otherClaim of db.claims) {
      if (otherClaim.id !== claim.id && otherClaim.foundReportId === claim.foundReportId && otherClaim.status !== 'completed') {
        otherClaim.status = 'cancelled';
        otherClaim.reviewerNotes = 'Automatically closed because another verified claim completed custody handover.';
      }
    }

    // Update Trust Scores & Verified Return counts
    const finder = db.users.find((u) => u.id === claim.finderId);
    if (finder) {
      finder.verifiedReturnsCount += 1;
      finder.completedHandoversCount += 1;
      finder.trustScore = Math.min(100, finder.trustScore + 4);
    }
    const claimantUser = db.users.find((u) => u.id === claim.claimantId);
    if (claimantUser) {
      claimantUser.completedHandoversCount += 1;
      claimantUser.trustScore = Math.min(100, claimantUser.trustScore + 2);
    }

    const auditEntry = {
      id: `aud-${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'HANDOVER_COMPLETED_ATOMIC',
      targetType: 'claim',
      targetId: claim.id,
      summary: `Validated token (${tokenFingerprint}) at ${verifiedDesk?.name || 'Custody Desk'} and completed return of "${claim.foundReportTitle}" to ${claim.claimantName}.${staffNotes ? ` Officer note: ${staffNotes}` : ''}`,
      createdAt: new Date().toISOString(),
    };
    db.auditLogs.unshift(auditEntry);

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: claim.claimantId,
      type: 'handover',
      title: `Handover Confirmed: ${claim.foundReportTitle}`,
      body: `Custody handover validated by ${user.fullName} at ${verifiedDesk?.name || 'Custody Desk'}. Item status is now Returned.`,
      linkView: 'claims',
      linkTargetId: claim.id,
      read: false,
      createdAt: new Date().toISOString(),
    });

    saveDb(db);
    res.json({
      claim,
      auditEntry,
      message: `Handover verified and recorded in audit log! "${claim.foundReportTitle}" has been marked as Returned to ${claim.claimantName}.`,
    });
  });

  // --- IN-APP CHAT ROUTES ---
  app.post('/api/chat/:conversationId/messages', requireAuth, (req, res) => {
    const user = (req as any).user;
    const { text } = req.body;
    const conv = db.conversations.find((c) => c.id === req.params.conversationId);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    if (!text || !String(text).trim()) {
      res.status(400).json({ error: 'Message text cannot be empty.' });
      return;
    }

    // Privacy guardrail: mask raw phone numbers or email addresses in chat messages by default
    const sanitizedText = String(text)
      .trim()
      .replace(/\b[\w.-]+@[\w.-]+\.\w{2,4}\b/g, '[email hidden for privacy]')
      .replace(/\b\d{10}\b/g, '[phone hidden for privacy]');

    const msg = {
      id: `msg-${Date.now()}`,
      conversationId: conv.id,
      senderId: user.id,
      senderName: user.fullName,
      senderRole: user.role,
      senderTier: user.tier,
      text: sanitizedText,
      createdAt: new Date().toISOString(),
    };

    db.messages.push(msg);
    conv.lastMessageText = sanitizedText;
    conv.updatedAt = new Date().toISOString();
    saveDb(db);
    res.status(201).json({ message: msg });
  });

  app.post('/api/chat/:conversationId/report-abuse', requireAuth, (req, res) => {
    const user = (req as any).user;
    const conv = db.conversations.find((c) => c.id === req.params.conversationId);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    conv.status = 'reported';
    conv.updatedAt = new Date().toISOString();

    const dispute = {
      id: `disp-${Date.now()}`,
      reportId: conv.reportId,
      claimId: conv.claimId,
      raisedByUserId: user.id,
      raisedByName: user.fullName,
      reason: `Flagged chat thread "${conv.reportTitle}" for moderation: ${req.body.reason || 'Suspicious or abusive messaging reported by participant.'}`,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    db.disputes.unshift(dispute);

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'CHAT_THREAD_FLAGGED',
      targetType: 'conversation',
      targetId: conv.id,
      summary: `Participant ${user.fullName} flagged conversation ${conv.id} (${conv.reportTitle}) for administrative review.`,
      createdAt: new Date().toISOString(),
    });

    saveDb(db);
    res.json({ conversation: conv, dispute });
  });

  app.post('/api/admin/reports/:id/flag', requireAuth, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && user.role !== 'custody_staff') {
      res.status(403).json({ error: 'Administrator or Custody Staff privileges required.' });
      return;
    }
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    report.flaggedForModeration = Boolean(req.body.flagged);
    report.updatedAt = new Date().toISOString();

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: report.flaggedForModeration ? 'REPORT_FLAGGED_MODERATION' : 'REPORT_CLEARED_MODERATION',
      targetType: 'report',
      targetId: report.id,
      summary: `${report.flaggedForModeration ? 'Flagged' : 'Cleared'} report "${report.title}" (${report.id}) in Admin Moderation Centre.`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ report: sanitizeReportForPublic(report) });
  });

  // --- ADMIN & MODERATION ROUTES ---
  app.post('/api/admin/verification/:id/review', requireAuth, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && user.role !== 'custody_staff') {
      res.status(403).json({ error: 'Administrator privileges required.' });
      return;
    }

    const { decision, reviewerNotes } = req.body;
    const reqRecord = db.verificationRequests.find((v) => v.id === req.params.id);
    if (!reqRecord) {
      res.status(404).json({ error: 'Verification request not found.' });
      return;
    }

    reqRecord.status = decision === 'approved' ? 'approved' : 'rejected';
    reqRecord.reviewerNotes = reviewerNotes || 'Reviewed against institutional directory.';
    // Privacy retention policy: delete raw ID document upon completion of review
    reqRecord.documentDeletedAfterReview = true;
    reqRecord.documentReference = 'PURGED_PER_RETENTION_POLICY';

    const targetUser = db.users.find((u) => u.id === reqRecord.userId);
    if (targetUser) {
      if (decision === 'approved') {
        targetUser.identityVerified = true;
        targetUser.identityStatus = 'approved';
        targetUser.tier = 3;
        targetUser.trustScore = Math.min(100, targetUser.trustScore + 10);
      } else {
        targetUser.identityStatus = 'rejected';
      }
    }

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: `TIER3_VERIFICATION_${reqRecord.status.toUpperCase()}`,
      targetType: 'verification_request',
      targetId: reqRecord.id,
      summary: `Reviewed Tier 3 ID (${reqRecord.studentOrStaffId}) for ${reqRecord.userName}: ${reqRecord.status}. Encrypted ID artifact purged.`,
      createdAt: new Date().toISOString(),
    });

    saveDb(db);
    res.json({ verificationRequest: reqRecord, targetUser });
  });

  app.post('/api/disputes', requireAuth, (req, res) => {
    const user = (req as any).user;
    const { claimId, reportId, reason } = req.body;
    if (!reason || String(reason).trim().length < 5) {
      res.status(400).json({ error: 'Please provide a clear reason for the dispute or escalation.' });
      return;
    }
    const dispute = {
      id: `disp-${Date.now()}`,
      claimId,
      reportId,
      raisedByUserId: user.id,
      raisedByName: user.fullName,
      reason: String(reason).trim(),
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    db.disputes.unshift(dispute);
    saveDb(db);
    res.status(201).json({ dispute });
  });

  app.post('/api/admin/disputes/:id/resolve', requireAuth, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && user.role !== 'custody_staff') {
      res.status(403).json({ error: 'Administrator privileges required.' });
      return;
    }
    const dispute = db.disputes.find((d) => d.id === req.params.id);
    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found.' });
      return;
    }
    dispute.status = 'resolved';
    dispute.resolutionNotes = req.body.resolutionNotes || 'Resolved by Campus Administration.';
    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'DISPUTE_RESOLVED',
      targetType: 'dispute',
      targetId: dispute.id,
      summary: `Resolved dispute ${dispute.id}: ${dispute.resolutionNotes}`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ dispute });
  });

  // --- SERVER-SIDE GEMINI AI ENHANCEMENTS (Basic Text & Multimodal: gemini-3.8-flash) ---
  app.post('/api/ai/smart-search', async (req, res) => {
    const { query } = req.body;
    if (!query || !String(query).trim()) {
      res.status(400).json({ error: 'Search query is required.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      // Deterministic fallback parser if GEMINI_API_KEY is not set
      const q = String(query).toLowerCase();
      const matchedReports = db.reports
        .filter((r) => {
          const hay = `${r.title} ${r.category} ${r.color} ${r.brand} ${r.buildingName} ${r.description}`.toLowerCase();
          return tokenize(q).some((tok) => hay.includes(tok));
        })
        .map(sanitizeReportForPublic);
      res.json({
        extractedFilters: { keyword: query },
        summary: `Found ${matchedReports.length} matching reports in the database.`,
        reports: matchedReports,
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Extract structured lost-and-found search filters from this user query (which may be in English or Hindi): "${query}"`,
        config: {
          systemInstruction:
            'You convert a natural language lost-and-found search query into filter criteria. Never invent reports. Return JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reportType: { type: Type.STRING, description: 'lost, found, or all' },
              category: { type: Type.STRING, description: 'Category name or all' },
              colorKeyword: { type: Type.STRING, description: 'Color mentioned if any' },
              locationKeyword: { type: Type.STRING, description: 'Building or area mentioned if any' },
              itemKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Keywords describing the item in English',
              },
              explanation: { type: Type.STRING, description: 'Concise 1-sentence summary of the applied filters' },
            },
            required: ['reportType', 'category', 'itemKeywords', 'explanation'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const keywords: string[] = [
        ...(parsed.itemKeywords || []),
        parsed.colorKeyword || '',
        parsed.locationKeyword || '',
      ]
        .map((s) => String(s).toLowerCase().trim())
        .filter(Boolean);

      const matched = db.reports
        .filter((r) => {
          const hay = `${r.title} ${r.category} ${r.color} ${r.brand} ${r.model} ${r.buildingName} ${r.campusZone} ${r.description}`.toLowerCase();
          if (keywords.length === 0) return true;
          return keywords.some((kw) => hay.includes(kw));
        })
        .map(sanitizeReportForPublic);

      res.json({
        extractedFilters: parsed,
        summary: parsed.explanation || `Matched ${matched.length} persisted database reports.`,
        reports: matched,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'AI discovery service error.' });
    }
  });

  app.post('/api/ai/compare-match', async (req, res) => {
    const { matchId } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) {
      res.status(404).json({ error: 'Match not found.' });
      return;
    }
    const lost = db.reports.find((r) => r.id === match.lostReportId);
    const found = db.reports.find((r) => r.id === match.foundReportId);
    if (!lost || !found) {
      res.status(404).json({ error: 'Linked reports not found.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      const fallback = `Both reports describe a ${lost.color} ${lost.category} (${lost.brand || 'unbranded'}) reported ${match.distanceMeters}m apart within ${match.timeDeltaHours} hours.`;
      match.aiInsight = fallback;
      saveDb(db);
      res.json({ aiInsight: fallback });
      return;
    }

    try {
      // Strictly exclude private secret ownership evidence when calling external AI
      const prompt = `Compare these two public campus Lost & Found reports and explain in 2 concise sentences why they are a strong candidate match and what the claimant should verify at the Custody Desk.
Lost Report: Title="${lost.title}", Category="${lost.category}", Brand="${lost.brand}", Color="${lost.color}", Features="${lost.distinguishingFeatures}", Location="${lost.buildingName}", Date="${lost.incidentDate}".
Found Report: Title="${found.title}", Category="${found.category}", Brand="${found.brand}", Color="${found.color}", Features="${found.distinguishingFeatures}", Location="${found.buildingName}", Date="${found.incidentDate}".`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      const insight = (response.text || '').trim();
      match.aiInsight = insight;
      saveDb(db);
      res.json({ aiInsight: insight });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Unable to generate AI comparison.' });
    }
  });

  app.post('/api/ai/analyze-image', async (req, res) => {
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'Valid base64 image dataUrl is required.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini AI vision service is not configured.' });
      return;
    }

    try {
      const [header, base64Data] = dataUrl.split(',');
      const mimeType = header.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            {
              text: 'Analyze this item photo for a campus Lost & Found report. Suggest title, category, brand, color, material, and distinguishing features.',
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: {
                type: Type.STRING,
                description:
                  'One of: Electronics, Bags and backpacks, Wallets and purses, Keys, Identity cards, Documents, Books and stationery, Clothing, Jewellery, Accessories, Water bottles, Other',
              },
              brand: { type: Type.STRING },
              color: { type: Type.STRING },
              material: { type: Type.STRING },
              distinguishingFeatures: { type: Type.STRING },
            },
            required: ['title', 'category', 'color', 'distinguishingFeatures'],
          },
        },
      });

      const suggestion = JSON.parse(response.text || '{}');
      res.json({ suggestion });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to analyze item image.' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Findora full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
