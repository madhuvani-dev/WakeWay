import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  X,
  Navigation,
  Loader2,
  Heart
} from 'lucide-react';

import { Destination } from '../types';
import { DEFAULT_PLACES, getPlaceId } from '../data/places';
import { DestinationMap } from './DestinationMap';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (destination: Destination) => void;
  currentUserLocation: { lat: number; lng: number } | null;
  favouritePlaceIds?: Set<string>;
}

export const DestinationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelect,
  currentUserLocation,
  favouritePlaceIds
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [mapDestination, setMapDestination] =
    useState<Destination | null>(null);

  const [mapLocation, setMapLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // ------------------------------------------------------------
  // RESET MODAL
  // ------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setErrorMsg(null);
      setMapDestination(null);
      setMapLocation(null);
    }
  }, [isOpen]);

  // ------------------------------------------------------------
  // PHOTON PLACE SEARCH
  // ------------------------------------------------------------

  useEffect(() => {
    const trimmedQuery = query.trim();

    // Don't search for very short queries
    if (trimmedQuery.length < 2) {
      setResults([]);
      setErrorMsg(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        /*
         * Photon API
         * ------------------------------------------------------
         * Photon uses OpenStreetMap data.
         * No Google API key is required.
         *
         * If we know the user's location, we send it as a
         * location bias so nearby places are preferred.
         */

        let url =
          `https://photon.komoot.io/api/?q=${encodeURIComponent(
            trimmedQuery
          )}&limit=8&lang=en`;

        if (currentUserLocation) {
          url +=
            `&lat=${currentUserLocation.lat}` +
            `&lon=${currentUserLocation.lng}`;
        }

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const data = await response.json();

        if (cancelled) return;

        const features = Array.isArray(data?.features)
          ? data.features
          : [];

        const mapped: Destination[] = features
          .map((feature: any) => {
            const coordinates = feature?.geometry?.coordinates;
            const properties = feature?.properties;

            if (
              !Array.isArray(coordinates) ||
              coordinates.length < 2
            ) {
              return null;
            }

            const longitude = Number(coordinates[0]);
            const latitude = Number(coordinates[1]);

            if (
              !Number.isFinite(latitude) ||
              !Number.isFinite(longitude)
            ) {
              return null;
            }

            /*
             * Photon returns address information in separate
             * fields, so we build a clean address ourselves.
             */

            const addressParts = [
              properties?.street,
              properties?.housenumber,
              properties?.district,
              properties?.city,
              properties?.state,
              properties?.country
            ].filter(Boolean);

            const address =
              addressParts.length > 0
                ? addressParts.join(', ')
                : properties?.name ||
                  properties?.label ||
                  'Location';

            const name =
              properties?.name ||
              properties?.street ||
              properties?.city ||
              properties?.district ||
              'Unnamed location';

            const category =
              properties?.type ||
              properties?.osm_value ||
              undefined;

            return {
              id:
                properties?.osm_id
                  ? `photon-${properties.osm_id}`
                  : undefined,

              name,
              address,
              latitude,
              longitude,
              category
            } as Destination;
          })
          .filter(
            (item: Destination | null): item is Destination =>
              item !== null
          );

        setResults(mapped);

        if (mapped.length === 0) {
          setErrorMsg(
            'No matching places found. Try a nearby landmark, station, address, or area name.'
          );
        }
      } catch (error) {
        console.error('Failed to search places:', error);

        if (!cancelled) {
          setResults([]);
          setErrorMsg(
            'Could not search places right now. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, currentUserLocation]);

  // ------------------------------------------------------------
  // OPEN MAP FOR SELECTED DESTINATION
  // ------------------------------------------------------------

  const openMapForDestination = (destination: Destination) => {
    setMapDestination(destination);

    setMapLocation({
      lat: destination.latitude,
      lng: destination.longitude
    });
  };

  // ------------------------------------------------------------
  // CONFIRM MAP DESTINATION
  // ------------------------------------------------------------

  const confirmMapDestination = () => {
    if (!mapDestination || !mapLocation) return;

    const updatedDestination: Destination = {
      ...mapDestination,
      latitude: mapLocation.lat,
      longitude: mapLocation.lng
    };

    onSelect(updatedDestination);
    onClose();

    setMapDestination(null);
    setMapLocation(null);
  };

  // ------------------------------------------------------------
  // USE CURRENT LOCATION
  // ------------------------------------------------------------

  const handleUseCurrentLocation = () => {
    if (currentUserLocation) {
      onSelect({
        name: 'My Current Location',
        address:
          `${currentUserLocation.lat.toFixed(4)}, ` +
          `${currentUserLocation.lng.toFixed(4)}`,
        latitude: currentUserLocation.lat,
        longitude: currentUserLocation.lng
      });

      onClose();
      return;
    }

    if (navigator.geolocation) {
      setIsLoading(true);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLoading(false);

          onSelect({
            name: 'My Current Location',
            address:
              `${pos.coords.latitude.toFixed(4)}, ` +
              `${pos.coords.longitude.toFixed(4)}`,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });

          onClose();
        },
        () => {
          setIsLoading(false);

          alert(
            'Could not access GPS coordinates. Please check location permissions.'
          );
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  // ------------------------------------------------------------
  // DON'T RENDER WHEN CLOSED
  // ------------------------------------------------------------

  if (!isOpen) return null;

  // ------------------------------------------------------------
  // MAP CONFIRMATION SCREEN
  // ------------------------------------------------------------

  if (mapDestination && mapLocation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173F43]/40 backdrop-blur-xs">
        <div className="w-full max-w-md bg-[#F7F3EA] rounded-xl shadow-2xl border border-[#E4DCC8] overflow-hidden text-[#173F43]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4DCC8]">
            <div>
              <h3 className="font-bold text-base">
                Confirm Destination
              </h3>

              <p className="text-xs text-[#667477]">
                Tap the map to adjust the exact location
              </p>
            </div>

            <button
              onClick={() => {
                setMapDestination(null);
                setMapLocation(null);
              }}
              className="p-1.5 text-[#667477] hover:text-[#173F43] hover:bg-[#EAE4D3] rounded-md"
              aria-label="Back"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Map */}
          <div className="p-4">
            <DestinationMap
              latitude={mapLocation.lat}
              longitude={mapLocation.lng}
              onLocationChange={(lat, lng) => {
                setMapLocation({
                  lat,
                  lng
                });
              }}
            />

            {/* Destination Details */}
            <div className="mt-3 p-3 bg-white rounded-lg border border-[#E4DCC8]">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#D96C45] shrink-0 mt-0.5" />

                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#173F43]">
                    {mapDestination.name}
                  </div>

                  <div className="text-xs text-[#667477] mt-1">
                    {mapDestination.address}
                  </div>

                  <div className="text-[10px] text-[#9EAD9A] mt-1">
                    {mapLocation.lat.toFixed(6)},{' '}
                    {mapLocation.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm */}
            <button
              onClick={confirmMapDestination}
              className="w-full mt-3 py-3 bg-[#D96C45] hover:bg-[#C95D38] text-white rounded-lg font-bold text-sm transition-colors btn-press"
            >
              Confirm Destination
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // SEARCH SCREEN
  // ------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173F43]/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#F7F3EA] rounded-xl shadow-2xl border border-[#E4DCC8] flex flex-col max-h-[85vh] overflow-hidden text-[#173F43]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4DCC8] bg-[#F7F3EA]">
          <div>
            <h3 className="font-bold text-base text-[#173F43] tracking-tight">
              Select Destination
            </h3>

            <p className="text-xs text-[#667477]">
              Search places, stations, stops, or landmarks
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#667477] hover:text-[#173F43] hover:bg-[#EAE4D3] rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Area */}
        <div className="p-4 border-b border-[#E4DCC8] bg-white space-y-3">

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#667477]" />

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a place, station, address..."
              autoFocus
              className="w-full pl-9 pr-8 py-2.5 bg-[#F7F3EA] border border-[#E4DCC8] rounded-md text-sm text-[#173F43] placeholder:text-[#9EAD9A] focus:outline-none focus:border-[#D96C45]"
            />

            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2.5 text-[#667477] hover:text-[#173F43]"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Current Location */}
          <button
            onClick={handleUseCurrentLocation}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-[#D96C45] bg-[#FAF2DF] hover:bg-[#F3E7C9] rounded-md transition-colors border border-[#D9A441]/40 btn-press"
          >
            <Navigation className="w-3.5 h-3.5 fill-current rotate-45" />

            <span>
              Use Current Location as Reference Point
            </span>
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F7F3EA]">

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-[#667477] text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#D96C45]" />

              <span>
                Searching nearby places...
              </span>
            </div>
          )}

          {/* Error */}
          {errorMsg && !isLoading && (
            <div className="p-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md">
              {errorMsg}
            </div>
          )}

          {/* Search Results */}
          {!isLoading && results.length > 0 && (
            <div className="space-y-1.5">

              <div className="text-[11px] font-bold uppercase tracking-wider text-[#667477] px-1 py-1">
                Search Results
              </div>

              {results.map((dest, idx) => (
                <button
                  key={dest.id || `${dest.name}-${idx}`}
                  onClick={() =>
                    openMapForDestination(dest)
                  }
                  className="w-full text-left p-3 bg-white hover:bg-[#FAF7F0] rounded-lg transition-colors flex items-start gap-3 border border-[#E4DCC8] hover:border-[#D96C45] btn-press shadow-xs"
                >

                  <MapPin className="w-4 h-4 text-[#D96C45] shrink-0 mt-0.5" />

                  <div className="min-w-0 flex-1">

                    <div className="flex items-center justify-between gap-2">

                      <div className="text-sm font-bold text-[#173F43] truncate">
                        {dest.name}
                      </div>

                      {dest.category && (
                        <span className="text-[9px] uppercase tracking-wide text-[#9EAD9A] shrink-0">
                          {dest.category}
                        </span>
                      )}

                    </div>

                    <div className="text-xs text-[#667477] line-clamp-2 mt-0.5">
                      {dest.address}
                    </div>

                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading &&
            query.trim().length >= 2 &&
            results.length === 0 &&
            !errorMsg && (
              <div className="text-center py-6 text-xs text-[#667477]">
                No places found.
              </div>
            )}

          {/* Popular Places */}
          {query.trim().length < 2 && (
            <div className="space-y-1.5">

              <div className="text-[11px] font-bold uppercase tracking-wider text-[#667477] px-1 py-1">
                Popular Transport Hubs
              </div>

              {DEFAULT_PLACES.map((dest, idx) => {
                const id = getPlaceId(dest);
                const isFav =
                  favouritePlaceIds?.has(id);

                return (
                  <button
                    key={idx}
                    onClick={() =>
                      openMapForDestination(dest)
                    }
                    className="w-full text-left p-3 bg-white hover:bg-[#FAF7F0] rounded-lg transition-colors flex items-start gap-3 border border-[#E4DCC8] hover:border-[#D96C45] btn-press shadow-xs"
                  >

                    <MapPin className="w-4 h-4 text-[#D96C45] shrink-0 mt-0.5" />

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center justify-between gap-1">

                        <span className="text-sm font-bold text-[#173F43] truncate">
                          {dest.name}
                        </span>

                        {isFav && (
                          <Heart className="w-3.5 h-3.5 fill-[#D96C45] text-[#D96C45] shrink-0" />
                        )}

                      </div>

                      <div className="text-xs text-[#667477] line-clamp-1 mt-0.5">
                        {dest.address}
                      </div>

                    </div>
                  </button>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};