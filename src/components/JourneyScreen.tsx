import React, { useState } from 'react';
import { MapPin, X, Navigation2, FastForward, Bell } from 'lucide-react';
import { Destination } from '../types';
import { formatDistance } from '../utils/distance';


interface Props {
  destination: Destination;
  alertDistanceMeters: number;
  currentDistanceMeters: number | null;
  currentSpeedKmh?: number | null;
  onCancelJourney: () => void;
  onSimulateMoveCloser: (stepMeters: number) => void;
  onSimulateJumpToAlert: () => void;
}

export const JourneyScreen: React.FC<Props> = ({
  destination,
  alertDistanceMeters,
  currentDistanceMeters,
  currentSpeedKmh = null,
  onCancelJourney,
  onSimulateMoveCloser,
  onSimulateJumpToAlert
}) => {
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const speedDisplay =
    currentSpeedKmh !== null && currentSpeedKmh !== undefined && currentSpeedKmh >= 0
      ? `${Math.round(currentSpeedKmh)} km/h`
      : '0 km/h';

  return (
    <div className="flex flex-col h-full bg-[#F7F3EA] text-[#173F43] justify-between p-6 select-none">
      {/* 1. Destination Section */}
      <div className="text-center pt-2 space-y-1.5">
        <div className="text-[11px] font-bold tracking-[0.25em] text-[#667477] uppercase">
          ON THE WAY
        </div>
        
        <div className="flex items-center justify-center gap-2 pt-1">
          <div className="w-5 h-5 rounded-full bg-[#FAF2DF] border border-[#D9A441] flex items-center justify-center text-[#D96C45] shrink-0">
            <MapPin className="w-3 h-3" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#173F43] tracking-tight uppercase px-2 line-clamp-1">
            {destination.name}
          </h2>
        </div>

        {destination.address && (
          <p className="text-xs text-[#667477] px-4 truncate">
            {destination.address}
          </p>
        )}
      </div>

      {/* Central Metric Hierarchy: Remaining Distance -> Route -> Alert Distance */}
      <div className="text-center space-y-6 my-auto">
        {/* 2. Remaining Distance (Main Prominent Information) */}
        <div>
          <div className="text-6xl sm:text-7xl font-extrabold text-[#173F43] tracking-tight tabular-nums font-mono">
            {formatDistance(currentDistanceMeters)}
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#667477] mt-1">
            remaining
          </div>
        </div>

        {/* Subtle Route Line: You -> Destination */}
        <div className="py-1 px-8">
          <div className="flex items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#9EAD9A] shrink-0" />
            <div className="h-[2px] bg-[#9EAD9A]/60 flex-1 mx-1.5" />
            <div className="w-3 h-3 rounded-full bg-[#D96C45] border-2 border-white shadow-xs shrink-0" />
          </div>
          <div className="flex justify-between text-[11px] font-medium text-[#667477] pt-1">
            <span>You</span>
            <span className="font-semibold text-[#173F43]">Destination</span>
          </div>
        </div>

        {/* Real-time Travel Speed */}
        <div className="flex flex-col items-center py-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#667477]">
            SPEED
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-[#173F43] tracking-tight tabular-nums mt-0.5">
            {speedDisplay}
          </span>
        </div>

        {/* Alert Distance Threshold */}
        <div className="flex items-center justify-center pt-2">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-[#E4DCC8] shadow-xs text-xs font-medium text-[#173F43]">
            <Bell className="w-3.5 h-3.5 text-[#D96C45]" />
            <span>
              Wake me at <strong className="text-[#D96C45] font-bold">{formatDistance(alertDistanceMeters)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="space-y-3 pt-2">
        {/* Simulation helper for preview testing */}
        <div className="p-2 rounded-lg bg-white/80 border border-[#E4DCC8] space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-[#667477] tracking-wider text-center">
            Journey Simulation
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              id="btn-simulate-step"
              onClick={() => onSimulateMoveCloser(500)}
              className="py-1.5 px-2 bg-[#F7F3EA] hover:bg-[#EAE4D3] text-[11px] font-semibold text-[#173F43] rounded border border-[#E4DCC8] flex items-center justify-center gap-1.5 transition-colors btn-press"
              title="Step 500m closer"
            >
              <Navigation2 className="w-3 h-3 text-[#D96C45]" />
              <span>Step 500m Closer</span>
            </button>
            <button
              id="btn-simulate-trigger"
              onClick={onSimulateJumpToAlert}
              className="py-1.5 px-2 bg-[#FAF2DF] hover:bg-[#F3E7C9] text-[11px] font-bold text-[#D96C45] rounded border border-[#D9A441]/50 flex items-center justify-center gap-1.5 transition-colors btn-press"
              title="Jump into alert zone"
            >
              <FastForward className="w-3 h-3" />
              <span>Trigger Alarm</span>
            </button>
          </div>
        </div>

        {/* 5. End Journey Action */}
        <button
          id="btn-cancel-journey"
          onClick={() => setShowConfirmCancel(true)}
          className="w-full py-3 rounded-lg border border-[#E4DCC8] bg-white text-[#173F43] font-bold text-sm hover:border-[#D96C45] hover:text-[#D96C45] transition-colors flex items-center justify-center gap-2 btn-press shadow-xs"
        >
          <X className="w-4 h-4 text-[#667477]" />
          <span>END JOURNEY</span>
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173F43]/40 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-white rounded-xl p-5 border border-[#E4DCC8] shadow-xl space-y-3 text-[#173F43]">
            <h3 className="font-bold text-sm">
              End this journey?
            </h3>
            <p className="text-xs text-[#667477] leading-relaxed">
              Location monitoring will stop and no wake-up alert will trigger.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="px-3 py-1.5 text-xs text-[#667477] hover:text-[#173F43] font-medium"
              >
                Keep Monitoring
              </button>
              <button
                onClick={() => {
                  setShowConfirmCancel(false);
                  onCancelJourney();
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-md bg-[#D96C45] hover:bg-[#C65A33] text-white transition-colors"
              >
                Yes, End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
