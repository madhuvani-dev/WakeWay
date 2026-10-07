import React, { useEffect } from 'react';
import { Bell, Clock, MapPin, Check } from 'lucide-react';
import { Destination } from '../types';
import { formatDistance } from '../utils/distance';

interface Props {
  destination: Destination;
  distanceRemaining: number;
  onDismiss: () => void;
  onSnooze: () => void;
  isVibrationEnabled: boolean;
}

export const AlarmScreen: React.FC<Props> = ({
  destination,
  distanceRemaining,
  onDismiss,
  onSnooze,
  isVibrationEnabled
}) => {
  useEffect(() => {
    // Web Vibration API for supported devices
    let vibrateInterval: number | null = null;
    if (isVibrationEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate([0, 500, 300, 500, 700]);
        vibrateInterval = window.setInterval(() => {
          navigator.vibrate([0, 500, 300, 500, 700]);
        }, 2000);
      } catch (e) {
        console.warn('Vibration not permitted or unsupported', e);
      }
    }

    return () => {
      if (vibrateInterval) clearInterval(vibrateInterval);
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(0);
        } catch {
          // Ignore
        }
      }
    };
  }, [isVibrationEnabled]);

  return (
    <div className="flex flex-col h-full bg-[#D96C45] text-white justify-between p-6 select-none relative overflow-hidden">
      {/* Background travel texture/line accent */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: 'radial-gradient(#FFFFFF 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
      </div>

      {/* 1. Header */}
      <div className="relative z-10 text-center pt-4 space-y-2">
        <div className="text-[12px] font-black tracking-[0.25em] text-[#F7F3EA] uppercase opacity-90">
          WAKEWAY
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-[#F7F3EA] text-xs font-bold tracking-widest uppercase">
          YOUR DESTINATION IS NEAR
        </div>
      </div>

      {/* 2. Destination Callout & Alarm Signal */}
      <div className="relative z-10 text-center space-y-6 my-auto">
        {/* Destination marker icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-white text-[#D96C45] flex items-center justify-center shadow-lg">
          <MapPin className="w-8 h-8 fill-current" />
        </div>

        <div className="space-y-2 px-3">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase leading-tight drop-shadow-xs">
            {destination.name}
          </h1>
          <p className="text-sm font-medium text-[#F7F3EA] opacity-95">
            Your destination is nearby.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/15 text-xs font-mono font-bold text-white mt-1">
            <span>{formatDistance(distanceRemaining)} remaining</span>
          </div>
        </div>
      </div>

      {/* 3. High-Contrast Awake Action Buttons */}
      <div className="relative z-10 space-y-3 pb-2">
        {/* Dominant Primary Action: I'M AWAKE */}
        <button
          id="btn-dismiss-alarm"
          onClick={onDismiss}
          className="w-full py-4 rounded-lg bg-white hover:bg-[#F7F3EA] text-[#D96C45] font-black text-base tracking-wider shadow-md transition-all btn-press flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>I'M AWAKE</span>
        </button>

        {/* Secondary Snooze Action */}
        <button
          id="btn-snooze-alarm"
          onClick={onSnooze}
          className="w-full py-3 rounded-lg border border-white/40 hover:border-white text-[#F7F3EA] hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 btn-press"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Snooze (Remind again in 500 m)</span>
        </button>
      </div>
    </div>
  );
};
