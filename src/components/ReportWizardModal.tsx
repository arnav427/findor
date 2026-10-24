import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
} from 'lucide-react';
import {
  ReportType,
  ItemCategory,
  PriorityLevel,
  CustodyDesk,
  ItemReport,
  ItemImage,
} from '../types';
import { CampusMapView } from './CampusMapView';

interface ReportWizardModalProps {
  initialType: ReportType;
  initialCoords?: { lat: number; lng: number; label?: string };
  custodyDesks: CustodyDesk[];
  reports: ItemReport[];
  onClose: () => void;
  onSubmitReport: (payload: any) => Promise<{ report: ItemReport; matchesFoundCount: number }>;
}

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

const DRAFT_STORAGE_KEY = 'findora_report_draft_v1';

export const ReportWizardModal: React.FC<ReportWizardModalProps> = ({
  initialType,
  initialCoords,
  custodyDesks,
  reports,
  onClose,
  onSubmitReport,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<ReportType>(initialType);
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [distinguishingFeatures, setDistinguishingFeatures] = useState('');
  const [description, setDescription] = useState('');
  const [serialHint, setSerialHint] = useState('');

  // Photos & Private Ownership Challenge (Step 1)
  const [images, setImages] = useState<ItemImage[]>([]);
  const [secretCharacteristic, setSecretCharacteristic] = useState('');
  const [secretPromptQuestion, setSecretPromptQuestion] = useState(
    'What distinctive sticker, marking, or internal detail is on this item?'
  );
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  // Step 2: Location & Time
  const [campusZone, setCampusZone] = useState('Central Quad & Library Wing');
  const [buildingName, setBuildingName] = useState(
    initialCoords?.label || 'Central Academic Commons'
  );
  const [floorOrArea, setFloorOrArea] = useState('Main Study Floor');
  const [locationPrivacy, setLocationPrivacy] = useState<'approximate' | 'exact_authorized'>(
    'approximate'
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(
    initialCoords
      ? { lat: initialCoords.lat, lng: initialCoords.lng }
      : { lat: 37.4275, lng: -122.1697 }
  );
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [incidentTimeWindow, setIncidentTimeWindow] = useState('14:00 – 16:00');
  const [designatedCustodyDeskId, setDesignatedCustodyDeskId] = useState(
    custodyDesks[0]?.id || ''
  );

  // Step 3: Review & Submission
  const [agreedPrivacy, setAgreedPrivacy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    report: ItemReport;
    matchesFoundCount: number;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved && !initialCoords) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.brand) setBrand(parsed.brand);
        if (parsed.color) setColor(parsed.color);
      }
    } catch {
      // ignore
    }
  }, [initialCoords]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ title, brand, color, category })
      );
    } catch {
      // ignore
    }
  }, [title, brand, color, category]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setError('Only valid image files (PNG, JPEG, WebP) are permitted.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImages((prev) => [
          ...prev,
          {
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            url: dataUrl,
            caption: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyzePhotoWithAi = async () => {
    if (images.length === 0) return;
    setAnalyzingPhoto(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: images[0].url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not analyze image.');
        return;
      }
      const s = data.suggestion;
      if (s) {
        if (s.title) setTitle(s.title);
        if (s.category && CATEGORIES.includes(s.category)) setCategory(s.category);
        if (s.brand) setBrand(s.brand);
        if (s.color) setColor(s.color);
        if (s.material) setMaterial(s.material);
        if (s.distinguishingFeatures) {
          setDistinguishingFeatures(s.distinguishingFeatures);
          setDescription(s.distinguishingFeatures);
        }
      }
    } catch {
      setError('Failed to reach AI photo analysis service.');
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const validateStep = (targetStep: number): boolean => {
    setError(null);
    if (targetStep > 1) {
      if (!title.trim() || !color.trim()) {
        setError('Please enter both the item title and its primary color before continuing.');
        return false;
      }
    }
    if (targetStep > 2) {
      if (!buildingName.trim()) {
        setError('Please specify the campus building or approximate location.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedPrivacy) {
      setError('Please confirm the location privacy and verification policy.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmitReport({
        type,
        priority,
        title,
        category,
        brand,
        model,
        color,
        material,
        distinguishingFeatures,
        description: description || distinguishingFeatures,
        serialHint,
        secretCharacteristic: type === 'found' ? secretCharacteristic : undefined,
        secretPromptQuestion: type === 'found' ? secretPromptQuestion : undefined,
        campusZone,
        buildingName,
        floorOrArea,
        locationPrivacy,
        lat: coords.lat,
        lng: coords.lng,
        incidentDate,
        incidentTimeWindow,
        designatedCustodyDeskId: type === 'found' ? designatedCustodyDeskId : undefined,
        images,
      });
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setSuccessResult(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to save report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-xl my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Guided 3-Step Report Flow · Step {step} of 3
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {type === 'lost' ? 'Report a Lost Item' : 'Report a Found Item'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successResult ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Report Saved &amp; Indexed
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Your {successResult.report.type} report{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                &ldquo;{successResult.report.title}&rdquo;
              </span>{' '}
              has been persisted and scanned against active campus reports.
            </p>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl max-w-md mx-auto text-sm text-indigo-950 dark:text-indigo-200 font-mono tabular-nums">
              Matching Engine Result: {successResult.matchesFoundCount} candidate match(es) identified.
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Return to Workspace
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 3-Step Progress Bar */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { num: 1, label: 'Step 1 · Item Information' },
                { num: 2, label: 'Step 2 · Location & Time' },
                { num: 3, label: 'Step 3 · Review & Submit' },
              ].map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (validateStep(s.num)) setStep(s.num as 1 | 2 | 3);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-left border transition-colors ${
                    step === s.num
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-600 text-indigo-700 dark:text-indigo-300'
                      : step > s.num
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: ITEM INFORMATION & PHOTO UPLOAD */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setType('lost')}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        type === 'lost'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Lost Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('found')}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        type === 'found'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Found Item
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Priority:
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                      className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High (ID / Keys / Essential Tech)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Item Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., 14-inch MacBook Pro or Brown Leather Wallet"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ItemCategory)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Color *
                    </label>
                    <input
                      type="text"
                      required
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="e.g., Space Gray, Matte Navy, Dark Brown"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Brand &amp; Model
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Brand (e.g., Apple)"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Model (e.g., M3 14)"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description &amp; Distinguishing Details
                  </label>
                  <textarea
                    rows={2}
                    value={distinguishingFeatures}
                    onChange={(e) => {
                      setDistinguishingFeatures(e.target.value);
                      setDescription(e.target.value);
                    }}
                    placeholder="Describe visible marks, protective case, or exterior features..."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Photo Upload & AI Vision Auto-Fill */}
                <div className="p-3.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Photo Upload (Optional)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Attach a photo or run AI Vision to auto-fill item attributes.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors">
                      Choose Photo
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {images.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAnalyzePhotoWithAi}
                        disabled={analyzingPhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {analyzingPhoto ? 'Analyzing...' : 'Auto-Fill with AI'}
                      </button>
                    )}
                  </div>
                </div>

                {images.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="relative w-24 h-20 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shrink-0"
                      >
                        <img
                          src={img.url}
                          alt={img.caption || 'Uploaded preview'}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((i) => i.id !== img.id))}
                          className="absolute top-1 right-1 p-0.5 bg-slate-900/80 text-white rounded hover:bg-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {type === 'found' && (
                  <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                      <Lock className="w-4 h-4 text-amber-600" />
                      PRIVATE OWNERSHIP VERIFICATION CLUE (WITHHELD FROM PUBLIC VIEW)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Challenge Question for Claimant
                        </label>
                        <input
                          type="text"
                          value={secretPromptQuestion}
                          onChange={(e) => setSecretPromptQuestion(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Hidden Characteristic Answer (Private)
                        </label>
                        <input
                          type="text"
                          value={secretCharacteristic}
                          onChange={(e) => setSecretCharacteristic(e.target.value)}
                          placeholder="e.g., Embossed owl inside coin flap"
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: LOCATION & TIME */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Campus Zone
                    </label>
                    <input
                      type="text"
                      value={campusZone}
                      onChange={(e) => setCampusZone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Building or Landmark *
                    </label>
                    <input
                      type="text"
                      required
                      value={buildingName}
                      onChange={(e) => setBuildingName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Floor / Room / Area
                    </label>
                    <input
                      type="text"
                      value={floorOrArea}
                      onChange={(e) => setFloorOrArea(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Incident Date
                    </label>
                    <input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Time Window
                    </label>
                    <input
                      type="text"
                      value={incidentTimeWindow}
                      onChange={(e) => setIncidentTimeWindow(e.target.value)}
                      placeholder="14:00 – 16:00"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                    />
                  </div>
                  {type === 'found' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Designated Custody Desk
                      </label>
                      <select
                        value={designatedCustodyDeskId}
                        onChange={(e) => setDesignatedCustodyDeskId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                      >
                        {custodyDesks.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Location Privacy
                      </label>
                      <select
                        value={locationPrivacy}
                        onChange={(e) =>
                          setLocationPrivacy(e.target.value as 'approximate' | 'exact_authorized')
                        }
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                      >
                        <option value="approximate">Approximate Public Radius</option>
                        <option value="exact_authorized">Authorized Staff Only</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Interactive Google Map Picker */}
                <CampusMapView
                  reports={reports}
                  custodyDesks={custodyDesks}
                  onSelectReport={() => {}}
                  onReportLostClick={() => {}}
                  pickerMode
                  pickedCoords={coords}
                  onPickCoords={(next) => {
                    setCoords({ lat: next.lat, lng: next.lng });
                    if (next.placeName) setBuildingName(next.placeName);
                  }}
                />
              </div>
            )}

            {/* STEP 3: REVIEW & SUBMIT */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold uppercase text-blue-600 dark:text-blue-400">
                      {type} Report Summary
                    </span>
                    <span className="font-mono tabular-nums">
                      {incidentDate} · {incidentTimeWindow}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {title} ({color})
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Category: {category} · Brand: {brand || 'Unspecified'} · Priority: {priority}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Near {buildingName} ({floorOrArea}) · Coordinates:{' '}
                    <span className="font-mono tabular-nums">
                      {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Public vs Private Field Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl space-y-1">
                    <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      Public Discovery Fields
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Title, category, primary color, approximate building zone ({buildingName}), and date/time window are visible to help campus members identify candidate matches.
                    </p>
                  </div>
                  <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-1">
                    <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Protected Private Fields
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {type === 'found' && secretCharacteristic
                        ? 'Your hidden ownership challenge answer is encrypted server-side and never returned in public API responses.'
                        : 'Exact coordinates, serial hints, and personal contact information remain masked until authorized claim verification.'}
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedPrivacy}
                    onChange={(e) => setAgreedPrivacy(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span>
                    I confirm this report is accurate. I understand that item recovery requires verified ownership proof and Custody Desk QR/OTP validation.
                  </span>
                </label>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200"
                >
                  ← Previous Step
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep(step + 1)) {
                      setStep((s) => (s + 1) as 1 | 2 | 3);
                    }
                  }}
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Continue to Step {step + 1} →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving & Running Match Engine...' : 'Submit Report & Find Matches'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
