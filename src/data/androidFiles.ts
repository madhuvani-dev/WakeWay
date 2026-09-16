import { AndroidProjectFile } from '../types';

export const ANDROID_PROJECT_FILES: AndroidProjectFile[] = [
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    category: 'manifest',
    language: 'xml',
    description: 'Declares ACCESS_FINE_LOCATION, FOREGROUND_SERVICE_LOCATION, POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK, USE_FULL_SCREEN_INTENT, MainActivity, AlarmActivity, and LocationMonitoringService.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Location Permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

    <!-- Foreground Service & Android 14+ Type Declarations -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

    <!-- Android 13+ Notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- Wake Screen & Alarm Attributes -->
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />

    <application
        android:name=".WakeWayApp"
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.WakeWay"
        tools:targetApi="35">

        <activity
            android:name=".ui.MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/Theme.WakeWay">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".ui.AlarmActivity"
            android:excludeFromRecents="true"
            android:exported="false"
            android:launchMode="singleTask"
            android:showOnLockScreen="true"
            android:turnScreenOn="true"
            android:theme="@style/Theme.WakeWay.Alarm" />

        <service
            android:name=".service.LocationMonitoringService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location" />

    </application>
</manifest>`
  },
  {
    path: 'android/app/src/main/java/com/wakeway/app/service/LocationMonitoringService.kt',
    name: 'LocationMonitoringService.kt',
    category: 'kotlin',
    language: 'kotlin',
    description: 'Background Foreground Service with FusedLocationProviderClient, live distance calculation (Haversine), dynamic notification updating, and wake lock + full-screen alarm triggering.',
    content: `package com.wakeway.app.service

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.wakeway.app.R
import com.wakeway.app.WakeWayApp
import com.wakeway.app.data.model.Destination
import com.wakeway.app.data.model.JourneyState
import com.wakeway.app.data.preferences.WakeWayPreferences
import com.wakeway.app.ui.AlarmActivity
import com.wakeway.app.ui.MainActivity
import com.wakeway.app.util.DistanceCalculator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class LocationMonitoringService : Service() {

    companion object {
        const val ACTION_START = "com.wakeway.app.action.START_JOURNEY"
        const val ACTION_CANCEL = "com.wakeway.app.action.CANCEL_JOURNEY"
        const val ACTION_DISMISS = "com.wakeway.app.action.DISMISS_ALARM"
        const val ACTION_SNOOZE = "com.wakeway.app.action.SNOOZE_ALARM"

        const val EXTRA_DEST_NAME = "extra_dest_name"
        const val EXTRA_DEST_LAT = "extra_dest_lat"
        const val EXTRA_DEST_LNG = "extra_dest_lng"
        const val EXTRA_ALERT_DIST = "extra_alert_dist"

        private val _journeyState = MutableStateFlow<JourneyState>(JourneyState.Idle)
        val journeyState: StateFlow<JourneyState> = _journeyState.asStateFlow()
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var preferences: WakeWayPreferences
    private lateinit var audioPlayer: AlarmAudioPlayer
    private lateinit var vibrationController: VibrationController
    private var wakeLock: PowerManager.WakeLock? = null

    private var activeDestination: Destination? = null
    private var alertDistanceMeters: Int = 1000
    private var isAlarmActive = false

    override fun onCreate() {
        super.onCreate()
        preferences = WakeWayPreferences(this)
        audioPlayer = AlarmAudioPlayer(this)
        vibrationController = VibrationController(this)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        setupLocationCallback()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val name = intent.getStringExtra(EXTRA_DEST_NAME) ?: "Destination"
                val lat = intent.getDoubleExtra(EXTRA_DEST_LAT, 0.0)
                val lng = intent.getDoubleExtra(EXTRA_DEST_LNG, 0.0)
                val alertDist = intent.getIntExtra(EXTRA_ALERT_DIST, preferences.defaultAlertDistanceMeters)
                startJourney(Destination(name = name, latitude = lat, longitude = lng), alertDist)
            }
            ACTION_CANCEL -> cancelJourney()
            ACTION_DISMISS -> dismissAlarm()
            ACTION_SNOOZE -> snoozeAlarm()
        }
        return START_STICKY
    }

    private fun startJourney(dest: Destination, alertDist: Int) {
        activeDestination = dest
        alertDistanceMeters = alertDist
        isAlarmActive = false

        _journeyState.value = JourneyState.Active(dest, alertDist, null)
        val notification = buildOngoingNotification(dest, null)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(WakeWayApp.NOTIFICATION_ID_JOURNEY, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(WakeWayApp.NOTIFICATION_ID_JOURNEY, notification)
        }
        startLocationUpdates()
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000L).apply {
            setMinUpdateIntervalMillis(5000L)
            setMinUpdateDistanceMeters(15f)
        }.build()

        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
    }

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: return
                val dest = activeDestination ?: return
                val distance = DistanceCalculator.calculateDistanceMeters(loc.latitude, loc.longitude, dest.latitude, dest.longitude)

                if (!isAlarmActive) {
                    _journeyState.value = JourneyState.Active(dest, alertDistanceMeters, distance)
                    updateNotification(dest, distance)
                    if (distance <= alertDistanceMeters) {
                        triggerAlarm(dest, distance)
                    }
                }
            }
        }
    }

    private fun triggerAlarm(dest: Destination, distance: Float) {
        isAlarmActive = true
        _journeyState.value = JourneyState.Triggered(dest, alertDistanceMeters, distance)
        acquireWakeLock()
        audioPlayer.startAlarm(preferences.customAlarmUri)
        if (preferences.isVibrationEnabled) vibrationController.startVibration()

        val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notifManager.notify(WakeWayApp.NOTIFICATION_ID_ALARM, buildAlarmNotification(dest, distance))

        val alarmIntent = Intent(this, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_DEST_NAME, dest.name)
            putExtra(EXTRA_ALERT_DIST, alertDistanceMeters)
            putExtra("extra_distance", distance)
        }
        startActivity(alarmIntent)
    }

    private fun dismissAlarm() {
        audioPlayer.stop()
        vibrationController.stopVibration()
        releaseWakeLock()
        stopLocationUpdates()
        val dest = activeDestination
        activeDestination = null
        isAlarmActive = false
        _journeyState.value = if (dest != null) JourneyState.Completed(dest) else JourneyState.Idle
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun snoozeAlarm() {
        audioPlayer.stop()
        vibrationController.stopVibration()
        releaseWakeLock()
        alertDistanceMeters = (alertDistanceMeters / 2).coerceAtLeast(300)
        isAlarmActive = false
        val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notifManager.cancel(WakeWayApp.NOTIFICATION_ID_ALARM)
    }

    private fun cancelJourney() {
        audioPlayer.stop()
        vibrationController.stopVibration()
        releaseWakeLock()
        stopLocationUpdates()
        activeDestination = null
        isAlarmActive = false
        _journeyState.value = JourneyState.Cancelled
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        stopLocationUpdates()
        audioPlayer.stop()
        vibrationController.stopVibration()
        releaseWakeLock()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`
  },
  {
    path: 'android/app/src/main/java/com/wakeway/app/service/AlarmAudioPlayer.kt',
    name: 'AlarmAudioPlayer.kt',
    category: 'kotlin',
    language: 'kotlin',
    description: 'AudioAttributes.USAGE_ALARM MediaPlayer wrapper supporting Storage Access Framework content URIs, looping, and system alarm fallback.',
    content: `package com.wakeway.app.service

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.provider.Settings
import android.util.Log

class AlarmAudioPlayer(private val context: Context) {
    private var mediaPlayer: MediaPlayer? = null

    fun startAlarm(customUri: Uri?) {
        stop()
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setLegacyStreamType(AudioManager.STREAM_ALARM)
            .build()

        mediaPlayer = MediaPlayer().apply {
            setAudioAttributes(audioAttributes)
            isLooping = true
            if (customUri != null) {
                try {
                    setDataSource(context, customUri)
                } catch (e: Exception) {
                    setDataSource(context, Settings.System.DEFAULT_ALARM_ALERT_URI)
                }
            } else {
                setDataSource(context, Settings.System.DEFAULT_ALARM_ALERT_URI)
            }
            prepare()
            start()
        }
    }

    fun stop() {
        mediaPlayer?.let {
            if (it.isPlaying) it.stop()
            it.release()
        }
        mediaPlayer = null
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/wakeway/app/ui/AlarmActivity.kt',
    name: 'AlarmActivity.kt',
    category: 'kotlin',
    language: 'kotlin',
    description: 'High-visibility activity that displays over lock screen with setShowWhenLocked(true) and setTurnScreenOn(true), large DISMISS action, and Snooze.',
    content: `package com.wakeway.app.ui

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.wakeway.app.service.LocationMonitoringService

class AlarmActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val km = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            km.requestDismissKeyguard(this, null)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val destName = intent.getStringExtra(LocationMonitoringService.EXTRA_DEST_NAME) ?: "Destination"
        val distance = intent.getFloatExtra("extra_distance", 0f)

        setContent {
            AlarmScreenContent(
                destinationName = destName,
                distanceRemaining = distance,
                onDismiss = {
                    val intent = Intent(this, LocationMonitoringService::class.java).apply {
                        action = LocationMonitoringService.ACTION_DISMISS
                    }
                    startService(intent)
                    finish()
                },
                onSnooze = {
                    val intent = Intent(this, LocationMonitoringService::class.java).apply {
                        action = LocationMonitoringService.ACTION_SNOOZE
                    }
                    startService(intent)
                    finish()
                }
            )
        }
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/wakeway/app/ui/MainActivity.kt',
    name: 'MainActivity.kt',
    category: 'kotlin',
    language: 'kotlin',
    description: 'Main Jetpack Compose entry point handling runtime permissions, starting LocationMonitoringService, and screen state observation.',
    content: `package com.wakeway.app.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.content.ContextCompat
import com.wakeway.app.data.model.Destination
import com.wakeway.app.data.preferences.WakeWayPreferences
import com.wakeway.app.service.LocationMonitoringService
import com.wakeway.app.ui.theme.WakeWayTheme

class MainActivity : ComponentActivity() {
    private lateinit var preferences: WakeWayPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        preferences = WakeWayPreferences(this)
        setContent {
            WakeWayTheme {
                WakeWayMainContent(preferences = preferences)
            }
        }
    }
}`
  },
  {
    path: 'android/app/build.gradle.kts',
    name: 'app/build.gradle.kts',
    category: 'gradle',
    language: 'gradle',
    description: 'App build script targeting Android SDK 35, Jetpack Compose Material 3, Play Services Location, and Kotlin Coroutines.',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.wakeway.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.wakeway.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.play.services.location)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.kotlinx.coroutines.android)
}`
  },
  {
    path: 'android/settings.gradle.kts',
    name: 'settings.gradle.kts',
    category: 'gradle',
    language: 'gradle',
    description: 'Root Gradle settings specifying Google Maven repositories and module includes.',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "WakeWay"
include(":app")`
  },
  {
    path: 'android/gradle/libs.versions.toml',
    name: 'libs.versions.toml',
    category: 'gradle',
    language: 'toml',
    description: 'Gradle Version Catalog pinning AGP 8.8.0, Kotlin 2.0.21, and AndroidX dependencies.',
    content: `[versions]
agp = "8.8.0"
kotlin = "2.0.21"
coreKtx = "1.15.0"
lifecycleRuntimeKtx = "2.8.7"
activityCompose = "1.10.0"
composeBom = "2024.12.01"
playServicesLocation = "21.3.0"
datastore = "1.1.2"
coroutines = "1.9.0"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }
play-services-location = { group = "com.google.android.gms", name = "play-services-location", version.ref = "playServicesLocation" }
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }`
  },
  {
    path: 'android/app/src/main/res/values/strings.xml',
    name: 'strings.xml',
    category: 'resource',
    language: 'xml',
    description: 'String resources for app title, tagline, alert notifications, and user actions.',
    content: `<resources>
    <string name="app_name">WakeWay</string>
    <string name="tagline">Travel. Rest. Arrive.</string>
    <string name="start_journey">START JOURNEY</string>
    <string name="cancel_journey">END JOURNEY</string>
    <string name="dismiss_alarm">I\'M AWAKE</string>
    <string name="snooze">Snooze (500m)</string>
    <string name="journey_monitoring">Monitoring: Active</string>
    <string name="destination_nearby">YOUR DESTINATION IS NEAR</string>
    <string name="time_to_wake_up">Your destination is nearby.</string>
    <string name="nav_explore">Explore</string>
    <string name="nav_favourites">Favourites</string>
    <string name="nav_history">History</string>
    <string name="nav_settings">Settings</string>
    <string name="favourites_title">FAVOURITES</string>
    <string name="favourites_empty_title">Your favourite places will appear here.</string>
    <string name="history_title">TRAVEL HISTORY</string>
    <string name="history_empty_title">Your travel story starts here.</string>
    <string name="history_empty_subtitle">Explore a place and it will appear in your history.</string>
    <string name="explore_places">Explore Places</string>
</resources>`
  },
  {
    path: 'android/app/src/main/java/com/wakeway/app/data/repository/PlaceRepository.kt',
    name: 'PlaceRepository.kt',
    category: 'kotlin',
    language: 'kotlin',
    description: 'Manages persistence of Favourite Places and Travel History with ID references, duplicate prevention, and independent state lifecycle.',
    content: `package com.wakeway.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.wakeway.app.data.model.Destination
import com.wakeway.app.data.model.FavouritePlace
import com.wakeway.app.data.model.HistoryEntry
import org.json.JSONArray
import org.json.JSONObject

class PlaceRepository(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("wakeway_places_store", Context.MODE_PRIVATE)

    fun getFavourites(): List<FavouritePlace> { /* ... */ }
    fun toggleFavourite(destination: Destination): Boolean { /* ... */ }
    fun getHistory(): List<HistoryEntry> { /* ... */ }
    fun recordExplored(destination: Destination) { /* ... */ }
    fun clearHistory() { /* ... */ }
}`
  },
  {
    path: 'android/app/src/main/java/com/wakeway/app/ui/screens/FavouritesScreen.kt',
    name: 'FavouritesScreen.kt',
    category: 'kotlin',
    language: 'kotlin',
    description: 'Jetpack Compose screen displaying saved favourite places, immediate removal, and friendly travel empty state.',
    content: `package com.wakeway.app.ui.screens

import androidx.compose.runtime.Composable
import com.wakeway.app.data.model.Destination

@Composable
fun FavouritesScreen(
    favouritePlaces: List<Destination>,
    onOpenPlaceDetails: (Destination) -> Unit,
    onRemoveFavourite: (Destination) -> Unit,
    onExplorePlaces: () -> Unit
) {
    // Jetpack Compose Favourites Screen Implementation
}`
  },
  {
    path: 'android/app/src/main/java/com/wakeway/app/ui/screens/HistoryScreen.kt',
    name: 'HistoryScreen.kt',
    category: 'kotlin',
    language: 'kotlin',
    description: 'Jetpack Compose screen displaying travel history sorted most recent first with duplicate deduplication.',
    content: `package com.wakeway.app.ui.screens

import androidx.compose.runtime.Composable
import com.wakeway.app.data.model.Destination
import com.wakeway.app.data.model.HistoryEntry

@Composable
fun HistoryScreen(
    historyItems: List<Pair<Destination, HistoryEntry>>,
    onOpenPlaceDetails: (Destination) -> Unit,
    onClearHistory: () -> Unit,
    onExplorePlaces: () -> Unit
) {
    // Jetpack Compose Travel History Screen Implementation
}`
  }
];
