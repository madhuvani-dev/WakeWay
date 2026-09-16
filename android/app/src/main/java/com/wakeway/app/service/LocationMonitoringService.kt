package com.wakeway.app.service

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

/**
 * Foreground Service responsible for tracking location during an active journey,
 * updating distance notifications, and triggering the wake alarm when reaching alert radius.
 */
class LocationMonitoringService : Service() {

    companion object {
        private const val TAG = "WakeWayLocationService"

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

        fun isRunning(): Boolean {
            return _journeyState.value is JourneyState.Active ||
                   _journeyState.value is JourneyState.Triggered
        }
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

                val dest = Destination(name = name, latitude = lat, longitude = lng)
                startJourney(dest, alertDist)
            }
            ACTION_CANCEL -> {
                cancelJourney()
            }
            ACTION_DISMISS -> {
                dismissAlarm()
            }
            ACTION_SNOOZE -> {
                snoozeAlarm()
            }
        }
        return START_STICKY
    }

    private fun startJourney(dest: Destination, alertDist: Int) {
        activeDestination = dest
        alertDistanceMeters = alertDist
        isAlarmActive = false

        _journeyState.value = JourneyState.Active(
            destination = dest,
            alertDistanceMeters = alertDist,
            currentDistanceMeters = null
        )

        // Start Foreground Service with Type Location
        val notification = buildOngoingNotification(dest, null)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                WakeWayApp.NOTIFICATION_ID_JOURNEY,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(WakeWayApp.NOTIFICATION_ID_JOURNEY, notification)
        }

        startLocationUpdates()
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            10000L // 10 seconds standard travel interval
        ).apply {
            setMinUpdateIntervalMillis(5000L) // Fastest interval: 5 seconds
            setMinUpdateDistanceMeters(15f) // Update when moved 15 meters
            setWaitForAccurateLocation(false)
        }.build()

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission missing", e)
        }
    }

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                val location = locationResult.lastLocation ?: return
                onNewLocation(location)
            }
        }
    }

    private fun onNewLocation(location: Location) {
        val dest = activeDestination ?: return

        val distance = DistanceCalculator.calculateDistanceMeters(
            location.latitude,
            location.longitude,
            dest.latitude,
            dest.longitude
        )

        // Update state
        if (!isAlarmActive) {
            _journeyState.value = JourneyState.Active(
                destination = dest,
                alertDistanceMeters = alertDistanceMeters,
                currentDistanceMeters = distance
            )

            // Update ongoing notification
            updateNotification(dest, distance)

            // Check if alert radius reached
            if (distance <= alertDistanceMeters) {
                triggerAlarm(dest, distance)
            }
        }
    }

    private fun triggerAlarm(dest: Destination, distance: Float) {
        isAlarmActive = true
        _journeyState.value = JourneyState.Triggered(
            destination = dest,
            alertDistanceMeters = alertDistanceMeters,
            currentDistanceMeters = distance
        )

        acquireWakeLock()

        // 1. Play Sound
        audioPlayer.startAlarm(preferences.customAlarmUri)

        // 2. Vibrate
        if (preferences.isVibrationEnabled) {
            vibrationController.startVibration()
        }

        // 3. Post full screen alarm notification
        val alarmNotification = buildAlarmNotification(dest, distance)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(WakeWayApp.NOTIFICATION_ID_ALARM, alarmNotification)

        // 4. Launch dedicated AlarmActivity
        val alarmIntent = Intent(this, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_DEST_NAME, dest.name)
            putExtra(EXTRA_ALERT_DIST, alertDistanceMeters)
            putExtra("extra_distance", distance)
        }
        startActivity(alarmIntent)
    }

    private fun dismissAlarm() {
        stopAlarmAudioAndVibration()
        stopLocationUpdates()
        releaseWakeLock()

        val dest = activeDestination
        activeDestination = null
        isAlarmActive = false

        if (dest != null) {
            _journeyState.value = JourneyState.Completed(dest)
        } else {
            _journeyState.value = JourneyState.Idle
        }

        // Remove notifications
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(WakeWayApp.NOTIFICATION_ID_ALARM)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun snoozeAlarm() {
        stopAlarmAudioAndVibration()
        releaseWakeLock()

        // Snooze alert distance: halve or reduce distance by 500m
        val newAlertDistance = (alertDistanceMeters / 2).coerceAtLeast(300)
        alertDistanceMeters = newAlertDistance
        isAlarmActive = false

        activeDestination?.let { dest ->
            _journeyState.value = JourneyState.Active(
                destination = dest,
                alertDistanceMeters = newAlertDistance
            )
            updateNotification(dest, null)
        }

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(WakeWayApp.NOTIFICATION_ID_ALARM)
    }

    private fun cancelJourney() {
        stopAlarmAudioAndVibration()
        stopLocationUpdates()
        releaseWakeLock()

        activeDestination = null
        isAlarmActive = false
        _journeyState.value = JourneyState.Cancelled

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(WakeWayApp.NOTIFICATION_ID_ALARM)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun stopLocationUpdates() {
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Error removing location updates", e)
        }
    }

    private fun stopAlarmAudioAndVibration() {
        audioPlayer.stop()
        vibrationController.stopVibration()
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "WakeWay:AlarmWakeLock"
            ).apply {
                acquire(10 * 60 * 1000L) // 10 minutes max wake safety
            }
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock", e)
        } finally {
            wakeLock = null
        }
    }

    private fun buildOngoingNotification(dest: Destination, distance: Float?): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val cancelIntent = Intent(this, LocationMonitoringService::class.java).apply {
            action = ACTION_CANCEL
        }
        val cancelPendingIntent = PendingIntent.getService(
            this,
            1,
            cancelIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val formattedDistance = DistanceCalculator.formatDistance(distance)
        val contentText = if (distance != null) {
            "$formattedDistance remaining • Alert at ${DistanceCalculator.formatDistance(alertDistanceMeters.toFloat())}"
        } else {
            getString(R.string.journey_monitoring)
        }

        return NotificationCompat.Builder(this, WakeWayApp.CHANNEL_ID_JOURNEY)
            .setContentTitle("On the way to ${dest.name}")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(0, "Cancel", cancelPendingIntent)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .build()
    }

    private fun updateNotification(dest: Destination, distance: Float?) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(
            WakeWayApp.NOTIFICATION_ID_JOURNEY,
            buildOngoingNotification(dest, distance)
        )
    }

    private fun buildAlarmNotification(dest: Destination, distance: Float): Notification {
        val fullScreenIntent = Intent(this, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_DEST_NAME, dest.name)
            putExtra("extra_distance", distance)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            2,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val dismissIntent = Intent(this, LocationMonitoringService::class.java).apply {
            action = ACTION_DISMISS
        }
        val dismissPendingIntent = PendingIntent.getService(
            this,
            3,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, WakeWayApp.CHANNEL_ID_ALARM)
            .setContentTitle(getString(R.string.destination_nearby))
            .setContentText("Approaching ${dest.name}! ${getString(R.string.time_to_wake_up)}")
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setOngoing(true)
            .addAction(0, getString(R.string.dismiss_alarm), dismissPendingIntent)
            .build()
    }

    override fun onDestroy() {
        stopLocationUpdates()
        stopAlarmAudioAndVibration()
        releaseWakeLock()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
