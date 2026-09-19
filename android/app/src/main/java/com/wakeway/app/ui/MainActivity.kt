package com.wakeway.app.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.wakeway.app.data.model.Destination
import com.wakeway.app.data.model.JourneyState
import com.wakeway.app.data.preferences.WakeWayPreferences
import com.wakeway.app.service.LocationMonitoringService
import com.wakeway.app.ui.screens.HomeScreen
import com.wakeway.app.ui.screens.JourneyScreen
import com.wakeway.app.ui.screens.SettingsScreen
import com.wakeway.app.ui.theme.WakeWayTheme
import com.wakeway.app.util.PermissionHelper

enum class Screen {
    HOME,
    SETTINGS
}

class MainActivity : ComponentActivity() {

    private lateinit var preferences: WakeWayPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        preferences = WakeWayPreferences(this)

        setContent {
            WakeWayTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    WakeWayMainContent(preferences = preferences)
                }
            }
        }
    }

    @Composable
    fun WakeWayMainContent(preferences: WakeWayPreferences) {
        val journeyState by LocationMonitoringService.journeyState.collectAsState()
        var currentScreen by remember { mutableStateOf(Screen.HOME) }

        // Pending destination to start once permissions are granted
        var pendingJourney by remember { mutableStateOf<Pair<Destination, Int>?>(null) }

        val permissionLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->
            val hasLocation = permissions[android.Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                              permissions[android.Manifest.permission.ACCESS_COARSE_LOCATION] == true
            if (hasLocation) {
                pendingJourney?.let { (dest, dist) ->
                    executeStartJourney(dest, dist)
                    pendingJourney = null
                }
            } else {
                Toast.makeText(
                    this,
                    "Location permission is required for WakeWay to monitor your journey.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

        // Handle Active or Triggered Journey State
        when (val state = journeyState) {
            is JourneyState.Active -> {
                JourneyScreen(
                    destination = state.destination,
                    alertDistanceMeters = state.alertDistanceMeters,
                    currentDistanceMeters = state.currentDistanceMeters,
                    currentSpeedKmh = state.currentSpeedKmh,
                    onCancelJourney = {
                        val intent = Intent(this, LocationMonitoringService::class.java).apply {
                            action = LocationMonitoringService.ACTION_CANCEL
                        }
                        startService(intent)
                    }
                )
            }
            is JourneyState.Triggered -> {
                // If the alarm is triggered, launch AlarmActivity
                LaunchedEffect(state) {
                    val intent = Intent(this@MainActivity, AlarmActivity::class.java).apply {
                        putExtra(LocationMonitoringService.EXTRA_DEST_NAME, state.destination.name)
                        putExtra("extra_distance", state.currentDistanceMeters)
                    }
                    startActivity(intent)
                }
                JourneyScreen(
                    destination = state.destination,
                    alertDistanceMeters = state.alertDistanceMeters,
                    currentDistanceMeters = state.currentDistanceMeters,
                    onCancelJourney = {
                        val intent = Intent(this, LocationMonitoringService::class.java).apply {
                            action = LocationMonitoringService.ACTION_CANCEL
                        }
                        startService(intent)
                    }
                )
            }
            is JourneyState.Completed -> {
                LaunchedEffect(state) {
                    Toast.makeText(this@MainActivity, "Journey complete! You have arrived.", Toast.LENGTH_LONG).show()
                }
                HomeScreen(
                    preferences = preferences,
                    onStartJourney = { dest, dist ->
                        checkPermissionsAndStart(dest, dist) { p -> permissionLauncher.launch(p) }
                    },
                    onOpenSettings = { currentScreen = Screen.SETTINGS }
                )
            }
            else -> {
                if (currentScreen == Screen.SETTINGS) {
                    SettingsScreen(
                        preferences = preferences,
                        onBack = { currentScreen = Screen.HOME }
                    )
                } else {
                    HomeScreen(
                        preferences = preferences,
                        onStartJourney = { dest, dist ->
                            if (!PermissionHelper.isGpsEnabled(this)) {
                                Toast.makeText(
                                    this,
                                    "Please turn on device GPS / Location services to start.",
                                    Toast.LENGTH_LONG
                                ).show()
                            } else {
                                pendingJourney = Pair(dest, dist)
                                checkPermissionsAndStart(dest, dist) { p -> permissionLauncher.launch(p) }
                            }
                        },
                        onOpenSettings = { currentScreen = Screen.SETTINGS }
                    )
                }
            }
        }
    }

    private fun checkPermissionsAndStart(
        destination: Destination,
        alertDistanceMeters: Int,
        requestPermissions: (Array<String>) -> Unit
    ) {
        if (!PermissionHelper.hasLocationPermission(this)) {
            requestPermissions(PermissionHelper.getRequiredRuntimePermissions())
        } else {
            executeStartJourney(destination, alertDistanceMeters)
        }
    }

    private fun executeStartJourney(destination: Destination, alertDistanceMeters: Int) {
        val intent = Intent(this, LocationMonitoringService::class.java).apply {
            action = LocationMonitoringService.ACTION_START
            putExtra(LocationMonitoringService.EXTRA_DEST_NAME, destination.name)
            putExtra(LocationMonitoringService.EXTRA_DEST_LAT, destination.latitude)
            putExtra(LocationMonitoringService.EXTRA_DEST_LNG, destination.longitude)
            putExtra(LocationMonitoringService.EXTRA_ALERT_DIST, alertDistanceMeters)
        }
        ContextCompat.startForegroundService(this, intent)
    }
}
