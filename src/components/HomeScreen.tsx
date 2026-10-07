import React, { useState, useRef } from 'react';
import { 
  Compass, 
  Settings, 
  Volume2, 
  Play, 
  Square, 
  Upload, 
  RotateCcw, 
  SlidersHorizontal,
  Navigation,
  MapPin,
  Heart,
  Info
} from 'lucide-react';
import { Destination, UserPreferences } from '../types';
import { formatDistance } from '../utils/distance';
import { audioEngine } from '../utils/audioEngine';

interface Props {
  preferences: UserPreferences;
  selectedDestination: Destination | null;
  selectedAlertDistanceMeters: number;
  isDestinationFavourite?: boolean;
  onSelectDestinationClick: () => void;
  onAlertDistanceChange: (meters: number) => void;
  onStartJourney: () => void;
  onOpenSettings: () => void;
  onToggleFavouriteDestination?: () => void;
  onViewDestinationDetails?: () => void;
  onUpdatePreferences?: (updated: Partial<UserPreferences>) => void;
}

const DISTANCE_OPTIONS = [500, 1000, 2000, 3000, 5000];

export const HomeScreen: React.FC<Props> = ({
  preferences,
  selectedDestination,
  selectedAlertDistanceMeters,
  isDestinationFavourite = false,
  onSelectDestinationClick,
  onAlertDistanceChange,
  onStartJourney,
  onOpenSettings,
  onToggleFavouriteDestination,
  onViewDestinationDetails,
  onUpdatePreferences
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInput, setCustomInput] = useState(selectedAlertDistanceMeters.toString());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePreviewToggle = () => {
    if (isPlayingPreview) {
      audioEngine.stop();
      setIsPlayingPreview(false);
    } else {
      setIsPlayingPreview(true);
      audioEngine.playPreview(preferences.customAudioBlobUrl, () => {
        setIsPlayingPreview(false);
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      alert('Please select a valid audio file (MP3, M4A, WAV, AAC, or OGG).');
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    onUpdatePreferences?.({
      customAudioBlobUrl: blobUrl,
      alarmSoundName: file.name
    });

    if (isPlayingPreview) {
      audioEngine.stop();
      setIsPlayingPreview(false);
    }
  };

  const handleResetDefaultSound = () => {
    if (preferences.customAudioBlobUrl) {
      URL.revokeObjectURL(preferences.customAudioBlobUrl);
    }
    audioEngine.stop();
    setIsPlayingPreview(false);
    onUpdatePreferences?.({
      customAudioBlobUrl: null,
      alarmSoundName: 'WakeWay Default'
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F3EA] text-[#173F43] select-none">
      {/* 1. Typographic Travel Header */}
      <header className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E4DCC8] bg-[#F7F3EA] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-[0.2em] text-[#173F43] uppercase">
              WAKEWAY
            </span>
          </div>
          <p className="text-xs text-[#667477] font-medium tracking-wide mt-0.5">
            Travel. Rest. Arrive.
          </p>
        </div>

        <button
          id="btn-settings-header"
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-[#667477] hover:text-[#173F43] hover:bg-[#EAE4D3] transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 stroke-[1.75]" />
        </button>
      </header>

      {/* 2. Main Travel Companion Body */}
      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Destination Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#667477]">
              YOUR DESTINATION
            </span>
            <div className="flex items-center gap-3">
              {selectedDestination && onViewDestinationDetails && (
                <button
                  id="btn-view-destination-details"
                  onClick={onViewDestinationDetails}
                  className="text-xs font-semibold text-[#173F43] hover:text-[#D96C45] transition-colors"
                >
                  Details
                </button>
              )}
              <button
                id="btn-change-destination"
                onClick={onSelectDestinationClick}
                className="text-xs font-semibold text-[#D96C45] hover:underline"
              >
                Change
              </button>
            </div>
          </div>

          <div
            onClick={() => {
              if (selectedDestination && onViewDestinationDetails) {
                onViewDestinationDetails();
              } else {
                onSelectDestinationClick();
              }
            }}
            className="p-4 rounded-lg bg-white border border-[#E4DCC8] hover:border-[#D96C45]/60 transition-all cursor-pointer shadow-xs relative group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-md bg-[#FAF2DF] border border-[#D9A441]/40 flex items-center justify-center text-[#D96C45] shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 pr-6">
                {selectedDestination ? (
                  <>
                    <h3 className="text-base font-bold text-[#173F43] tracking-tight leading-snug">
                      {selectedDestination.name}
                    </h3>
                    {selectedDestination.address && (
                      <p className="text-xs text-[#667477] mt-0.5 line-clamp-1">
                        {selectedDestination.address}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-[#173F43]">
                      Set your destination
                    </h3>
                    <p className="text-xs text-[#667477] mt-0.5">
                      Tap to select your stop or station
                    </p>
                  </>
                )}
              </div>

              {/* Destination Favourite Heart Button */}
              {selectedDestination && onToggleFavouriteDestination && (
                <button
                  id="btn-home-dest-favourite"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavouriteDestination();
                  }}
                  className={`p-1.5 rounded-full transition-all btn-press absolute top-3.5 right-3.5 ${
                    isDestinationFavourite
                      ? 'text-[#D96C45] bg-[#FAF2DF]'
                      : 'text-[#9EAD9A] hover:text-[#D96C45] hover:bg-[#FAF7F0]'
                  }`}
                  title={isDestinationFavourite ? 'Remove from favourites' : 'Save to favourites'}
                  aria-label="Toggle favourite"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isDestinationFavourite ? 'fill-[#D96C45] text-[#D96C45]' : 'stroke-[2]'
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Travel Route Line Visualization */}
            <div className="mt-4 pt-3 border-t border-[#F2ECE0] flex items-center gap-3">
              <div className="flex flex-col items-center shrink-0 w-3">
                <div className="w-2 h-2 rounded-full bg-[#9EAD9A]" />
                <div className="w-0.5 h-6 bg-[#9EAD9A]/70 my-0.5" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#D96C45] border border-white shadow-xs" />
              </div>
              <div className="flex flex-col justify-between h-9 text-[11px] text-[#667477]">
                <span className="leading-none text-[#667477]">Current location</span>
                <span className="leading-none font-semibold text-[#173F43]">
                  Destination marker (WakeWay wakes you here)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Thin Travel Divider */}
        <div className="h-px bg-[#E4DCC8]" />

        {/* Alert Distance Section */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#667477]">
              WAKE ME BEFORE ARRIVAL
            </span>
            <span className="text-xl font-extrabold text-[#D96C45] tracking-tight tabular-nums">
              {formatDistance(selectedAlertDistanceMeters)}
            </span>
          </div>

          {/* Clean travel-distance selector along a route line */}
          <div className="py-2 px-1">
            <div className="relative flex items-center justify-between">
              {/* Background route line */}
              <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-[#E4DCC8]" />
              
              {DISTANCE_OPTIONS.map((meters) => {
                const isSelected = selectedAlertDistanceMeters === meters;
                const label = meters < 1000 ? `${meters} m` : `${meters / 1000} km`;
                return (
                  <button
                    key={meters}
                    id={`btn-distance-${meters}`}
                    onClick={() => onAlertDistanceChange(meters)}
                    className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    {/* Marker node */}
                    <div
                      className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                        isSelected
                          ? 'border-[#D96C45] bg-[#D96C45] scale-110 shadow-xs'
                          : 'border-[#9EAD9A] bg-[#F7F3EA] group-hover:border-[#D96C45]'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {/* Distance label */}
                    <span
                      className={`mt-2 text-xs transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'font-bold text-[#173F43]'
                          : 'font-medium text-[#667477] group-hover:text-[#173F43]'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              id="btn-custom-distance"
              onClick={() => {
                setCustomInput(selectedAlertDistanceMeters.toString());
                setShowCustomModal(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#667477] hover:text-[#D96C45] transition-colors font-medium"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Custom distance</span>
            </button>
          </div>
        </section>

        {/* Thin Travel Divider */}
        <div className="h-px bg-[#E4DCC8]" />

        {/* Wake-Up Sound Section */}
        <section className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#667477]">
            WAKE-UP SOUND
          </span>

          <div className="p-3.5 rounded-lg bg-white border border-[#E4DCC8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-[#FAF2DF] border border-[#D9A441]/40 flex items-center justify-center text-[#D9A441] shrink-0">
                  <Volume2 className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#173F43] truncate">
                    {preferences.alarmSoundName || 'WakeWay Default'}
                  </div>
                  <div className="text-[11px] text-[#667477]">
                    {preferences.customAudioBlobUrl ? 'Custom audio file' : 'Default travel chime'}
                  </div>
                </div>
              </div>

              {/* Preview Button */}
              <button
                id="btn-preview-sound-home"
                onClick={handlePreviewToggle}
                className="px-3 py-1.5 rounded-md bg-[#F7F3EA] hover:bg-[#EAE4D3] border border-[#E4DCC8] text-xs font-semibold text-[#173F43] flex items-center gap-1.5 transition-colors btn-press shrink-0"
                title={isPlayingPreview ? 'Stop preview' : 'Preview tone'}
              >
                {isPlayingPreview ? (
                  <>
                    <Square className="w-3 h-3 fill-current text-[#D96C45]" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current text-[#173F43]" />
                    <span>Preview</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#F2ECE0]">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                className="hidden"
              />
              <button
                id="btn-choose-sound-home"
                onClick={() => {
                  if (onUpdatePreferences) {
                    fileInputRef.current?.click();
                  } else {
                    onOpenSettings();
                  }
                }}
                className="flex-1 py-1.5 px-3 rounded-md bg-[#F7F3EA] hover:bg-[#EAE4D3] border border-[#E4DCC8] text-xs font-medium text-[#173F43] flex items-center justify-center gap-1.5 transition-colors btn-press"
              >
                <Upload className="w-3.5 h-3.5 text-[#667477]" />
                <span>Choose another sound</span>
              </button>

              {preferences.customAudioBlobUrl && (
                <button
                  onClick={handleResetDefaultSound}
                  className="py-1.5 px-2.5 rounded-md text-xs text-[#667477] hover:text-[#D96C45] hover:bg-[#F7F3EA] flex items-center gap-1 transition-colors"
                  title="Reset to default sound"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 3. Primary Action: START JOURNEY */}
      <footer className="p-5 border-t border-[#E4DCC8] bg-[#F7F3EA] shrink-0">
        <button
          id="btn-start-journey"
          onClick={onStartJourney}
          disabled={!selectedDestination}
          className={`w-full py-3.5 rounded-lg font-bold text-sm tracking-wider flex items-center justify-center gap-2.5 transition-all btn-press shadow-xs ${
            selectedDestination
              ? 'bg-[#D96C45] hover:bg-[#C65A33] text-white cursor-pointer active:scale-[0.99]'
              : 'bg-[#E4DCC8] text-[#9EAD9A] cursor-not-allowed'
          }`}
        >
          <Navigation className="w-4 h-4 fill-current rotate-45" />
          <span>START JOURNEY</span>
        </button>
      </footer>

      {/* Custom Distance Dialog */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173F43]/40 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-white rounded-xl p-5 border border-[#E4DCC8] shadow-xl space-y-4 text-[#173F43]">
            <h3 className="font-bold text-sm tracking-tight">
              Custom Alert Distance
            </h3>
            <p className="text-xs text-[#667477] leading-relaxed">
              Enter arrival wake distance in meters (e.g. 1500 for 1.5 km):
            </p>
            <input
              type="number"
              min="100"
              max="50000"
              step="50"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="w-full px-3 py-2 bg-[#F7F3EA] border border-[#E4DCC8] rounded-md text-sm font-semibold text-[#173F43] focus:outline-none focus:border-[#D96C45]"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-xs text-[#667477] hover:text-[#173F43] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const val = parseInt(customInput, 10);
                  if (!isNaN(val) && val >= 100) {
                    onAlertDistanceChange(val);
                  }
                  setShowCustomModal(false);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-md bg-[#D96C45] text-white hover:bg-[#C65A33] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
