import React, {
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';

import {
  Destination,
  JourneySession,
  UserPreferences,
  FavouritePlace,
  HistoryEntry
} from './types';

import { HomeScreen } from './components/HomeScreen';
import { JourneyScreen } from './components/JourneyScreen';

import { AlarmScreen } from './components/AlarmScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { DestinationModal } from './components/DestinationModal';
import { PlaceDetailsScreen } from './components/PlaceDetailsScreen';

import {
  FavouritesScreen
} from './components/FavouritesScreen';

import {
  HistoryScreen,
  HistoryItemWithPlace
} from './components/HistoryScreen';

import {
  BottomNav,
  NavView
} from './components/BottomNav';

import {
  DEFAULT_PLACES,
  getPlaceId,
  findPlaceById
} from './data/places';

import {
  calculateHaversineDistance
} from './utils/distance';

import {
  audioEngine
} from './utils/audioEngine';


/*
 * Android WebView bridge.
 *
 * MainActivity.kt exposes these functions through:
 *
 * window.WakeWayAndroid
 */
declare global {
  interface Window {
    WakeWayAndroid?: {
      hasCustomAudio: () => boolean;
      getCustomAudioName: () => string;
      getCustomAudioDataUrl: () => string;
      deleteCustomAudio: () => void;

      getSharedLocation: () => string;
    };
  }
}


const DEFAULT_PREFERENCES: UserPreferences = {
  alarmSoundName:
    'WakeWay Gentle Chime (Default)',

  customAudioBlobUrl: null,

  isVibrationEnabled: true,

  defaultAlertDistanceMeters: 1000
};


export default function App() {

  const [activeView, setActiveView] =
    useState<
      NavView | 'journey' | 'alarm'
    >('home');


  const [previousView, setPreviousView] =
    useState<
      'home' |
      'favourites' |
      'history'
    >('home');


  const [inspectedPlace, setInspectedPlace] =
    useState<Destination | null>(
      DEFAULT_PLACES[0]
    );


  const [isDestinationModalOpen, setIsDestinationModalOpen] =
    useState(false);


  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(
      DEFAULT_PLACES[0]
    );


  const [selectedAlertDistanceMeters, setSelectedAlertDistanceMeters] =
    useState(1000);


  const [journey, setJourney] =
    useState<JourneySession | null>(null);


  const [preferences, setPreferences] =
    useState<UserPreferences>(() => {

      try {

        const saved =
          localStorage.getItem(
            'wakeway_prefs'
          );

        if (saved) {

          return {
            ...DEFAULT_PREFERENCES,
            ...JSON.parse(saved)
          };
        }

      } catch {
        // Ignore invalid saved preferences
      }

      return DEFAULT_PREFERENCES;
    });


  const [favourites, setFavourites] =
    useState<FavouritePlace[]>(() => {

      try {

        const saved =
          localStorage.getItem(
            'wakeway_favourites'
          );

        if (saved) {
          return JSON.parse(saved);
        }

      } catch {
        // Ignore invalid saved favourites
      }

      return [];
    });


  const [history, setHistory] =
    useState<HistoryEntry[]>(() => {

      try {

        const saved =
          localStorage.getItem(
            'wakeway_history'
          );

        if (saved) {
          return JSON.parse(saved);
        }

      } catch {
        // Ignore invalid saved history
      }

      return [];
    });


  const [customPlaces, setCustomPlaces] =
    useState<Record<string, Destination>>(() => {

      try {

        const saved =
          localStorage.getItem(
            'wakeway_custom_places'
          );

        if (saved) {
          return JSON.parse(saved);
        }

      } catch {
        // Ignore invalid saved places
      }

      return {};
    });


  const [currentCoords, setCurrentCoords] =
    useState<{
      lat: number;
      lng: number;
    } | null>(null);


  /*
   * --------------------------------------------------
   * RESTORE SAVED ANDROID ALARM
   * --------------------------------------------------
   *
   * The Android side permanently stores the selected
   * audio file.
   *
   * When the app starts again, Android provides the
   * saved audio as a data URL.
   *
   * This restores it into React's preferences.
   */
  useEffect(() => {

    try {

      const android =
        window.WakeWayAndroid;

      /*
       * Normal browser / development mode.
       * The Android bridge does not exist there.
       */
      if (!android) {
        return;
      }


      const hasCustomAudio =
        android.hasCustomAudio();


      if (!hasCustomAudio) {
        return;
      }


      const audioDataUrl =
        android.getCustomAudioDataUrl();


      const audioName =
        android.getCustomAudioName();


      if (!audioDataUrl) {
        console.warn(
          'WakeWay: Android has saved audio, but no audio data was returned.'
        );

        return;
      }


      /*
       * Restore the saved audio into React state.
       */
      setPreferences((prev) => {

        const restored = {
          ...prev,

          customAudioBlobUrl:
            audioDataUrl,

          alarmSoundName:
            audioName ||
            prev.alarmSoundName
        };


        /*
         * Also keep the restored filename in
         * localStorage so the name survives.
         *
         * The actual audio remains stored by Android.
         */
        try {

          const preferencesToSave = {
            ...restored,

            /*
             * Do NOT put the huge data URL into
             * localStorage.
             */
            customAudioBlobUrl: null
          };


          localStorage.setItem(
            'wakeway_prefs',
            JSON.stringify(
              preferencesToSave
            )
          );

        } catch {
          // Ignore localStorage errors
        }


        return restored;
      });


      console.log(
        '✅ WakeWay: custom alarm restored from Android:',
        audioName
      );

    } catch (error) {

      console.error(
        '❌ WakeWay: failed to restore custom alarm:',
        error
      );

    }

  }, []);


  const saveCustomPlace =
    useCallback(
      (place: Destination) => {

        const placeId =
          getPlaceId(place);


        setCustomPlaces((prev) => {

          const updated = {
            ...prev,
            [placeId]: place
          };


          localStorage.setItem(
            'wakeway_custom_places',
            JSON.stringify(updated)
          );


          return updated;
        });

      },
      []
    );


  const isPlaceFavourite =
    useCallback(
      (place: Destination) => {

        const placeId =
          getPlaceId(place);


        return favourites.some(
          (favourite) =>
            favourite.placeId === placeId
        );

      },
      [favourites]
    );


  const handleToggleFavourite =
    useCallback(
      (place: Destination) => {

        const placeId =
          getPlaceId(place);


        setFavourites((prev) => {

          const exists =
            prev.some(
              (favourite) =>
                favourite.placeId === placeId
            );


          const updated =
            exists
              ? prev.filter(
                  (favourite) =>
                    favourite.placeId !== placeId
                )
              : [
                  ...prev,
                  {
                    placeId,
                    savedAt: Date.now()
                  }
                ];


          localStorage.setItem(
            'wakeway_favourites',
            JSON.stringify(updated)
          );


          return updated;
        });

      },
      []
    );


  const handleRemoveFavourite =
    useCallback(
      (place: Destination) => {

        const placeId =
          getPlaceId(place);


        setFavourites((prev) => {

          const updated =
            prev.filter(
              (favourite) =>
                favourite.placeId !== placeId
            );


          localStorage.setItem(
            'wakeway_favourites',
            JSON.stringify(updated)
          );


          return updated;
        });

      },
      []
    );


  const handleRecordExplored =
    useCallback(
      (place: Destination) => {

        const placeId =
          getPlaceId(place);


        setHistory((prev) => {

          const filtered =
            prev.filter(
              (entry) =>
                entry.placeId !== placeId
            );


          const updated = [
            {
              placeId,
              lastExploredAt:
                Date.now()
            },
            ...filtered
          ];


          localStorage.setItem(
            'wakeway_history',
            JSON.stringify(updated)
          );


          return updated;
        });

      },
      []
    );


  const handleClearHistory =
    useCallback(() => {

      setHistory([]);

      localStorage.setItem(
        'wakeway_history',
        JSON.stringify([])
      );

    }, []);


  const handleOpenPlaceDetails =
    useCallback(
      (
        place: Destination,
        fromView:
          | 'home'
          | 'favourites'
          | 'history'
      ) => {

        setInspectedPlace(place);

        setPreviousView(fromView);

        handleRecordExplored(place);

        setActiveView(
          'place-details'
        );

      },
      [handleRecordExplored]
    );


  const handleSelectAsDestination =
    useCallback(
      (place: Destination) => {

        setSelectedDestination(place);

        setActiveView('home');

      },
      []
    );


  const favouritePlacesList =
    useMemo(() => {

      return favourites

        .map((favourite) => {

          return (
            findPlaceById(
              favourite.placeId
            ) ||
            customPlaces[
              favourite.placeId
            ]
          );

        })

        .filter(
          (
            place
          ): place is Destination =>
            Boolean(place)
        );

    }, [
      favourites,
      customPlaces
    ]);


  const historyPlacesList =
    useMemo(() => {

      return history

        .map((entry) => {

          const place =
            findPlaceById(
              entry.placeId
            ) ||
            customPlaces[
              entry.placeId
            ];


          if (!place) {
            return null;
          }


          return {
            place,
            lastExploredAt:
              entry.lastExploredAt
          } as HistoryItemWithPlace;

        })

        .filter(
          (
            item
          ): item is HistoryItemWithPlace =>
            Boolean(item)
        );

    }, [
      history,
      customPlaces
    ]);


  const favouritePlaceIdsSet =
    useMemo(() => {

      return new Set(
        favourites.map(
          (favourite) =>
            favourite.placeId
        )
      );

    }, [favourites]);


  /*
   * --------------------------------------------------
   * UPDATE PREFERENCES
   * --------------------------------------------------
   */
  const handleUpdatePreferences =
    useCallback(
      (
        updated: Partial<UserPreferences>
      ) => {

        setPreferences((prev) => {

          const next = {
            ...prev,
            ...updated
          };


          try {

            /*
             * Store normal settings and filename.
             *
             * NEVER store the actual audio data URL
             * in localStorage.
             *
             * Android permanently stores the actual
             * audio file.
             */
            const preferencesToSave = {
              ...next,
              customAudioBlobUrl: null
            };


            localStorage.setItem(
              'wakeway_prefs',
              JSON.stringify(
                preferencesToSave
              )
            );

          } catch {
            // Ignore localStorage errors
          }


          return next;
        });

      },
      []
    );



      /*
   * --------------------------------------------------
   * RECEIVE SHARED LOCATION FROM ANDROID
   * --------------------------------------------------
   *
   * Flow:
   *
   * Google Maps
   *     ↓
   * Android Share Sheet
   *     ↓
   * MainActivity.kt
   *     ↓
   * wakewaySharedLocation event
   *     ↓
   * React
   *     ↓
   * selectedDestination
   */
  useEffect(() => {

    const handleSharedLocation = (
      event: Event
    ) => {

      try {

        const customEvent =
          event as CustomEvent<string>;

        const rawData =
          customEvent.detail;

        if (!rawData) {
          console.warn(
            'WakeWay: Shared location event had no data.'
          );
          return;
        }

        const sharedLocation =
          typeof rawData === 'string'
            ? JSON.parse(rawData)
            : rawData;

        console.log(
          '📍 WakeWay: Received shared location:',
          sharedLocation
        );

        const latitude =
          Number(
            sharedLocation.latitude
          );

        const longitude =
          Number(
            sharedLocation.longitude
          );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {

          console.error(
            'WakeWay: Invalid shared coordinates:',
            sharedLocation
          );

          return;
        }

        const destination: Destination = {

          id:
            sharedLocation.id ||
            `shared-${latitude}-${longitude}`,

          name:
            sharedLocation.name ||
            'Shared Location',

          address:
            sharedLocation.address ||
            `${latitude}, ${longitude}`,

          latitude,

          longitude,

          category:
            'Shared Location'
        };

        console.log(
          '✅ WakeWay: Setting shared location as destination:',
          destination
        );

        /*
         * Save it so it can participate in the
         * existing favourites/history/custom-place
         * system.
         */
        saveCustomPlace(
          destination
        );

        /*
         * This is the important part:
         * use the SAME destination state that
         * normal search uses.
         */
        setSelectedDestination(
          destination
        );

        /*
         * Make sure the user is returned to
         * the normal Home screen.
         */
        setIsDestinationModalOpen(
          false
        );

        setActiveView(
          'home'
        );

      } catch (error) {

        console.error(
          '❌ WakeWay: Failed to process shared location:',
          error
        );

      }

    };


    /*
     * Listen for the event sent by MainActivity.kt.
     */
    window.addEventListener(
      'wakewaySharedLocation',
      handleSharedLocation
    );


    /*
     * Also check whether Android already has
     * a shared location waiting for React.
     *
     * This helps when WakeWay is opened from
     * the Android share sheet before React's
     * event listener is ready.
     */
    try {

      const android =
        window.WakeWayAndroid;

      if (android) {

        const pending =
          android.getSharedLocation();

        if (pending) {

          console.log(
            '📍 WakeWay: Found pending shared location.'
          );

          handleSharedLocation(
            new CustomEvent(
              'wakewaySharedLocation',
              {
                detail: pending
              }
            )
          );

        }

      }

    } catch (error) {

      console.error(
        'WakeWay: Failed to read pending shared location:',
        error
      );

    }


    return () => {

      window.removeEventListener(
        'wakewaySharedLocation',
        handleSharedLocation
      );

    };

  }, [
    saveCustomPlace
  ]);
  /*
   * --------------------------------------------------
   * GET CURRENT LOCATION
   * --------------------------------------------------
   */
  useEffect(() => {

    if (
      !('geolocation' in navigator)
    ) {

      setCurrentCoords({
        lat: 17.4000,
        lng: 78.4700
      });

      return;
    }


    navigator.geolocation.getCurrentPosition(

      (pos) => {

        setCurrentCoords({
          lat:
            pos.coords.latitude,

          lng:
            pos.coords.longitude
        });

      },

      () => {

        setCurrentCoords({
          lat: 17.4000,
          lng: 78.4700
        });

      }

    );

  }, []);


  /*
   * --------------------------------------------------
   * TRIGGER ALARM
   * --------------------------------------------------
   */
  const triggerAlarm =
    useCallback(
      (
        dest: Destination,
        distance: number
      ) => {

        /*
         * Use the restored Android data URL when
         * a custom sound has been selected.
         */
        audioEngine.startAlarm(
          preferences.customAudioBlobUrl
        );


        setJourney((prev) => {

          if (!prev) {
            return prev;
          }


          return {
            ...prev,
            status: 'alarm',
            currentDistanceMeters:
              distance
          };

        });


        setActiveView('alarm');

      },
      [
        preferences.customAudioBlobUrl,
        preferences.isVibrationEnabled
      ]
    );


  /*
   * --------------------------------------------------
   * GPS JOURNEY TRACKING
   * --------------------------------------------------
   */
  useEffect(() => {

    if (
      !journey ||
      journey.status !== 'active' ||
      !selectedDestination
    ) {
      return;
    }


    if (
      !('geolocation' in navigator)
    ) {
      return;
    }


    const watchId =
      navigator.geolocation.watchPosition(

        (position) => {

          const current = {
            lat:
              position.coords.latitude,

            lng:
              position.coords.longitude
          };


          setCurrentCoords(current);


          const distance =
            calculateHaversineDistance(
              current.lat,
              current.lng,
              selectedDestination.latitude,
              selectedDestination.longitude
            );


          const speedKmh =
            position.coords.speed !== null &&
            position.coords.speed >= 0

              ? position.coords.speed * 3.6

              : 0;


          setJourney((prev) => {

            if (
              !prev ||
              prev.status !== 'active'
            ) {
              return prev;
            }


            return {
              ...prev,

              currentDistanceMeters:
                distance,

              currentSpeedKmh:
                speedKmh,

              lastUpdatedAt:
                Date.now()
            };

          });


          if (
            distance <=
            journey.alertDistanceMeters
          ) {

            triggerAlarm(
              selectedDestination,
              distance
            );

          }

        },

        () => {
          // GPS errors are handled silently.
        },

        {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 10000
        }

      );


    return () => {

      navigator.geolocation.clearWatch(
        watchId
      );

    };

  }, [
    journey?.status,
    journey?.alertDistanceMeters,
    selectedDestination,
    triggerAlarm
  ]);


  /*
   * --------------------------------------------------
   * START JOURNEY
   * --------------------------------------------------
   */
  const handleStartJourney =
    useCallback(() => {

      console.log(
        '🚀 START JOURNEY CLICKED'
      );


      console.log(
        'Selected destination:',
        selectedDestination
      );


      console.log(
        'Current coordinates:',
        currentCoords
      );


      if (!selectedDestination) {

        console.log(
          '❌ No destination selected'
        );

        return;
      }


      const initialDistance =
        currentCoords

          ? calculateHaversineDistance(
              currentCoords.lat,
              currentCoords.lng,
              selectedDestination.latitude,
              selectedDestination.longitude
            )

          : null;


      console.log(
        '📍 Initial distance:',
        initialDistance
      );


      const newJourney: JourneySession = {

        destination:
          selectedDestination,

        alertDistanceMeters:
          selectedAlertDistanceMeters,

        currentDistanceMeters:
          initialDistance,

        currentSpeedKmh:
          0,

        status:
          'active',

        startedAt:
          Date.now(),

        lastUpdatedAt:
          Date.now()
      };


      setJourney(newJourney);

      setActiveView('journey');

    }, [
      selectedDestination,
      selectedAlertDistanceMeters,
      currentCoords
    ]);


  /*
   * --------------------------------------------------
   * CANCEL JOURNEY
   * --------------------------------------------------
   */
  const handleCancelJourney =
    useCallback(() => {

      audioEngine.stop();


      setJourney((prev) => {

        if (prev) {

          handleRecordExplored(
            prev.destination
          );

        }


        return null;

      });


      setActiveView('home');

    }, [
      handleRecordExplored
    ]);


  /*
   * --------------------------------------------------
   * DISMISS ALARM
   * --------------------------------------------------
   */
  const handleDismissAlarm =
    useCallback(() => {

      audioEngine.stop();


      setJourney((prev) => {

        if (!prev) {
          return prev;
        }


        handleRecordExplored(
          prev.destination
        );


        return {
          ...prev,
          status: 'completed'
        };

      });


      setActiveView('home');

    }, [
      handleRecordExplored
    ]);


  /*
   * --------------------------------------------------
   * SNOOZE ALARM
   * --------------------------------------------------
   */
  const handleSnoozeAlarm =
    useCallback(() => {

      audioEngine.stop();


      setJourney((prev) => {

        if (!prev) {
          return prev;
        }


        return {
          ...prev,
          status: 'active'
        };

      });


      setActiveView('journey');

    }, []);


  /*
   * --------------------------------------------------
   * SIMULATION
   * --------------------------------------------------
   */
  const handleSimulateMoveCloser =
    useCallback(
      (stepMeters: number) => {

        if (
          !journey ||
          journey.currentDistanceMeters ===
            null
        ) {
          return;
        }


        const nextDist =
          Math.max(
            0,
            journey.currentDistanceMeters -
              stepMeters
          );


        setJourney({
          ...journey,

          currentDistanceMeters:
            nextDist
        });


        if (
          nextDist <=
          journey.alertDistanceMeters
        ) {

          triggerAlarm(
            journey.destination,
            nextDist
          );

        }

      },
      [
        journey,
        triggerAlarm
      ]
    );


  const handleSimulateJumpToAlert =
    useCallback(() => {

      if (!journey) {
        return;
      }


      const triggerDistance =
        Math.min(
          Math.max(
            journey.alertDistanceMeters -
              50,
            0
          ),
          400
        );


      setJourney({
        ...journey,

        currentDistanceMeters:
          triggerDistance
      });


      triggerAlarm(
        journey.destination,
        triggerDistance
      );

    }, [
      journey,
      triggerAlarm
    ]);


  const isNavVisible =
    activeView === 'home' ||
    activeView === 'favourites' ||
    activeView === 'history' ||
    activeView === 'settings' ||
    activeView === 'place-details';


  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#F7F3EA] text-[#173F43]">

      <div className="flex-1 overflow-hidden relative">

        {/* HOME */}
        {activeView === 'home' && (
          <HomeScreen

            preferences={
              preferences
            }

            selectedDestination={
              selectedDestination
            }

            selectedAlertDistanceMeters={
              selectedAlertDistanceMeters
            }

            onSelectDestinationClick={() => {
              setIsDestinationModalOpen(
                true
              );
            }}

            isDestinationFavourite={
              selectedDestination
                ? isPlaceFavourite(
                    selectedDestination
                  )
                : false
            }

            onToggleFavouriteDestination={() => {

              if (selectedDestination) {

                handleToggleFavourite(
                  selectedDestination
                );

              }

            }}

            onViewDestinationDetails={() => {

              if (selectedDestination) {

                handleOpenPlaceDetails(
                  selectedDestination,
                  'home'
                );

              }

            }}

            onAlertDistanceChange={
              setSelectedAlertDistanceMeters
            }

            onStartJourney={
              handleStartJourney
            }

            onOpenSettings={() => {
              setActiveView(
                'settings'
              );
            }}

            onUpdatePreferences={(
              updated
            ) => {

              handleUpdatePreferences(
                updated
              );

            }}

          />
        )}


        {/* FAVOURITES */}
        {activeView === 'favourites' && (
          <FavouritesScreen

            favouritePlaces={
              favouritePlacesList
            }

            onOpenPlaceDetails={(place) =>
              handleOpenPlaceDetails(
                place,
                'favourites'
              )
            }

            onRemoveFavourite={
              handleRemoveFavourite
            }

            onExplorePlaces={() => {

              setActiveView(
                'home'
              );

              setIsDestinationModalOpen(
                true
              );

            }}

          />
        )}


        {/* HISTORY */}
        {activeView === 'history' && (
          <HistoryScreen

            historyItems={
              historyPlacesList
            }

            onOpenPlaceDetails={(place) =>
              handleOpenPlaceDetails(
                place,
                'history'
              )
            }

            onClearHistory={
              handleClearHistory
            }

            onExplorePlaces={() => {

              setActiveView(
                'home'
              );

              setIsDestinationModalOpen(
                true
              );

            }}

          />
        )}


        {/* JOURNEY */}
        {activeView === 'journey' &&
          journey && (

            <JourneyScreen

              destination={
                journey.destination
              }

              alertDistanceMeters={
                journey.alertDistanceMeters
              }

              currentDistanceMeters={
                journey.currentDistanceMeters
              }

              currentSpeedKmh={
                journey.currentSpeedKmh
              }

              onCancelJourney={
                handleCancelJourney
              }

              onSimulateMoveCloser={
                handleSimulateMoveCloser
              }

              onSimulateJumpToAlert={
                handleSimulateJumpToAlert
              }

            />

          )}


        {/* ALARM */}
        {activeView === 'alarm' &&
          journey && (

            <AlarmScreen

              destination={
                journey.destination
              }

              distanceRemaining={
                journey.currentDistanceMeters ?? 0
              }

              distanceMeters={
                journey.currentDistanceMeters ?? 0
              }

              isVibrationEnabled={
                preferences.isVibrationEnabled
              }

              onDismiss={
                handleDismissAlarm
              }

              onSnooze={
                handleSnoozeAlarm
              }

            />

          )}


        {/* SETTINGS */}
        {activeView === 'settings' && (

          <SettingsScreen

            preferences={
              preferences
            }

            onUpdatePreferences={
              handleUpdatePreferences
            }

            onBack={() =>
              setActiveView('home')
            }

          />

        )}


        {/* PLACE DETAILS */}
        {activeView === 'place-details' &&
          inspectedPlace && (

            <PlaceDetailsScreen

              place={
                inspectedPlace
              }

              isFavourite={
                isPlaceFavourite(
                  inspectedPlace
                )
              }

              onToggleFavourite={() => {

                handleToggleFavourite(
                  inspectedPlace
                );

              }}

              onBack={() => {

                setActiveView(
                  previousView
                );

              }}

              onSelectAsDestination={() => {

                handleSelectAsDestination(
                  inspectedPlace
                );

              }}

            />

          )}

      </div>


      {/* BOTTOM NAV */}
      {isNavVisible && (

        <BottomNav

          activeView={
            activeView as NavView
          }

          favouritesCount={
            favourites.length
          }

          onNavigate={(view) =>
            setActiveView(view)
          }

        />

      )}


      {/* DESTINATION MODAL */}
      <DestinationModal

        isOpen={
          isDestinationModalOpen
        }

        onClose={() =>
          setIsDestinationModalOpen(
            false
          )
        }

        onSelect={(dest) => {

          saveCustomPlace(
            dest
          );

          setSelectedDestination(
            dest
          );

          setIsDestinationModalOpen(
            false
          );

          setActiveView(
            'home'
          );

        }}

        currentUserLocation={
          currentCoords
        }

        favouritePlaceIds={
          favouritePlaceIdsSet
        }

      />

    </div>
  );
}