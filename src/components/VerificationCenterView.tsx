import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  Smartphone,
  BadgeCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Award,
  User as UserIcon,
  Save,
} from 'lucide-react';
import { User } from '../types';

interface VerificationCenterViewProps {
  user: User;
  onUserUpdated: (user: User) => void;
}

export const VerificationCenterView: React.FC<VerificationCenterViewProps> = ({
  user,
  onUserUpdated,
}) => {
  // Profile Settings state
  const [profileFullName, setProfileFullName] = useState(user.fullName);
  const [profileUsername, setProfileUsername] = useState(user.username);
  const [profileInstitution, setProfileInstitution] = useState(
    user.institutionName || 'National Institute of Technology Campus'
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // Tier 1 Email state
  const [emailCodeInput, setEmailCodeInput] = useState('');
  const [inboxEmailCode, setInboxEmailCode] = useState<string | null>(null);

  // Tier 2 Phone state
  const [phoneInput, setPhoneInput] = useState('+91 98204 14821');
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [inboxPhoneOtp, setInboxPhoneOtp] = useState<string | null>(null);

  // Tier 3 Institutional ID state
  const [institutionName, setInstitutionName] = useState(
    user.institutionName || 'National Institute of Technology Campus'
  );
  const [studentOrStaffId, setStudentOrStaffId] = useState(
    user.studentOrStaffId || 'NIT-CS-2026-4410'
  );

  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProfileFullName(user.fullName);
    setProfileUsername(user.username);
    setProfileInstitution(user.institutionName || 'National Institute of Technology Campus');
    setInstitutionName(user.institutionName || 'National Institute of Technology Campus');
    setStudentOrStaffId(user.studentOrStaffId || 'NIT-CS-2026-4410');
  }, [user]);

  const token = localStorage.getItem('findora_token') || 'demo-token-student';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: profileFullName,
          username: profileUsername,
          institutionName: profileInstitution,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      onUserUpdated(data.user);
      setStatusMsg({ type: 'ok', text: data.message });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendEmailCode = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/verification/send-email-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInboxEmailCode(data.verificationInboxCode);
      setEmailCodeInput(data.verificationInboxCode);
      setStatusMsg({ type: 'ok', text: data.message });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/verification/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: emailCodeInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUserUpdated(data.user);
      setInboxEmailCode(null);
      setStatusMsg({ type: 'ok', text: 'Tier 1 Campus Email Verification completed.' });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/verification/send-phone-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInboxPhoneOtp(data.verificationInboxOtp);
      setPhoneOtpInput(data.verificationInboxOtp);
      setStatusMsg({ type: 'ok', text: data.message });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/verification/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: phoneOtpInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUserUpdated(data.user);
      setInboxPhoneOtp(null);
      setStatusMsg({
        type: 'ok',
        text: 'Tier 2 Phone Verification completed. You can now submit Lost and Found reports.',
      });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTier3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/verification/submit-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ institutionName, studentOrStaffId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUserUpdated(data.user);
      setStatusMsg({
        type: 'ok',
        text: 'Tier 3 Student/Staff ID submitted for institutional review. Switch to Admin to approve and auto-purge raw document.',
      });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Current Tier Overview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Three-Tier Identity Verification &amp; Profile Settings
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {user.fullName} · Verification Tier {user.tier} of 3
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Findora uses progressive verification so that reporting and high-value item claims remain accountable while keeping verification evidence strictly private.
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-500">Community Trust Score</div>
            <div className="text-3xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
              {user.trustScore} / 100
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              {user.verifiedReturnsCount} returns · {user.completedHandoversCount} handovers
            </div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {statusMsg.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Three Verification Tier Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* TIER 1: CAMPUS EMAIL */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                01. Tier 1: Campus Email
              </span>
              <span
                className={
                  user.emailVerified
                    ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                    : 'font-semibold text-amber-600'
                }
              >
                {user.emailVerified ? 'Verified' : 'Required'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Confirms control of your institutional or registered email address ({user.email}) with a short-lived one-time code.
            </p>
          </div>

          {user.emailVerified ? (
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Email verified: {user.email}</span>
            </div>
          ) : (
            <form onSubmit={handleVerifyEmail} className="space-y-3">
              {inboxEmailCode && (
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-mono">
                  Verification Inbox Code: <strong>{inboxEmailCode}</strong>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={emailCodeInput}
                  onChange={(e) => setEmailCodeInput(e.target.value)}
                  placeholder="6-digit email code"
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleSendEmailCode}
                  disabled={loading}
                  className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl whitespace-nowrap shrink-0"
                >
                  Send Code
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || !emailCodeInput}
                className="w-full py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                Verify Email Address
              </button>
            </form>
          )}
        </div>

        {/* TIER 2: PHONE OTP VERIFICATION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                02. Tier 2: Phone SMS OTP
              </span>
              <span
                className={
                  user.phoneVerified
                    ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                    : 'font-semibold text-amber-600'
                }
              >
                {user.phoneVerified ? 'Verified' : 'Required for Reporting'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Required before submitting Lost or Found reports. Validates a server-issued 6-digit SMS OTP with retry and brute-force limits.
            </p>
          </div>

          {user.phoneVerified ? (
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-mono">Phone verified: {user.phoneMasked || '+91 ••••• •4821'}</span>
            </div>
          ) : (
            <form onSubmit={handleVerifyPhone} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+91 98204 14821"
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleSendPhoneOtp}
                  disabled={loading}
                  className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl whitespace-nowrap shrink-0"
                >
                  Send OTP
                </button>
              </div>
              {inboxPhoneOtp && (
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-mono">
                  SMS Verification Inbox OTP: <strong>{inboxPhoneOtp}</strong>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phoneOtpInput}
                  onChange={(e) => setPhoneOtpInput(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
                <button
                  type="submit"
                  disabled={loading || !phoneOtpInput}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  Confirm OTP
                </button>
              </div>
            </form>
          )}
        </div>

        {/* TIER 3: STUDENT OR STAFF IDENTITY VERIFICATION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                03. Tier 3: Student / Staff ID
              </span>
              <span
                className={
                  user.identityVerified
                    ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                    : 'font-semibold text-amber-600 capitalize'
                }
              >
                {user.identityVerified ? 'Approved' : user.identityStatus}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Institutional verification for restricted high-value claims and controlled pickup. Uploaded evidence is stored privately and automatically purged once reviewed.
            </p>
          </div>

          {user.identityVerified ? (
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                Verified Institutional Identity
              </div>
              <div className="font-mono">
                {user.institutionName} · {user.studentOrStaffId}
              </div>
              <div className="text-[11px] opacity-80">
                Raw ID artifact purged per data-retention policy.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitTier3} className="space-y-2.5">
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Institution / Organization Name"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <input
                type="text"
                value={studentOrStaffId}
                onChange={(e) => setStudentOrStaffId(e.target.value)}
                placeholder="Student / Employee ID Number"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <button
                type="submit"
                disabled={loading || user.identityStatus === 'pending'}
                className="w-full py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {user.identityStatus === 'pending'
                  ? 'Awaiting Authorized Review'
                  : 'Submit for Institutional Review'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* PROFILE & ACCOUNT SETTINGS + TRUST & PRIVACY POLICY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile and Account Settings Form */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Account Profile &amp; Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update your campus display name, handle, and institutional affiliation.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 capitalize">
              Role: {user.role.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={profileFullName}
                onChange={(e) => setProfileFullName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Campus Username *
              </label>
              <input
                type="text"
                required
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Institution / Campus Hub
              </label>
              <input
                type="text"
                value={profileInstitution}
                onChange={(e) => setProfileInstitution(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Registered email: <span className="font-mono">{user.email}</span>
            </span>
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {savingProfile ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Transparent Trust Score & Privacy Policy Cards */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              How Your Findora Trust Score Is Calculated
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Trust scores cannot be purchased or inflated through self-reported returns. They are computed strictly from verifiable backend events:
            </p>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
              <li>Base account initialization: 50 points</li>
              <li>Tier 1 Email (+10 pts), Tier 2 Phone (+15 pts), Tier 3 Institutional ID (+10 pts)</li>
              <li>Each Custody Desk atomic QR/OTP return completed: +4 pts (Finder) / +2 pts (Claimant)</li>
              <li>Unverified accusations never reduce your reputation automatically.</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Lock className="w-4 h-4 text-emerald-600" />
              Identity Document Privacy &amp; Retention Policy
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              An uploaded student or staff ID is never publicly accessible and is never treated as automatic proof without institutional or authorized review:
            </p>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
              <li>Stored in isolated private references accessible only to authorized verification reviewers.</li>
              <li>Never sent to external AI models or public API endpoints.</li>
              <li>Automatically purged immediately after verification approval, with deletion recorded in the system audit log.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
