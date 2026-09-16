import React from 'react';
import { 
  ArrowLeft, 
  Heart, 
  MapPin, 
  Navigation, 
  Compass, 
  Share2, 
  Check, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';
import { Destination } from '../types';
import { getPlaceId } from '../data/places';

interface Props {
  place: Destination;
  isFavourite: boolean;
  onToggleFavourite: (place: Destination) => void;
  onSelectAsDestination: (place: Destination) => void;
  onBack: () => void;
}

export const PlaceDetailsScreen: React.FC<Props> = ({
  place,
  isFavourite,
  onToggleFavourite,
  onSelectAsDestination,
  onBack
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    const text = `${place.name} - ${place.address} (${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)})`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F3EA] text-[#173F43] select-none">
      {/* Top Travel Bar */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#E4DCC8] bg-[#F7F3EA] shrink-0 z-10">
        <button
          id="btn-place-details-back"
          onClick={onBack}
          className="p-2 rounded-lg text-[#667477] hover:text-[#173F43] hover:bg-[#EAE4D3] transition-colors flex items-center gap-1 text-xs font-semibold"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Back</span>
        </button>

        <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#667477]">
          PLACE DETAILS
        </span>

        {/* Clearly visible Favourite Heart Button */}
        <button
          id="btn-toggle-favourite-details"
          onClick={() => onToggleFavourite(place)}
          className={`p-2 rounded-full border transition-all btn-press ${
            isFavourite
              ? 'bg-[#FAF2DF] border-[#D9A441] text-[#D96C45] shadow-xs'
              : 'bg-white border-[#E4DCC8] text-[#667477] hover:text-[#D96C45] hover:border-[#D96C45]'
          }`}
          title={isFavourite ? 'Remove from favourites' : 'Save to favourites'}
          aria-label={isFavourite ? 'Saved in favourites' : 'Add to favourites'}
        >
          <Heart
            className={`w-5 h-5 transition-transform active:scale-125 ${
              isFavourite
                ? 'fill-[#D96C45] text-[#D96C45]'
                : 'stroke-[2]'
            }`}
          />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Place Image Hero */}
        <div className="relative w-full h-44 bg-[#EAE4D3] overflow-hidden border-b border-[#E4DCC8]">
          {place.imageUrl ? (
            <img
              src={place.imageUrl}
              alt={place.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback on image load error
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#9EAD9A] gap-2">
              <Compass className="w-12 h-12 stroke-[1.5]" />
              <span className="text-xs font-medium tracking-wide">WakeWay Travel Destination</span>
            </div>
          )}

          {/* Category Chip Overlay */}
          <div className="absolute bottom-3 left-3">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#173F43]/90 text-[#F7F3EA] backdrop-blur-xs shadow-xs">
              {place.category || 'Transit Station'}
            </span>
          </div>

          {/* Favourite Status Indicator Pill */}
          {isFavourite && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF2DF] text-[#D96C45] border border-[#D9A441] shadow-xs">
              <Heart className="w-3 h-3 fill-current" />
              <span>Saved in Favourites</span>
            </div>
          )}
        </div>

        {/* Details Body */}
        <div className="p-5 space-y-4">
          {/* Title & Address */}
          <div>
            <h1 className="text-lg font-bold text-[#173F43] tracking-tight leading-snug">
              {place.name}
            </h1>
            <div className="flex items-start gap-1.5 text-xs text-[#667477] mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#D96C45] shrink-0 mt-0.5" />
              <span className="line-clamp-2">{place.address || 'Address provided by coordinates'}</span>
            </div>
          </div>

          {/* Description */}
          {place.description && (
            <div className="p-3.5 rounded-lg bg-white border border-[#E4DCC8] text-xs text-[#173F43] leading-relaxed shadow-xs">
              {place.description}
            </div>
          )}

          {/* Route & Alarm Preview Box */}
          <div className="p-3.5 rounded-lg bg-[#FAF7F0] border border-[#E4DCC8] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#173F43]">
              <span className="flex items-center gap-1.5 text-[#D96C45]">
                <ShieldCheck className="w-4 h-4" />
                <span>WakeWay Arrival Guard</span>
              </span>
              <span className="text-[11px] text-[#667477]">GPS Geofence</span>
            </div>
            <p className="text-[11px] text-[#667477] leading-relaxed">
              When you start your journey to this station, WakeWay runs continuously in the background and rings an audible alarm before you arrive so you never miss your stop.
            </p>

            {/* Coordinates Pill */}
            <div className="flex items-center justify-between pt-1 border-t border-[#EAE4D3] text-[11px] text-[#667477]">
              <span>Coordinates:</span>
              <span className="font-mono text-[#173F43]">
                {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Quick Share / Info Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex-1 py-2 px-3 rounded-md bg-white border border-[#E4DCC8] hover:bg-[#FAF7F0] text-xs font-semibold text-[#173F43] flex items-center justify-center gap-1.5 transition-colors btn-press shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Location</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#667477]" />
                  <span>Share Place</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action: Set as Destination */}
      <footer className="p-4 border-t border-[#E4DCC8] bg-[#F7F3EA] shrink-0">
        <button
          id="btn-set-place-destination"
          onClick={() => onSelectAsDestination(place)}
          className="w-full py-3.5 rounded-lg font-bold text-sm tracking-wider bg-[#D96C45] hover:bg-[#C65A33] text-white flex items-center justify-center gap-2 transition-all btn-press shadow-xs cursor-pointer"
        >
          <Navigation className="w-4 h-4 fill-current rotate-45" />
          <span>SET AS DESTINATION</span>
        </button>
      </footer>
    </div>
  );
};
