import React, { useState } from 'react';
import { MapPin, X, Navigation2, FastForward } from 'lucide-react';
import { Destination } from '../types';
import { formatDistance } from '../utils/distance';

interface Props {
  destination: Destination;
  alertDistanceMeters: number;
  currentDistanceMeters: number | null;
  onCancelJourney: () => void;
  onSimulateMoveCloser: (stepMeters: number) => void;
  onSimulateJumpToAlert: () => void;
}

export const JourneyScreen: React.FC<Props> = ({
  destination,
  alertDistanceMeters,
  currentDistanceMeters,
  onCancelJourney,
  onSimulateMoveCloser,
  onSimulateJumpToAlert
}) => {
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#F7F3EA] text-[#173F43] justify-between p-6 select-none">
      {/* 1. Header: ON THE WAY */}
      <div className="text-center pt-3 space-y-2">
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

      {/* 2. Dominant Distance & Subtle Route Visualization */}
      <div className="text-center space-y-6 my-auto">
        {/* Remaining Distance as Main Information */}
        <div>
          <div className="text-6xl sm:text-7xl font-extrabold text-[#173F43] tracking-tight tabular-nums font-mono">
            {formatDistance(currentDistanceMeters)}
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#667477] mt-1.5">
            remaining
          </div>
        </div>

        {/* Subtle Route Visualization */}
        <div className="py-2 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-lg border border-[#E4DCC8] shadow-xs">
            <div className="flex flex-col items-center">
              {/* You are here */}
              <div className="w-2.5 h-2.5 rounded-full bg-[#9EAD9A]" />
              <div className="w-0.5 h-8 bg-[#9EAD9A]/60 my-0.5" />
              {/* Destination marker */}
              <div className="w-3 h-3 rounded-full bg-[#D96C45] border-2 border-white shadow-xs" />
            </div>

            <div className="flex flex-col justify-between h-12 text-left text-xs">
              <span className="text-[#667477] font-medium leading-none">You are here</span>
              <span className="text-[#173F43] font-bold leading-none">
                Destination (Wake point)
              </span>
            </div>
          </div>
        </div>

        {/* Calm Metadata: Alert Distance & Monitoring Status */}
        <div className="flex items-center justify-center gap-4 text-xs font-medium text-[#667477]">
          <span className="bg-[#FAF7F0] border border-[#E4DCC8] px-2.5 py-1 rounded-md text-[#173F43]">
            Alert distance: <strong className="text-[#D96C45]">{formatDistance(alertDistanceMeters)}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-[#FAF7F0] border border-[#E4DCC8] px-2.5 py-1 rounded-md text-[#173F43]">
            <span className="w-2 h-2 rounded-full bg-[#9EAD9A] inline-block"></span>
            Monitoring: Active
          </span>
        </div>
      </div>

      {/* 3. Bottom Controls */}
      <div className="space-y-4 pt-2">
        {/* Subtle Simulation Helper for Testing & Demos */}
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

        {/* Primary Action: END JOURNEY */}
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
