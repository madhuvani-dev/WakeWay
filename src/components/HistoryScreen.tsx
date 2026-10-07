import React from 'react';
import { Clock, Compass, MapPin, ArrowRight, Trash2, Calendar } from 'lucide-react';
import { Destination } from '../types';

export interface HistoryItemWithPlace {
  place: Destination;
  lastExploredAt: number;
}

interface Props {
  historyItems: HistoryItemWithPlace[];
  onOpenPlaceDetails: (place: Destination) => void;
  onClearHistory: () => void;
  onExplorePlaces: () => void;
}

function formatExploredTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Explored just now';
  if (diffMinutes < 60) return `Explored ${diffMinutes}m ago`;

  const date = new Date(timestamp);
  const nowDate = new Date(now);

  const isToday = date.toDateString() === nowDate.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Explored today at ${timeStr}`;
  }

  const yesterday = new Date(now - 86400000);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Explored yesterday at ${timeStr}`;
  }

  return `Explored on ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

export const HistoryScreen: React.FC<Props> = ({
  historyItems,
  onOpenPlaceDetails,
  onClearHistory,
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
                TRAVEL HISTORY
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF2DF] text-[#D96C45] border border-[#D9A441]/40">
                {historyItems.length} {historyItems.length === 1 ? 'place' : 'places'}
              </span>
            </div>
            <p className="text-xs text-[#667477] font-medium tracking-wide mt-0.5">
              Destinations you explored recently
            </p>
          </div>

          {historyItems.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-[11px] font-semibold text-[#667477] hover:text-[#D96C45] hover:bg-[#FAF2DF] px-2 py-1 rounded transition-colors"
              title="Clear exploration history"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Main List / Empty State */}
      <main className="flex-1 overflow-y-auto px-5 py-4">
        {historyItems.length === 0 ? (
          /* Empty State */
          <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center px-4 py-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF2DF] border border-[#D9A441]/40 flex items-center justify-center text-[#D9A441] shadow-xs">
              <Clock className="w-8 h-8 stroke-[1.5]" />
            </div>

            <div className="space-y-1.5 max-w-xs">
              <h3 className="text-base font-bold text-[#173F43] tracking-tight">
                Your travel story starts here.
              </h3>
              <p className="text-xs text-[#667477] leading-relaxed">
                Explore a place and it will appear in your history.
              </p>
            </div>

            <button
              id="btn-history-explore-places"
              onClick={onExplorePlaces}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D96C45] hover:bg-[#C65A33] text-white text-xs font-bold tracking-wider uppercase transition-all btn-press shadow-xs"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Places</span>
            </button>
          </div>
        ) : (
          /* List of Explored Places */
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#667477] px-1 flex items-center justify-between">
              <span>RECENTLY EXPLORED</span>
              <span className="text-[10px] text-[#9EAD9A] font-normal lowercase">most recent first</span>
            </div>

            {historyItems.map((item) => {
              const place = item.place;
              return (
                <div
                  key={place.id || place.name}
                  onClick={() => onOpenPlaceDetails(place)}
                  className="group relative bg-white rounded-xl border border-[#E4DCC8] hover:border-[#D96C45]/60 transition-all p-3.5 shadow-xs flex flex-col gap-2.5 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
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
                    <div className="min-w-0 flex-1">
                      {place.category && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#9EAD9A]">
                          {place.category}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-[#173F43] tracking-tight truncate leading-snug">
                        {place.name}
                      </h4>
                      <p className="text-xs text-[#667477] line-clamp-1 mt-0.5">
                        {place.address}
                      </p>
                    </div>
                  </div>

                  {/* Exploration Timestamp Bar */}
                  <div className="pt-2 border-t border-[#F2ECE0] flex items-center justify-between text-[11px] text-[#667477]">
                    <div className="flex items-center gap-1.5 text-[#D96C45] font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatExploredTime(item.lastExploredAt)}</span>
                    </div>

                    <div className="flex items-center gap-1 font-bold text-[#173F43] group-hover:text-[#D96C45] transition-colors">
                      <span>Explore again</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
