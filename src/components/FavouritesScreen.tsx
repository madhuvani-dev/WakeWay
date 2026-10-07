import React from 'react';
import { Heart, Compass, MapPin, ArrowRight, Trash2 } from 'lucide-react';
import { Destination } from '../types';

interface Props {
  favouritePlaces: Destination[];
  onOpenPlaceDetails: (place: Destination) => void;
  onRemoveFavourite: (place: Destination) => void;
  onExplorePlaces: () => void;
}

export const FavouritesScreen: React.FC<Props> = ({
  favouritePlaces,
  onOpenPlaceDetails,
  onRemoveFavourite,
  onExplorePlaces
}) => {
  return (
    <div className="flex flex-col h-full bg-[#F7F3EA] text-[#173F43] select-none">
      {/* Header */}
      <header className="px-6 pt-5 pb-4 border-b border-[#E4DCC8] bg-[#F7F3EA] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-[0.2em] text-[#173F43] uppercase">
                FAVOURITES
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF2DF] text-[#D96C45] border border-[#D9A441]/40">
                {favouritePlaces.length} {favouritePlaces.length === 1 ? 'place' : 'places'}
              </span>
            </div>
            <p className="text-xs text-[#667477] font-medium tracking-wide mt-0.5">
              Your saved travel stops & stations
            </p>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#FAF2DF] border border-[#D9A441]/40 flex items-center justify-center text-[#D96C45]">
            <Heart className="w-4 h-4 fill-current" />
          </div>
        </div>
      </header>

      {/* Main List / Empty State */}
      <main className="flex-1 overflow-y-auto px-5 py-4">
        {favouritePlaces.length === 0 ? (
          /* Empty State */
          <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center px-4 py-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF2DF] border border-[#D9A441]/40 flex items-center justify-center text-[#D96C45] shadow-xs">
              <Heart className="w-8 h-8 stroke-[1.5]" />
            </div>

            <div className="space-y-1.5 max-w-xs">
              <h3 className="text-base font-bold text-[#173F43] tracking-tight">
                Your favourite places will appear here.
              </h3>
              <p className="text-xs text-[#667477] leading-relaxed">
                Save the stations, stops, and terminals you visit frequently to quickly set your arrival wake-up alert.
              </p>
            </div>

            <button
              id="btn-fav-explore-places"
              onClick={onExplorePlaces}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D96C45] hover:bg-[#C65A33] text-white text-xs font-bold tracking-wider uppercase transition-all btn-press shadow-xs"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Places</span>
            </button>
          </div>
        ) : (
          /* List of Favourites */
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#667477] px-1">
              SAVED DESTINATIONS
            </div>

            {favouritePlaces.map((place) => (
              <div
                key={place.id || place.name}
                className="group relative bg-white rounded-xl border border-[#E4DCC8] hover:border-[#D96C45]/60 transition-all p-3.5 shadow-xs flex flex-col gap-2.5"
              >
                <div
                  onClick={() => onOpenPlaceDetails(place)}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg bg-[#EAE4D3] overflow-hidden shrink-0 border border-[#E4DCC8] relative">
                    {place.imageUrl ? (
                      <img
                        src={place.imageUrl}
                        alt={place.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#9EAD9A]">
                        <MapPin className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 pr-6">
                    {place.category && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#D96C45]">
                        {place.category}
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-[#173F43] tracking-tight truncate leading-snug">
                      {place.name}
                    </h4>
                    <p className="text-xs text-[#667477] line-clamp-1 mt-0.5">
                      {place.address}
                    </p>
                    {place.description && (
                      <p className="text-[11px] text-[#9EAD9A] line-clamp-1 mt-1">
                        {place.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-2 border-t border-[#F2ECE0] flex items-center justify-between">
                  <button
                    onClick={() => onRemoveFavourite(place)}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#667477] hover:text-[#D96C45] transition-colors py-1 px-1.5 rounded hover:bg-[#FAF2DF]"
                    title="Remove from favourites"
                    aria-label={`Remove ${place.name} from favourites`}
                  >
                    <Heart className="w-3.5 h-3.5 fill-[#D96C45] text-[#D96C45]" />
                    <span>Saved</span>
                  </button>

                  <button
                    onClick={() => onOpenPlaceDetails(place)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#173F43] hover:text-[#D96C45] transition-colors py-1 px-2"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
