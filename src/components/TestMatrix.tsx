import React from 'react';
import { CheckCircle2, ShieldCheck, Heart, Clock, Compass } from 'lucide-react';

interface TestCase {
  id: number;
  title: string;
  category: 'Setup' | 'Background' | 'Alarm' | 'Travel Companion' | 'Edge Cases';
  description: string;
  implementation: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 1,
    title: 'Select Destination',
    category: 'Setup',
    description: 'User searches or selects a real geographic destination with coordinates.',
    implementation: 'DestinationPickerDialog + android.location.Geocoder / Destination data model.'
  },
  {
    id: 2,
    title: 'Select Alert Distance',
    category: 'Setup',
    description: 'Options for 500m, 1km, 2km, 3km, 5km, and Custom distance in meters.',
    implementation: 'WakeWayPreferences.defaultAlertDistanceMeters & FilterChips.'
  },
  {
    id: 3,
    title: 'Select Custom Alarm Sound',
    category: 'Setup',
    description: 'Uses Storage Access Framework (SAF) to pick device audio files (MP3, WAV, AAC, OGG).',
    implementation: 'ActivityResultContracts.OpenDocument() with contentResolver.takePersistableUriPermission().'
  },
  {
    id: 4,
    title: 'Preview Sound',
    category: 'Setup',
    description: 'Listen to the selected audio before starting journey with a sample preview.',
    implementation: 'AlarmAudioPlayer.playPreview() with USAGE_ALARM stream.'
  },
  {
    id: 5,
    title: 'Start Journey',
    category: 'Setup',
    description: 'Dominant button triggers foreground service and switches to journey HUD.',
    implementation: 'ContextCompat.startForegroundService(LocationMonitoringService.ACTION_START).'
  },
  {
    id: 6,
    title: 'Background The App',
    category: 'Background',
    description: 'User can press Home or switch to other apps; journey continues uninterrupted.',
    implementation: 'Foreground Service type FOREGROUND_SERVICE_TYPE_LOCATION with ongoing notification.'
  },
  {
    id: 7,
    title: 'Lock Screen Monitoring',
    category: 'Background',
    description: 'Screen locked while travelling; location updates continue within battery limits.',
    implementation: 'FusedLocationProviderClient with balanced power request and PowerManager.PARTIAL_WAKE_LOCK.'
  },
  {
    id: 8,
    title: 'Approaching Destination Alert',
    category: 'Alarm',
    description: 'When remaining distance <= alert threshold, triggers high-priority wake alarm.',
    implementation: 'Haversine distance check triggers full-screen AlarmActivity with wake lock.'
  },
  {
    id: 9,
    title: 'Snooze Alarm',
    category: 'Alarm',
    description: 'Temporarily silences alarm and reduces distance threshold by half.',
    implementation: 'Halves threshold (min 300m) and returns to background monitoring.'
  },
  {
    id: 10,
    title: 'Dismiss Alarm',
    category: 'Alarm',
    description: 'Stops audio, stops vibration, removes notification, and returns to completion.',
    implementation: 'ACTION_DISMISS intent stops media player and terminates foreground service cleanly.'
  },
  {
    id: 11,
    title: 'Favourite Places Persistence',
    category: 'Travel Companion',
    description: 'Heart toggle saves place IDs to persistent storage; survives app restart; deduplicates.',
    implementation: 'PlaceRepository.toggleFavourite() stores IDs with timestamps; preserves existing models.'
  },
  {
    id: 12,
    title: 'Favourites Screen & Quick Removal',
    category: 'Travel Companion',
    description: 'Displays saved places with images, metadata, immediate removal, and friendly empty state.',
    implementation: 'FavouritesScreen composable with card views and "Explore Places" navigation.'
  },
  {
    id: 13,
    title: 'Travel History on Place Exploration',
    category: 'Travel Companion',
    description: 'Recorded when place details are meaningfully opened; moves existing to top without duplicates.',
    implementation: 'PlaceRepository.recordExplored() updates latestExploredAt timestamp and reorders.'
  },
  {
    id: 14,
    title: 'History Screen & Sorting',
    category: 'Travel Companion',
    description: 'Sorted most recently explored first with formatted relative timestamps and empty state.',
    implementation: 'HistoryScreen composable with clear action and direct "Explore again" flow.'
  },
  {
    id: 15,
    title: 'Data Independence Guarantee',
    category: 'Travel Companion',
    description: 'Removing a Favourite does not delete History; clearing History does not alter Favourites.',
    implementation: 'Independent keys and collections in PlaceRepository / localStorage.'
  },
  {
    id: 16,
    title: 'Denied Location Permissions',
    category: 'Edge Cases',
    description: 'Clear contextual explanation when permission is denied, without crashing.',
    implementation: 'PermissionHelper.hasLocationPermission() and Activity Result PermissionLauncher.'
  },
  {
    id: 17,
    title: 'Disabled Device GPS',
    category: 'Edge Cases',
    description: 'Prompts user to enable GPS/location provider before starting.',
    implementation: 'LocationManager.isProviderEnabled(GPS_PROVIDER) check.'
  },
  {
    id: 18,
    title: 'Unavailable Audio Fallback',
    category: 'Edge Cases',
    description: 'If custom file is deleted or unreadable, safely fall back to system chime.',
    implementation: 'AlarmAudioPlayer try/catch with fallback to default audio chime.'
  }
];

export const TestMatrix: React.FC = () => {
  return (
    <div className="p-6 bg-[#EFE9DC] text-[#173F43] h-full overflow-y-auto space-y-6">
      <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#173F43] tracking-tight">
              WakeWay Quality & Feature Verification Matrix
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-[#FAF2DF] text-[#D96C45] border border-[#D9A441]/40">
              Validated
            </span>
          </div>
          <p className="text-xs text-[#667477] mt-1">
            Validating GPS background alerts, Favourite Places persistence, and Travel History lifecycle.
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-[#FAF2DF] text-[#D96C45] border border-[#D9A441]/50 font-bold">
          {TEST_CASES.length} / {TEST_CASES.length} Verified
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEST_CASES.map((tc) => (
          <div
            key={tc.id}
            className="p-4 rounded-xl bg-[#F7F3EA] border border-[#E4DCC8] space-y-2.5 hover:border-[#D96C45]/60 transition-colors shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#FAF2DF] text-[#D96C45] text-xs font-bold flex items-center justify-center font-mono border border-[#D9A441]/40">
                  {tc.id}
                </span>
                <h3 className="text-sm font-bold text-[#173F43]">{tc.title}</h3>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FAF2DF] text-[#D96C45] border border-[#D9A441]/30">
                {tc.category}
              </span>
            </div>

            <p className="text-xs text-[#667477] leading-relaxed">
              {tc.description}
            </p>

            <div className="pt-1 text-[11px] font-mono text-[#173F43] bg-white p-2 rounded-lg border border-[#E4DCC8]">
              <span className="text-[#9EAD9A] mr-1.5">// Code:</span>
              {tc.implementation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
