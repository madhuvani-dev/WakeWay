package com.wakeway.app.ui.screens

import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakeway.app.data.preferences.WakeWayPreferences
import com.wakeway.app.service.AlarmAudioPlayer
import com.wakeway.app.util.PermissionHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    preferences: WakeWayPreferences,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val audioPlayer = remember { AlarmAudioPlayer(context) }
    var isPreviewPlaying by remember { mutableStateOf(false) }

    var alarmSoundName by remember { mutableStateOf(preferences.alarmSoundName) }
    var vibrationEnabled by remember { mutableStateOf(preferences.isVibrationEnabled) }
    var defaultDistanceMeters by remember { mutableStateOf(preferences.defaultAlertDistanceMeters) }

    // SAF Document Picker for Audio Files
    val audioPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                // Persist read permissions across device reboots
                val takeFlags: Int = Intent.FLAG_GRANT_READ_URI_PERMISSION
                context.contentResolver.takePersistableUriPermission(uri, takeFlags)
            } catch (e: Exception) {
                // Some document providers may not support persistable permissions
            }

            // Extract real filename from OpenableColumns
            var fileName = "Custom Audio"
            try {
                context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (cursor.moveToFirst() && nameIndex >= 0) {
                        fileName = cursor.getString(nameIndex)
                    }
                }
            } catch (e: Exception) {
                fileName = uri.lastPathSegment ?: "Custom Audio"
            }

            preferences.customAlarmUri = uri
            preferences.alarmSoundName = fileName
            alarmSoundName = fileName
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            audioPlayer.stop()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 20.dp, vertical = 12.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // 1. Alarm Sound Section
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Alarm Sound",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Choose your preferred waking sound or choose your own audio file.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Audiotrack,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = alarmSoundName,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = if (preferences.customAlarmUri == null) "Default Tone" else "Custom Audio File",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            // Preview / Stop Button
                            IconButton(onClick = {
                                if (isPreviewPlaying) {
                                    audioPlayer.stop()
                                    isPreviewPlaying = false
                                } else {
                                    isPreviewPlaying = true
                                    audioPlayer.playPreview(preferences.customAlarmUri) {
                                        isPreviewPlaying = false
                                    }
                                }
                            }) {
                                Icon(
                                    imageVector = if (isPreviewPlaying) Icons.Default.Stop else Icons.Default.PlayArrow,
                                    contentDescription = if (isPreviewPlaying) "Stop" else "Preview",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                audioPickerLauncher.launch(
                                    arrayOf("audio/*", "application/ogg")
                                )
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(imageVector = Icons.Default.FolderOpen, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Choose Sound")
                        }

                        if (preferences.customAlarmUri != null) {
                            TextButton(
                                onClick = {
                                    preferences.resetToDefaultSound()
                                    alarmSoundName = preferences.alarmSoundName
                                }
                            ) {
                                Text("Reset Default")
                            }
                        }
                    }
                }
            }

            // 2. Vibration Section
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Vibration",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Vibrate phone when alarm triggers",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = vibrationEnabled,
                        onCheckedChange = {
                            vibrationEnabled = it
                            preferences.isVibrationEnabled = it
                        }
                    )
                }
            }

            // 3. Default Alert Distance
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Default Alert Distance",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Initial alert threshold for new journeys",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(14.dp))

                    val options = listOf(500, 1000, 2000, 3000, 5000)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        options.forEach { dist ->
                            val label = if (dist < 1000) "${dist}m" else "${dist / 1000}km"
                            FilterChip(
                                selected = defaultDistanceMeters == dist,
                                onClick = {
                                    defaultDistanceMeters = dist
                                    preferences.defaultAlertDistanceMeters = dist
                                },
                                label = { Text(label) },
                                shape = RoundedCornerShape(8.dp)
                            )
                        }
                    }
                }
            }

            // 4. Permissions & System Status
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "System Permissions",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Location Permission", style = MaterialTheme.typography.bodyMedium)
                        val hasLoc = PermissionHelper.hasLocationPermission(context)
                        Text(
                            text = if (hasLoc) "Granted" else "Required",
                            color = if (hasLoc) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Notifications", style = MaterialTheme.typography.bodyMedium)
                        val hasNotif = PermissionHelper.hasNotificationPermission(context)
                        Text(
                            text = if (hasNotif) "Granted" else "Required",
                            color = if (hasNotif) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("GPS Services", style = MaterialTheme.typography.bodyMedium)
                        val hasGps = PermissionHelper.isGpsEnabled(context)
                        Text(
                            text = if (hasGps) "Active" else "Disabled",
                            color = if (hasGps) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            // 5. About WakeWay
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "About WakeWay",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "WakeWay is an on-device utility created to help travellers rest peacefully during commutes without missing their stop. All distance calculations run locally on your device.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 20.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Version 1.0.0 • Travel without worries.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}
