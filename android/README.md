# WakeWay Android Studio Project

This directory contains the complete native Android project ready to build and run.

### Prerequisites
- Android Studio Koala / Ladybug / Meerkat (or version 2023.3+)
- Android SDK 35 (compileSdk 35, targetSdk 35, minSdk 26)
- JDK 17 or newer

### Directory Structure
```
android/
├── build.gradle.kts           # Root Gradle build script
├── settings.gradle.kts        # Project settings & repositories
├── gradle.properties          # JVM args & AndroidX flags
├── gradle/
│   ├── libs.versions.toml     # Gradle Version Catalog (AGP 8.8.0, Kotlin 2.0.21)
│   └── wrapper/
│       └── gradle-wrapper.properties
└── app/
    ├── build.gradle.kts       # App module dependencies (Compose, Play Services Location, DataStore)
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml # Permissions (Location, Foreground Service, Notifications, WakeLock)
        ├── java/com/wakeway/app/
        │   ├── WakeWayApp.kt                   # Notification Channels setup
        │   ├── data/
        │   │   ├── model/Destination.kt        # Geo destination model
        │   │   ├── model/JourneyState.kt       # State machine (Idle, Active, Triggered, Completed)
        │   │   └── preferences/WakeWayPreferences.kt # SharedPreferences & SAF URI persistence
        │   ├── service/
        │   │   ├── LocationMonitoringService.kt# Background Foreground Location Service
        │   │   ├── AlarmAudioPlayer.kt         # USAGE_ALARM MediaPlayer with SAF playback
        │   │   └── VibrationController.kt      # Wake-up vibration pulse manager
        │   ├── ui/
        │   │   ├── MainActivity.kt             # Jetpack Compose UI Host & permission flows
        │   │   ├── AlarmActivity.kt            # Lock-screen waking full-screen alarm
        │   │   ├── components/DestinationPickerDialog.kt # Geocoder place search
        │   │   ├── screens/HomeScreen.kt       # Start Journey primary screen
        │   │   ├── screens/JourneyScreen.kt    # Active journey monitoring HUD
        │   │   ├── screens/SettingsScreen.kt   # Sound picker & preferences
        │   │   └── theme/                      # Material 3 Navy & Teal theme
        │   └── util/
        │       ├── DistanceCalculator.kt       # Haversine distance calculations
        │       └── PermissionHelper.kt         # Android 14+ permission checkers
        └── res/
            ├── drawable/                       # Vector icons & drawables
            ├── values/                         # strings.xml, colors.xml, themes.xml
            └── xml/                            # Backup rules & data extraction rules
```
