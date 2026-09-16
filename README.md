# WakeWay - Travel Without Worries

WakeWay is a complete, production-grade Android utility application built in Kotlin with Jetpack Compose, Android Foreground Services, and Android Location APIs.

It ensures commuters and long-distance travellers never miss their destination stop by quietly monitoring real-time geographic distance in the background and sounding a loud, persistent alarm with vibration when approaching within the configured alert radius.

---

## 🚀 How to Open in Android Studio

### Option 1: AI Studio Export (GitHub / ZIP)
1. In Google AI Studio Build, click on the **Settings / Export** menu in the top bar.
2. Select **Export to ZIP** or **Push to GitHub**.
3. Extract the downloaded archive.
4. Open **Android Studio** (Hedgehog, Iguana, Jellyfish, Koala, Ladybug, Meerkat or newer).
5. Select **File > Open** and choose the `android/` directory (or the root if Gradle files are at root).
6. Allow Gradle to sync dependencies automatically.
7. Click **Run** (`Shift + F10`) to launch on an Android physical device or emulator.

---

## 📱 Android Architecture & Key Components

- **Application (`WakeWayApp.kt`)**: Sets up dual Notification Channels:
  - `wakeway_journey_channel`: Low importance ongoing notification showing distance countdown without noise.
  - `wakeway_alarm_channel`: High importance alarm channel with heads-up display and audio sonification.
- **Foreground Service (`LocationMonitoringService.kt`)**:
  - Bound to `FOREGROUND_SERVICE_TYPE_LOCATION` (Android 14+ compliant).
  - Uses `FusedLocationProviderClient` with balanced power accuracy to preserve battery life while travelling.
  - Calculates great-circle distance with Haversine formula and Android `Location.distanceBetween`.
  - Automatically triggers alarm when remaining distance <= alert threshold.
- **Alarm Activity (`AlarmActivity.kt`)**:
  - Wakes screen and displays over the device lock screen (`setShowWhenLocked(true)`, `setTurnScreenOn(true)`).
  - Prominent "DISMISS ALARM" button and optional "Snooze 500m".
- **Audio Engine (`AlarmAudioPlayer.kt`)**:
  - Sets `AudioAttributes.USAGE_ALARM` so alarm rings even if phone is on normal media mute.
  - Supports custom user audio files via Storage Access Framework (SAF) URI with fallback.
- **Vibration (`VibrationController.kt`)**:
  - Gentle yet unmistakable wake-up vibration pulses.
- **Jetpack Compose UI**:
  - Pure Material 3 design with deep navy `#0B132B` and soft sky teal `#00B4D8`.
  - Clean single-action home screen, focused HUD journey screen, and custom sound picker.
