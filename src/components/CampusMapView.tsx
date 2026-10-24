import React, { useState, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Search,
  MapPin,
  ShieldCheck,
  Navigation,
  SlidersHorizontal,
  Layers,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { ItemReport, CustodyDesk, ItemCategory, CanvasZoneId } from '../types';

function estimateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

interface CampusMapViewProps {
  reports: ItemReport[];
  custodyDesks: CustodyDesk[];
  onSelectReport: (report: ItemReport) => void;
  onReportLostClick: (coords?: { lat: number; lng: number; label?: string }) => void;
  onSendToCanvasZone?: (report: ItemReport, zoneId: CanvasZoneId) => void;
  pickerMode?: boolean;
  pickedCoords?: { lat: number; lng: number };
  onPickCoords?: (coords: { lat: number; lng: number; placeName?: string }) => void;
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

interface SearchedPlaceResult {
  id: string;
  displayName: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

function PlacesSearchController({
  center,
  onPlaceFound,
}: {
  center: { lat: number; lng: number };
  onPlaceFound: (places: SearchedPlaceResult[], panTo?: { lat: number; lng: number }) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim() || !placesLib) return;
    setSearching(true);
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: searchText.trim(),
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
        locationBias: {
          center,
          radius: 3000,
        },
        maxResultCount: 5,
      });

      const mapped: SearchedPlaceResult[] = (places || [])
        .filter((p) => p.location)
        .map((p) => ({
          id: p.id || String(Math.random()),
          displayName: p.displayName || 'Campus Location',
          formattedAddress: p.formattedAddress || '',
          lat: p.location!.lat(),
          lng: p.location!.lng(),
        }));

      onPlaceFound(mapped, mapped[0] ? { lat: mapped[0].lat, lng: mapped[0].lng } : undefined);
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('OVER_QUERY_LIMIT') ||
        msg.includes('429') ||
        msg.includes('Quota')
      ) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative flex items-center w-full max-w-md">
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
      <input
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Search building or place via Google Places..."
        className="w-full pl-9 pr-20 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
      />
      <button
        type="submit"
        disabled={searching}
        className="absolute right-1.5 px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
      >
        {searching ? 'Searching...' : 'Locate'}
      </button>
    </form>
  );
}

export const CampusMapView: React.FC<CampusMapViewProps> = ({
  reports,
  custodyDesks,
  onSelectReport,
  onReportLostClick,
  onSendToCanvasZone,
  pickerMode = false,
  pickedCoords,
  onPickCoords,
}) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const [cameraCenter, setCameraCenter] = useState<{ lat: number; lng: number }>(
    pickedCoords || { lat: 37.4275, lng: -122.1697 }
  );
  const [cameraZoom, setCameraZoom] = useState<number>(16);

  const [layerFilter, setLayerFilter] = useState<'all' | 'lost' | 'found' | 'desks'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null);
  const [searchedPlaces, setSearchedPlaces] = useState<SearchedPlaceResult[]>([]);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const filteredReports = reports.filter((r) => {
    if (layerFilter === 'desks') return false;
    if (layerFilter === 'lost' && r.type !== 'lost') return false;
    if (layerFilter === 'found' && r.type !== 'found') return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const showDesks = layerFilter === 'all' || layerFilter === 'desks';

  const selectedReport = reports.find((r) => r.id === selectedReportId) || null;
  const selectedDesk = custodyDesks.find((d) => d.id === selectedDeskId) || null;

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage('Geolocation is not supported by this browser.');
      return;
    }
    setGeoMessage('Requesting browser coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCameraCenter(next);
        setCameraZoom(17);
        setGeoMessage(null);
        if (pickerMode && onPickCoords) {
          onPickCoords(next);
        }
      },
      () => {
        setGeoMessage('Location permission denied. Using default campus view.');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleMapClick = useCallback(
    (ev: any) => {
      const latLng = ev?.detail?.latLng;
      if (!latLng) return;
      if (pickerMode && onPickCoords) {
        onPickCoords({ lat: latLng.lat, lng: latLng.lng });
      }
    },
    [pickerMode, onPickCoords]
  );

  if (!apiKey) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center shadow-xs">
        <MapPin className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          Google Maps Platform API Key Required
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Configure <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> in your environment settings to enable interactive campus map tiles and Places search.
        </p>
      </div>
    );
  }

  if (pickerMode) {
    return (
      <APIProvider apiKey={apiKey} language="en" region="US">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PlacesSearchController
              center={cameraCenter}
              onPlaceFound={(places, panTo) => {
                setSearchedPlaces(places);
                if (panTo) {
                  setCameraCenter(panTo);
                  if (onPickCoords && places[0]) {
                    onPickCoords({
                      lat: panTo.lat,
                      lng: panTo.lng,
                      placeName: places[0].displayName,
                    });
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              Use Current Location
            </button>
          </div>
          {geoMessage && <p className="text-xs text-amber-600 dark:text-amber-400">{geoMessage}</p>}
          <div className="w-full h-72 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
            <Map
              center={cameraCenter}
              zoom={cameraZoom}
              onCameraChanged={(ev) => {
                setCameraCenter(ev.detail.center);
                setCameraZoom(ev.detail.zoom);
              }}
              onClick={handleMapClick}
              mapId="DEMO_MAP_ID"
              gestureHandling="greedy"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {pickedCoords && (
                <AdvancedMarker position={pickedCoords}>
                  <div className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-md border border-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Selected Incident Pin
                  </div>
                </AdvancedMarker>
              )}
              {custodyDesks.map((desk) => (
                <AdvancedMarker key={desk.id} position={{ lat: desk.lat, lng: desk.lng }}>
                  <div className="px-2 py-0.5 bg-emerald-700 text-white text-[11px] font-medium rounded-md shadow border border-white">
                    {desk.name.split('—')[0].trim()}
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Click anywhere on the map to adjust coordinates · Selected: {pickedCoords?.lat.toFixed(4)}, {pickedCoords?.lng.toFixed(4)} (Public view uses approximate radius for sensitive items)
          </p>
        </div>
      </APIProvider>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language="en" region="US">
      <div className="space-y-5">
        {/* Map Filter & Search Toolbar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Layer Segmented Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(['all', 'lost', 'found', 'desks'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayerFilter(mode)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    layerFilter === mode
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {mode === 'all'
                    ? 'All Layers'
                    : mode === 'lost'
                    ? 'Lost Items'
                    : mode === 'found'
                    ? 'Found Items'
                    : 'Custody Desks'}
                </button>
              ))}
            </div>

            {/* Category Select */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by item category"
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by report status"
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="all">All Statuses</option>
              <option value="unresolved">Unresolved</option>
              <option value="matched">Matched</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <PlacesSearchController
              center={cameraCenter}
              onPlaceFound={(places, panTo) => {
                setSearchedPlaces(places);
                if (panTo) {
                  setCameraCenter(panTo);
                  setCameraZoom(17);
                }
              }}
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Near Me
            </button>
          </div>
        </div>

        {geoMessage && (
          <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3.5 py-2.5 rounded-xl">
            {geoMessage}
          </div>
        )}

        {/* Synchronized Split Layout: Map Canvas + Results Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Interactive Google Map Canvas */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xs">
            <div className="w-full h-[520px] relative">
              <Map
                center={cameraCenter}
                zoom={cameraZoom}
                onCameraChanged={(ev) => {
                  setCameraCenter(ev.detail.center);
                  setCameraZoom(ev.detail.zoom);
                }}
                mapId="DEMO_MAP_ID"
                gestureHandling="greedy"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                {/* Report Markers */}
                {filteredReports.map((report) => {
                  const isSelected = selectedReportId === report.id;
                  const isLost = report.type === 'lost';
                  return (
                    <AdvancedMarker
                      key={report.id}
                      position={{ lat: report.lat, lng: report.lng }}
                      onClick={() => {
                        setSelectedDeskId(null);
                        setSelectedReportId(report.id);
                      }}
                    >
                      <div
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold shadow-md border transition-transform cursor-pointer flex items-center gap-1.5 ${
                          isSelected ? 'scale-110 ring-2 ring-indigo-500' : ''
                        } ${
                          isLost
                            ? 'bg-rose-600 text-white border-white'
                            : 'bg-indigo-600 text-white border-white'
                        }`}
                      >
                        <span>{isLost ? 'LOST' : 'FOUND'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="max-w-[120px] truncate">{report.title}</span>
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* Authorized Custody Desk Markers */}
                {showDesks &&
                  custodyDesks.map((desk) => {
                    const isSelected = selectedDeskId === desk.id;
                    return (
                      <AdvancedMarker
                        key={desk.id}
                        position={{ lat: desk.lat, lng: desk.lng }}
                        onClick={() => {
                          setSelectedReportId(null);
                          setSelectedDeskId(desk.id);
                        }}
                      >
                        <div
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-700 text-white border border-white shadow-md flex items-center gap-1 cursor-pointer ${
                            isSelected ? 'scale-110 ring-2 ring-emerald-400' : ''
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span className="whitespace-nowrap">{desk.name.split('—')[0].trim()}</span>
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                {/* Places API Search Results Markers */}
                {searchedPlaces.map((place) => (
                  <AdvancedMarker
                    key={place.id}
                    position={{ lat: place.lat, lng: place.lng }}
                    onClick={() => {
                      onReportLostClick({
                        lat: place.lat,
                        lng: place.lng,
                        label: place.displayName,
                      });
                    }}
                  >
                    <div className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-medium border border-slate-400 shadow">
                      {place.displayName}
                    </div>
                  </AdvancedMarker>
                ))}

                {/* Selected Report InfoWindow */}
                {selectedReport && (
                  <InfoWindow
                    position={{ lat: selectedReport.lat, lng: selectedReport.lng }}
                    onCloseClick={() => setSelectedReportId(null)}
                    maxWidth={300}
                  >
                    <div className="p-1 text-slate-900 space-y-2">
                      <div className="text-[11px] text-slate-500">
                        <span className="font-semibold uppercase text-slate-800">
                          {selectedReport.type}
                        </span>{' '}
                        · {selectedReport.category} · {selectedReport.status}
                      </div>
                      <h4 className="text-sm font-bold leading-snug">{selectedReport.title}</h4>
                      <p className="text-xs text-slate-600">
                        {selectedReport.approximateLocationLabel} ({selectedReport.floorOrArea})
                      </p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        Date: {selectedReport.incidentDate} ({selectedReport.incidentTimeWindow}) · ~
                        {estimateDistanceMeters(
                          cameraCenter.lat,
                          cameraCenter.lng,
                          selectedReport.lat,
                          selectedReport.lng
                        )}
                        m from map center
                      </p>
                      <div className="pt-1 flex flex-col gap-1.5">
                        {onSendToCanvasZone && (
                          <button
                            type="button"
                            onClick={() => onSendToCanvasZone(selectedReport, 'ZONE_3_FIND_MATCHES')}
                            className="w-full px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Move Card to Canvas → Find Matches
                          </button>
                        )}
                        {onSendToCanvasZone && selectedReport.type === 'found' && (
                          <button
                            type="button"
                            onClick={() =>
                              onSendToCanvasZone(selectedReport, 'ZONE_4_CLAIM_OWNERSHIP')
                            }
                            className="w-full px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                          >
                            Move Card to Canvas → Start Claim
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectReport(selectedReport)}
                          className="w-full px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Inspect Full Report Details
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}

                {/* Selected Custody Desk InfoWindow */}
                {selectedDesk && (
                  <InfoWindow
                    position={{ lat: selectedDesk.lat, lng: selectedDesk.lng }}
                    onCloseClick={() => setSelectedDeskId(null)}
                    maxWidth={320}
                  >
                    <div className="p-1 text-slate-900 space-y-2">
                      <div className="text-[11px] font-semibold text-emerald-700">
                        AUTHORIZED CUSTODY DESK
                      </div>
                      <h4 className="text-sm font-bold">{selectedDesk.name}</h4>
                      <p className="text-xs text-slate-600">{selectedDesk.floorRoom}</p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        Hours: {selectedDesk.operatingHours}
                      </p>
                      <p className="text-xs text-slate-500">{selectedDesk.contactChannel}</p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDesk.lat},${selectedDesk.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline pt-1"
                      >
                        Open Walking Directions <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </div>

            {/* Map Legend & Privacy Footer Bar */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-xs bg-rose-600 inline-block" /> Lost Report
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" /> Found Report
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-xs bg-emerald-700 inline-block" /> Authorized Custody Desk
                </span>
              </div>
              <span>
                Privacy Guardrail: Sensitive items display approximate building coordinates only.
              </span>
            </div>
          </div>

          {/* Synchronized Side Results Panel */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col max-h-[572px] shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Synchronized Campus Feed
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {filteredReports.length} reports · {custodyDesks.length} custody desks
                </p>
              </div>
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div className="overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 flex-1">
              {filteredReports.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => {
                    setSelectedDeskId(null);
                    setSelectedReportId(rep.id);
                    setCameraCenter({ lat: rep.lat, lng: rep.lng });
                    setCameraZoom(17);
                  }}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    selectedReportId === rep.id ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span
                      className={
                        rep.type === 'lost'
                          ? 'font-semibold text-rose-600 dark:text-rose-400'
                          : 'font-semibold text-emerald-600 dark:text-emerald-400'
                      }
                    >
                      {rep.type === 'lost' ? 'Lost' : 'Found'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{rep.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{rep.status}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {rep.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mb-2">
                    {rep.approximateLocationLabel} · {rep.color}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono tabular-nums">
                      {rep.incidentDate} · ~
                      {estimateDistanceMeters(cameraCenter.lat, cameraCenter.lng, rep.lat, rep.lng)}m
                    </span>
                    <div className="flex items-center gap-2">
                      {onSendToCanvasZone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendToCanvasZone(rep, 'ZONE_3_FIND_MATCHES');
                          }}
                          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Send to Canvas →
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(rep);
                        }}
                        className="font-semibold text-slate-600 dark:text-slate-300 hover:underline"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Custody Desks Section inside Synchronized Panel */}
              {showDesks && (
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Authorized Handover &amp; Custody Desks
                  </div>
                  {custodyDesks.map((desk) => (
                    <div
                      key={desk.id}
                      onClick={() => {
                        setSelectedReportId(null);
                        setSelectedDeskId(desk.id);
                        setCameraCenter({ lat: desk.lat, lng: desk.lng });
                        setCameraZoom(17);
                      }}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors"
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {desk.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {desk.floorRoom} · <span className="font-mono tabular-nums">{desk.operatingHours}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </APIProvider>
  );
};
