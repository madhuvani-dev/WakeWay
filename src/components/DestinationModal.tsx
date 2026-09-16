import React, { useState, useEffect } from 'react';
import { Search, MapPin, X, Navigation, Loader2, Heart } from 'lucide-react';
import { Destination } from '../types';
import { DEFAULT_PLACES, getPlaceId } from '../data/places';

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

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setErrorMsg(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`
        );
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Destination[] = data.map((item: any) => {
          const parts = item.display_name.split(',');
          const mainName = parts[0];
          const address = parts.slice(1, 4).join(',').trim();
          return {
            name: mainName,
            address: address || item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon)
          };
        });

        setResults(mapped);
      } catch (err) {
        console.error('Failed to search places', err);
        setErrorMsg('Could not fetch destinations. Try again.');
      } finally {
        setIsLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [query]);

  const handleUseCurrentLocation = () => {
    if (currentUserLocation) {
      onSelect({
        name: 'My Current Location',
        address: `${currentUserLocation.lat.toFixed(4)}, ${currentUserLocation.lng.toFixed(4)}`,
        latitude: currentUserLocation.lat,
        longitude: currentUserLocation.lng
      });
      onClose();
    } else {
      if (navigator.geolocation) {
        setIsLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsLoading(false);
            onSelect({
              name: 'My Current Location',
              address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            });
            onClose();
          },
          () => {
            setIsLoading(false);
            alert('Could not access GPS coordinates. Please check location permissions.');
          }
        );
      }
    }
  };

  if (!isOpen) return null;

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
              Search stations, stops, terminals, or landmarks
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

        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#E4DCC8] bg-white space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#667477]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search station, terminal, address..."
              autoFocus
              className="w-full pl-9 pr-8 py-2.5 bg-[#F7F3EA] border border-[#E4DCC8] rounded-md text-sm text-[#173F43] placeholder:text-[#9EAD9A] focus:outline-none focus:border-[#D96C45]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2.5 text-[#667477] hover:text-[#173F43]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action: Use Current Location */}
          <button
            onClick={handleUseCurrentLocation}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-[#D96C45] bg-[#FAF2DF] hover:bg-[#F3E7C9] rounded-md transition-colors border border-[#D9A441]/40 btn-press"
          >
            <Navigation className="w-3.5 h-3.5 fill-current rotate-45" />
            <span>Use Current Location as Reference Point</span>
          </button>
        </div>

        {/* Results / Suggestions Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F7F3EA]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-[#667477] text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#D96C45]" />
              <span>Searching places...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md">
              {errorMsg}
            </div>
          )}

          {query.trim().length >= 3 && !isLoading && results.length === 0 && (
            <div className="text-center py-6 text-xs text-[#667477]">
              No places found. Check your search query.
            </div>
          )}

          {/* Live Search Results */}
          {results.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#667477] px-1 py-1">
                Search Results
              </div>
              {results.map((dest, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSelect(dest);
                    onClose();
                  }}
                  className="w-full text-left p-3 bg-white hover:bg-[#FAF7F0] rounded-lg transition-colors flex items-start gap-3 border border-[#E4DCC8] hover:border-[#D96C45] btn-press shadow-xs"
                >
                  <MapPin className="w-4 h-4 text-[#D96C45] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#173F43] truncate">
                      {dest.name}
                    </div>
                    <div className="text-xs text-[#667477] line-clamp-1 mt-0.5">
                      {dest.address}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Popular Transport Stops when search is empty */}
          {query.trim().length < 3 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#667477] px-1 py-1">
                Popular Transport Hubs
              </div>
              {DEFAULT_PLACES.map((dest, idx) => {
                const id = getPlaceId(dest);
                const isFav = favouritePlaceIds?.has(id);
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelect(dest);
                      onClose();
                    }}
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
