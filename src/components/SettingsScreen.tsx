import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Square,
  Upload,
  RotateCcw,
  Volume2,
  Vibrate,
  Navigation,
  ShieldCheck,
  Info
} from 'lucide-react';

import { UserPreferences } from '../types';
import { audioEngine } from '../utils/audioEngine';

interface Props {
  preferences: UserPreferences;
  onUpdatePreferences: (
    updated: Partial<UserPreferences>
  ) => void;
  onBack: () => void;
}

const DISTANCE_OPTIONS = [
  500,
  1000,
  2000,
  3000,
  5000
];

export const SettingsScreen: React.FC<Props> = ({
  preferences,
  onUpdatePreferences,
  onBack
}) => {
  const [isPlayingPreview, setIsPlayingPreview] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const handlePreviewToggle = () => {
    if (isPlayingPreview) {
      audioEngine.stop();
      setIsPlayingPreview(false);
    } else {
      setIsPlayingPreview(true);

      audioEngine.playPreview(
        preferences.customAudioBlobUrl,
        () => {
          setIsPlayingPreview(false);
        }
      );
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith('audio/') &&
      !file.name.match(
        /\.(mp3|wav|ogg|m4a|aac)$/i
      )
    ) {
      alert(
        'Please select a valid audio file (MP3, M4A, WAV, AAC, or OGG).'
      );

      return;
    }

    /*
     * Android MainActivity receives the selected file
     * through the WebView file chooser and permanently
     * copies it into app-private storage.
     *
     * React still creates a temporary blob URL so the
     * selected sound works immediately in the current session.
     */
    const blobUrl =
      URL.createObjectURL(file);

    onUpdatePreferences({
      customAudioBlobUrl: blobUrl,
      alarmSoundName: file.name
    });

    if (isPlayingPreview) {
      audioEngine.stop();
      setIsPlayingPreview(false);
    }

    // Allow the same file to be selected again later.
    e.target.value = '';
  };

  const handleResetDefaultSound = () => {
    if (preferences.customAudioBlobUrl) {
      /*
       * Only revoke blob URLs.
       *
       * The restored Android audio is a data URL,
       * so revoking it is unnecessary.
       */
      if (
        preferences.customAudioBlobUrl.startsWith(
          'blob:'
        )
      ) {
        URL.revokeObjectURL(
          preferences.customAudioBlobUrl
        );
      }
    }

    /*
     * Delete the permanently saved Android copy.
     */
    try {
      window.WakeWayAndroid?.deleteCustomAudio();
    } catch (error) {
      console.error(
        'Failed to delete Android custom audio:',
        error
      );
    }

    audioEngine.stop();
    setIsPlayingPreview(false);

    onUpdatePreferences({
      customAudioBlobUrl: null,
      alarmSoundName:
        'WakeWay Gentle Chime (Default)'
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F3EA] text-[#173F43] select-none">

      {/* Top App Bar */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-[#E4DCC8] bg-[#F7F3EA] sticky top-0 z-10 shrink-0">

        <button
          id="btn-settings-back"
          onClick={() => {
            audioEngine.stop();
            onBack();
          }}
          className="p-2 -ml-2 text-[#667477] hover:text-[#173F43] rounded-lg hover:bg-[#EAE4D3] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base font-bold text-[#173F43] tracking-tight">
            Preferences
          </h2>

          <p className="text-[11px] text-[#667477]">
            Travel Companion Settings
          </p>
        </div>

      </header>

      {/* Settings Sections */}
      <main className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* SECTION 1: JOURNEY */}
        <section className="space-y-2.5">

          <div className="text-[11px] font-bold tracking-[0.18em] text-[#667477] uppercase px-1">
            JOURNEY
          </div>

          <div className="bg-white rounded-lg border border-[#E4DCC8] p-4 space-y-3 shadow-xs">

            <div className="flex items-center gap-3">

              <div className="w-7 h-7 rounded-md bg-[#FAF2DF] border border-[#D9A441]/40 flex items-center justify-center text-[#D96C45] shrink-0">
                <Navigation className="w-3.5 h-3.5 rotate-45 fill-current" />
              </div>

              <div>
                <div className="text-sm font-semibold text-[#173F43]">
                  Default Alert Distance
                </div>

                <div className="text-xs text-[#667477]">
                  Preset trigger distance for new journeys
                </div>
              </div>

            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-1">

              {DISTANCE_OPTIONS.map((m) => {

                const isSelected =
                  preferences.defaultAlertDistanceMeters === m;

                const label =
                  m < 1000
                    ? `${m} m`
                    : `${m / 1000} km`;

                return (
                  <button
                    key={m}
                    onClick={() =>
                      onUpdatePreferences({
                        defaultAlertDistanceMeters: m
                      })
                    }
                    className={`py-1.5 rounded-md text-xs font-medium transition-all btn-press ${
                      isSelected
                        ? 'bg-[#D96C45] text-white font-bold shadow-xs'
                        : 'bg-[#F7F3EA] border border-[#E4DCC8] text-[#667477] hover:text-[#173F43]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}

            </div>

          </div>

        </section>

        {/* SECTION 2: ALARM */}
        <section className="space-y-2.5">

          <div className="text-[11px] font-bold tracking-[0.18em] text-[#667477] uppercase px-1">
            ALARM
          </div>

          <div className="bg-white rounded-lg border border-[#E4DCC8] divide-y divide-[#F2ECE0] overflow-hidden shadow-xs">

            {/* Wake-Up Sound */}
            <div className="p-4 space-y-3">

              <div className="flex items-center justify-between gap-3">

                <div className="flex items-center gap-3 min-w-0">

                  <div className="w-7 h-7 rounded-md bg-[#FAF2DF] border border-[#D9A441]/40 flex items-center justify-center text-[#D9A441] shrink-0">
                    <Volume2 className="w-3.5 h-3.5 stroke-[2]" />
                  </div>

                  <div className="min-w-0">

                    <div className="text-xs font-semibold text-[#667477]">
                      Wake-up Sound
                    </div>

                    <div className="text-sm font-bold text-[#173F43] truncate mt-0.5">
                      {preferences.alarmSoundName ||
                        'WakeWay Default'}
                    </div>

                  </div>

                </div>

                {/* Preview Button */}
                <button
                  id="btn-preview-sound"
                  onClick={handlePreviewToggle}
                  className="px-2.5 py-1.5 rounded-md bg-[#F7F3EA] hover:bg-[#EAE4D3] border border-[#E4DCC8] text-[#173F43] text-xs font-semibold transition-colors btn-press shrink-0 flex items-center gap-1.5"
                  title={
                    isPlayingPreview
                      ? 'Stop preview'
                      : 'Play preview'
                  }
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

              {/* Sound Actions */}
              <div className="flex items-center gap-2 pt-1">

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                  className="hidden"
                />

                <button
                  id="btn-choose-sound"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="flex-1 py-1.5 px-3 rounded-md bg-[#F7F3EA] hover:bg-[#EAE4D3] border border-[#E4DCC8] text-xs font-medium text-[#173F43] flex items-center justify-center gap-1.5 transition-colors btn-press"
                >

                  <Upload className="w-3.5 h-3.5 text-[#667477]" />

                  <span>
                    Choose Custom Audio
                  </span>

                </button>

                {preferences.customAudioBlobUrl && (
                  <button
                    id="btn-reset-default-sound"
                    onClick={
                      handleResetDefaultSound
                    }
                    className="py-1.5 px-2.5 rounded-md text-xs text-[#667477] hover:text-[#D96C45] hover:bg-[#F7F3EA] flex items-center gap-1 transition-colors"
                  >

                    <RotateCcw className="w-3 h-3" />

                    <span>Reset</span>

                  </button>
                )}

              </div>

            </div>

            {/* Vibration Toggle */}
            <div className="p-4 flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="w-7 h-7 rounded-md bg-[#FAF2DF] border border-[#D9A441]/40 flex items-center justify-center text-[#D9A441] shrink-0">
                  <Vibrate className="w-3.5 h-3.5" />
                </div>

                <div>

                  <div className="text-sm font-semibold text-[#173F43]">
                    Vibration
                  </div>

                  <div className="text-xs text-[#667477]">
                    Vibrate continuously during alarm trigger
                  </div>

                </div>

              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">

                <input
                  type="checkbox"
                  id="toggle-vibration"
                  checked={
                    preferences.isVibrationEnabled
                  }
                  onChange={(e) =>
                    onUpdatePreferences({
                      isVibrationEnabled:
                        e.target.checked
                    })
                  }
                  className="sr-only peer"
                />

                <div className="w-10 h-6 bg-[#E4DCC8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white peer-checked:after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#D96C45]"></div>

              </label>

            </div>

          </div>

        </section>

        {/* SECTION 3: PERMISSIONS */}
        <section className="space-y-2.5">

          <div className="text-[11px] font-bold tracking-[0.18em] text-[#667477] uppercase px-1">
            PERMISSIONS
          </div>

          <div className="bg-white rounded-lg border border-[#E4DCC8] divide-y divide-[#F2ECE0] overflow-hidden text-xs shadow-xs">

            <div className="p-3.5 flex items-center justify-between">

              <div className="flex items-center gap-2.5">

                <ShieldCheck className="w-4 h-4 text-[#9EAD9A]" />

                <div>

                  <div className="font-semibold text-[#173F43]">
                    Location Access
                  </div>

                  <div className="text-[11px] text-[#667477]">
                    Foreground GPS Journey Service
                  </div>

                </div>

              </div>

              <span className="font-semibold text-[#173F43] bg-[#EBF0EA] border border-[#9EAD9A]/60 px-2 py-0.5 rounded text-[10px]">
                Active
              </span>

            </div>

            <div className="p-3.5 flex items-center justify-between">

              <div className="flex items-center gap-2.5">

                <ShieldCheck className="w-4 h-4 text-[#9EAD9A]" />

                <div>

                  <div className="font-semibold text-[#173F43]">
                    Full Screen Notifications
                  </div>

                  <div className="text-[11px] text-[#667477]">
                    Lock-screen alarm override
                  </div>

                </div>

              </div>

              <span className="font-semibold text-[#173F43] bg-[#EBF0EA] border border-[#9EAD9A]/60 px-2 py-0.5 rounded text-[10px]">
                Active
              </span>

            </div>

          </div>

        </section>

        {/* SECTION 4: ABOUT */}
        <section className="space-y-2.5">

          <div className="text-[11px] font-bold tracking-[0.18em] text-[#667477] uppercase px-1">
            ABOUT
          </div>

          <div className="bg-white rounded-lg border border-[#E4DCC8] p-4 space-y-2 text-xs shadow-xs">

            <div className="flex items-center gap-2 text-[#173F43] font-bold text-sm">

              <Info className="w-4 h-4 text-[#D96C45]" />

              <span>
                WakeWay Travel Companion
              </span>

            </div>

            <p className="leading-relaxed text-[11px] text-[#667477]">
              Monitors your journey and wakes you when
              you approach your destination. Runs entirely
              on-device with zero telemetry.
            </p>

            <div className="text-[11px] text-[#173F43] font-semibold pt-1 border-t border-[#F2ECE0] flex items-center justify-between">

              <span>
                Version 1.0.0
              </span>

              <span className="text-[#D96C45]">
                Production Ready
              </span>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
};