import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Smartphone, FileCode2, CheckCircle2, Download } from 'lucide-react';
import { Destination, JourneySession, UserPreferences, FavouritePlace, HistoryEntry } from './types';
import { HomeScreen } from './components/HomeScreen';
import { JourneyScreen } from './components/JourneyScreen';
import { AlarmScreen } from './components/AlarmScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { DestinationModal } from './components/DestinationModal';
import { PlaceDetailsScreen } from './components/PlaceDetailsScreen';
import { FavouritesScreen } from './components/FavouritesScreen';
import { HistoryScreen, HistoryItemWithPlace } from './components/HistoryScreen';
import { BottomNav, NavView } from './components/BottomNav';
import { DeviceFrame } from './components/DeviceFrame';
import { ProjectExplorer } from './components/ProjectExplorer';
import { TestMatrix } from './components/TestMatrix';
import { DEFAULT_PLACES, getPlaceId, findPlaceById } from './data/places';
import { calculateHaversineDistance } from './utils/distance';
import { audioEngine } from './utils/audioEngine';
import { downloadAndroidProjectZip } from './utils/zipGenerator';

const DEFAULT_PREFERENCES: UserPreferences = {
  alarmSoundName: 'WakeWay Gentle Chime (Default)',
  customAudioBlobUrl: null,
  isVibrationEnabled: true,
  defaultAlertDistanceMeters: 1000
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'app' | 'code' | 'testing'>('app');
  const [activeView, setActiveView] = useState<NavView | 'journey' | 'alarm'>('home');
  const [previousView, setPreviousView] = useState<'home' | 'favourites' | 'history'>('home');
  const [inspectedPlace, setInspectedPlace] = useState<Destination | null>(DEFAULT_PLACES[0]);
  const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);

  // Selected state on Home
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(DEFAULT_PLACES[0]);
  const [selectedAlertDistanceMeters, setSelectedAlertDistanceMeters] = useState(1000);

  // Active Journey session
  const [journey, setJourney] = useState<JourneySession | null>(null);

  // User Preferences
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('wakeway_prefs');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return DEFAULT_PREFERENCES;
  });

  // ❤️ Favourites persistence
  const [favourites, setFavourites] = useState<FavouritePlace[]>(() => {
    try {
      const saved = localStorage.getItem('wakeway_favourites');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  // 🕘 Travel History persistence
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('wakeway_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  // Cache of dynamically discovered / custom search places
  const [customPlaces, setCustomPlaces] = useState<Record<string, Destination>>(() => {
    try {
      const saved = localStorage.getItem('wakeway_custom_places');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {};
  });

  // Current real device GPS
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Cache helper for custom places
  const saveCustomPlace = useCallback((place: Destination) => {
    const id = getPlaceId(place);
    setCustomPlaces((prev) => {
      if (prev[id]) return prev;
      const next = { ...prev, [id]: { ...place, id } };
      try {
        localStorage.setItem('wakeway_custom_places', JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  // Favourites helper
  const isPlaceFavourite = useCallback(
    (place: Destination | null): boolean => {
      if (!place) return false;
      const id = getPlaceId(place);
      return favourites.some((f) => f.placeId === id);
    },
    [favourites]
  );

  const handleToggleFavourite = useCallback(
    (place: Destination) => {
      const id = getPlaceId(place);
      saveCustomPlace(place);
      setFavourites((prev) => {
        const exists = prev.some((f) => f.placeId === id);
        let next: FavouritePlace[];
        if (exists) {
          next = prev.filter((f) => f.placeId !== id);
        } else {
          // Add to favourites with timestamp, no duplicates
          next = [{ placeId: id, savedAt: Date.now() }, ...prev.filter((f) => f.placeId !== id)];
        }
        try {
          localStorage.setItem('wakeway_favourites', JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    [saveCustomPlace]
  );

  const handleRemoveFavourite = useCallback((place: Destination) => {
    const id = getPlaceId(place);
    setFavourites((prev) => {
      const next = prev.filter((f) => f.placeId !== id);
      try {
        localStorage.setItem('wakeway_favourites', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  // Travel History helper: records only when place is meaningfully explored/opened
  const handleRecordExplored = useCallback(
    (place: Destination) => {
      const id = getPlaceId(place);
      saveCustomPlace(place);
      setHistory((prev) => {
        // Remove duplicate if already present and move to top
        const filtered = prev.filter((h) => h.placeId !== id);
        const next: HistoryEntry[] = [{ placeId: id, lastExploredAt: Date.now() }, ...filtered];
        try {
          localStorage.setItem('wakeway_history', JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    [saveCustomPlace]
  );

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.setItem('wakeway_history', '[]');
    } catch {
      // Ignore
    }
  }, []);

  // Meaningfully opens place details and logs into History
  const handleOpenPlaceDetails = useCallback(
    (place: Destination, fromView: 'home' | 'favourites' | 'history' = 'home') => {
      setInspectedPlace(place);
      setPreviousView(fromView);
      handleRecordExplored(place);
      setActiveView('place-details');
    },
    [handleRecordExplored]
  );

  // Set as Destination from Place Details
  const handleSelectAsDestination = useCallback((place: Destination) => {
    setSelectedDestination(place);
    setActiveView('home');
  }, []);

  // Resolved list of favourite places with full metadata
  const favouritePlacesList: Destination[] = useMemo(() => {
    return favourites
      .map((f) => findPlaceById(f.placeId, customPlaces))
      .filter((p): p is Destination => p !== null);
  }, [favourites, customPlaces]);

  // Resolved list of history items with full metadata
  const historyPlacesList: HistoryItemWithPlace[] = useMemo(() => {
    return history
      .map((h) => {
        const place = findPlaceById(h.placeId, customPlaces);
        if (!place) return null;
        return { place, lastExploredAt: h.lastExploredAt };
      })
      .filter((item): item is HistoryItemWithPlace => item !== null);
  }, [history, customPlaces]);

  // Set of favourite place IDs for fast lookup in search modal
  const favouritePlaceIdsSet = useMemo(() => {
    return new Set(favourites.map((f) => f.placeId));
  }, [favourites]);

  // Sync preferences to localStorage
  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(
          'wakeway_prefs',
          JSON.stringify({
            alarmSoundName: next.alarmSoundName,
            isVibrationEnabled: next.isVibrationEnabled,
            defaultAlertDistanceMeters: next.defaultAlertDistanceMeters,
            customAudioBlobUrl: null // don't serialize blob url
          })
        );
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // Get initial location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => {
          // Default to reference coordinate near destination (approx 4.2 km away)
          setCurrentCoords({
            lat: 17.4000,
            lng: 78.4700
          });
        }
      );
    }
  }, []);

  // Alarm Trigger helper
  const triggerAlarm = useCallback(
    (dest: Destination, distance: number) => {
      audioEngine.startAlarm(preferences.customAudioBlobUrl);
      setActiveView('alarm');
      setJourney((prev) =>
        prev
          ? {
              ...prev,
              status: 'triggered',
              currentDistanceMeters: distance
            }
          : null
      );
    },
    [preferences.customAudioBlobUrl]
  );

  // Watch real position when journey is active
  useEffect(() => {
    if (!journey || journey.status !== 'active') return;

    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const dist = calculateHaversineDistance(
            lat,
            lng,
            journey.destination.latitude,
            journey.destination.longitude
          );

          setJourney((prev) => (prev ? { ...prev, currentDistanceMeters: dist, userLat: lat, userLng: lng } : null));

          if (dist <= journey.alertDistanceMeters) {
            triggerAlarm(journey.destination, dist);
          }
        },
        () => {
          // Ignore location errors in watch
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [journey, triggerAlarm]);

  // Start Journey Action
  const handleStartJourney = () => {
    if (!selectedDestination) return;

    // Calculate initial distance
    const userLat = currentCoords?.lat ?? (selectedDestination.latitude - 0.035);
    const userLng = currentCoords?.lng ?? (selectedDestination.longitude - 0.035);
    const initialDist = calculateHaversineDistance(
      userLat,
      userLng,
      selectedDestination.latitude,
      selectedDestination.longitude
    );

    const newSession: JourneySession = {
      destination: selectedDestination,
      alertDistanceMeters: selectedAlertDistanceMeters,
      currentDistanceMeters: initialDist,
      startDistanceMeters: initialDist,
      userLat,
      userLng,
      status: 'active',
      startedAt: Date.now()
    };

    setJourney(newSession);
    setActiveView('journey');
  };

  // Cancel Journey Action
  const handleCancelJourney = () => {
    audioEngine.stop();
    setJourney(null);
    setActiveView('home');
  };

  // Dismiss Alarm Action
  const handleDismissAlarm = () => {
    audioEngine.stop();
    setJourney(null);
    setActiveView('home');
  };

  // Snooze Alarm Action
  const handleSnoozeAlarm = () => {
    audioEngine.stop();
    if (journey) {
      const nextThreshold = Math.max(300, Math.floor(journey.alertDistanceMeters / 2));
      setJourney({
        ...journey,
        alertDistanceMeters: nextThreshold,
        status: 'active'
      });
      setActiveView('journey');
    } else {
      setActiveView('home');
    }
  };

  // Test Simulation: Move closer
  const handleSimulateMoveCloser = (stepMeters: number) => {
    if (!journey || journey.currentDistanceMeters === null) return;
    const nextDist = Math.max(0, journey.currentDistanceMeters - stepMeters);
    setJourney({
      ...journey,
      currentDistanceMeters: nextDist
    });

    if (nextDist <= journey.alertDistanceMeters) {
      triggerAlarm(journey.destination, nextDist);
    }
  };

  // Test Simulation: Jump straight to alert distance
  const handleSimulateJumpToAlert = () => {
    if (!journey) return;
    const triggerDistance = Math.min(journey.alertDistanceMeters - 50, 400);
    setJourney({
      ...journey,
      currentDistanceMeters: triggerDistance
    });
    triggerAlarm(journey.destination, triggerDistance);
  };

  // Check if current view shows bottom nav
  const isNavVisible =
    activeView === 'home' ||
    activeView === 'favourites' ||
    activeView === 'history' ||
    activeView === 'settings' ||
    activeView === 'place-details';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#EFE9DC] text-[#173F43]">
      {/* Top Workspace Header */}
      <header className="h-14 border-b border-[#E4DCC8] bg-[#F7F3EA] flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D96C45] flex items-center justify-center text-white font-black text-base shadow-xs">
            W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider text-[#173F43] uppercase">WakeWay</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-[#FAF2DF] text-[#D96C45] border border-[#D9A441]/40">
                Travel Companion
              </span>
            </div>
            <div className="text-[11px] text-[#667477] -mt-0.5 hidden sm:block">
              Location-Based Journey & Arrival Alarm
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-[#E5DEC9] p-1 rounded-lg border border-[#D1C6AE]">
          <button
            id="tab-device-view"
            onClick={() => setActiveTab('app')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all btn-press ${
              activeTab === 'app'
                ? 'bg-[#D96C45] text-white shadow-xs'
                : 'text-[#667477] hover:text-[#173F43]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Interactive App</span>
          </button>

          <button
            id="tab-code-view"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all btn-press ${
              activeTab === 'code'
                ? 'bg-[#D96C45] text-white shadow-xs'
                : 'text-[#667477] hover:text-[#173F43]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Android Studio Code</span>
          </button>

          <button
            id="tab-test-matrix"
            onClick={() => setActiveTab('testing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all btn-press ${
              activeTab === 'testing'
                ? 'bg-[#D96C45] text-white shadow-xs'
                : 'text-[#667477] hover:text-[#173F43]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">16-Point Verification</span>
            <span className="md:hidden">Matrix</span>
          </button>
        </div>

        {/* Quick 1-Click ZIP Download */}
        <div className="flex items-center gap-2">
          <button
            id="btn-header-download-zip"
            onClick={() => downloadAndroidProjectZip()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#D1C6AE] hover:border-[#D96C45] bg-[#F7F3EA] text-[#173F43] hover:text-[#D96C45] text-xs font-semibold transition-all btn-press shadow-2xs"
            title="Download ready-to-run Android Studio project"
          >
            <Download className="w-3.5 h-3.5 text-[#D96C45]" />
            <span>Export Android (.zip)</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Canvas */}
      <div className="flex-1 overflow-hidden relative bg-[#EFE9DC]">
        {activeTab === 'app' && (
          <div className="w-full h-full flex items-center justify-center p-4 bg-[#EFE9DC] overflow-y-auto">
            <DeviceFrame>
              <div className="flex flex-col h-full overflow-hidden relative">
                {/* Active Inner Screen */}
                <div className="flex-1 overflow-hidden relative">
                  {activeView === 'home' && (
                    <HomeScreen
                      preferences={preferences}
                      selectedDestination={selectedDestination}
                      selectedAlertDistanceMeters={selectedAlertDistanceMeters}
                      isDestinationFavourite={isPlaceFavourite(selectedDestination)}
                      onSelectDestinationClick={() => setIsDestinationModalOpen(true)}
                      onAlertDistanceChange={(m) => setSelectedAlertDistanceMeters(m)}
                      onStartJourney={handleStartJourney}
                      onOpenSettings={() => setActiveView('settings')}
                      onToggleFavouriteDestination={() => {
                        if (selectedDestination) handleToggleFavourite(selectedDestination);
                      }}
                      onViewDestinationDetails={() => {
                        if (selectedDestination) handleOpenPlaceDetails(selectedDestination, 'home');
                      }}
                      onUpdatePreferences={handleUpdatePreferences}
                    />
                  )}

                  {activeView === 'favourites' && (
                    <FavouritesScreen
                      favouritePlaces={favouritePlacesList}
                      onOpenPlaceDetails={(p) => handleOpenPlaceDetails(p, 'favourites')}
                      onRemoveFavourite={handleRemoveFavourite}
                      onExplorePlaces={() => {
                        setActiveView('home');
                        setIsDestinationModalOpen(true);
                      }}
                    />
                  )}

                  {activeView === 'history' && (
                    <HistoryScreen
                      historyItems={historyPlacesList}
                      onOpenPlaceDetails={(p) => handleOpenPlaceDetails(p, 'history')}
                      onClearHistory={handleClearHistory}
                      onExplorePlaces={() => {
                        setActiveView('home');
                        setIsDestinationModalOpen(true);
                      }}
                    />
                  )}

                  {activeView === 'place-details' && inspectedPlace && (
                    <PlaceDetailsScreen
                      place={inspectedPlace}
                      isFavourite={isPlaceFavourite(inspectedPlace)}
                      onToggleFavourite={handleToggleFavourite}
                      onSelectAsDestination={handleSelectAsDestination}
                      onBack={() => setActiveView(previousView)}
                    />
                  )}

                  {activeView === 'journey' && journey && (
                    <JourneyScreen
                      destination={journey.destination}
                      alertDistanceMeters={journey.alertDistanceMeters}
                      currentDistanceMeters={journey.currentDistanceMeters}
                      onCancelJourney={handleCancelJourney}
                      onSimulateMoveCloser={handleSimulateMoveCloser}
                      onSimulateJumpToAlert={handleSimulateJumpToAlert}
                    />
                  )}

                  {activeView === 'alarm' && journey && (
                    <AlarmScreen
                      destination={journey.destination}
                      distanceRemaining={journey.currentDistanceMeters ?? 0}
                      onDismiss={handleDismissAlarm}
                      onSnooze={handleSnoozeAlarm}
                      isVibrationEnabled={preferences.isVibrationEnabled}
                    />
                  )}

                  {activeView === 'settings' && (
                    <SettingsScreen
                      preferences={preferences}
                      onUpdatePreferences={handleUpdatePreferences}
                      onBack={() => setActiveView('home')}
                    />
                  )}
                </div>

                {/* Persistent Android Navigation Bar */}
                {isNavVisible && (
                  <BottomNav
                    activeView={activeView as NavView}
                    favouritesCount={favourites.length}
                    onNavigate={(view) => setActiveView(view)}
                  />
                )}
              </div>
            </DeviceFrame>
          </div>
        )}

        {activeTab === 'code' && <ProjectExplorer />}

        {activeTab === 'testing' && <TestMatrix />}
      </div>

      {/* Destination Search / Selection Modal */}
      <DestinationModal
        isOpen={isDestinationModalOpen}
        onClose={() => setIsDestinationModalOpen(false)}
        onSelect={(dest) => {
          handleOpenPlaceDetails(dest, 'home');
        }}
        currentUserLocation={currentCoords}
        favouritePlaceIds={favouritePlaceIdsSet}
      />
    </div>
  );
}

