package com.wakeway.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakeway.app.data.model.Destination
import com.wakeway.app.data.preferences.WakeWayPreferences
import com.wakeway.app.ui.components.DestinationPickerDialog

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    preferences: WakeWayPreferences,
    onStartJourney: (Destination, Int) -> Unit,
    onOpenSettings: () -> Unit
) {
    var selectedDestination by remember { mutableStateOf<Destination?>(null) }
    var selectedDistanceMeters by remember { mutableStateOf(preferences.defaultAlertDistanceMeters) }
    var showDestinationPicker by remember { mutableStateOf(false) }
    var showCustomDistanceDialog by remember { mutableStateOf(false) }
    var customDistanceInput by remember { mutableStateOf("1500") }

    val distanceOptions = listOf(500, 1000, 2000, 3000, 5000)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "WakeWay",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Travel without worries.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
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
            // 1. Destination Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showDestinationPicker = true },
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (selectedDestination != null)
                        MaterialTheme.colorScheme.primaryContainer
                    else
                        MaterialTheme.colorScheme.surfaceVariant
                ),
                border = BorderStroke(
                    1.dp,
                    if (selectedDestination != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                )
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Place,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Destination",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = selectedDestination?.name ?: "Tap to select your stop",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = if (selectedDestination != null) FontWeight.Bold else FontWeight.Normal,
                            color = if (selectedDestination != null) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (selectedDestination != null && selectedDestination?.address?.isNotEmpty() == true) {
                            Text(
                                text = selectedDestination!!.address,
                                style = MaterialTheme.typography.bodySmall,
                                maxLines = 1,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // 2. Alert Distance Selection
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Alert Distance",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = if (selectedDistanceMeters < 1000) "$selectedDistanceMeters m before" else "${selectedDistanceMeters / 1000f} km before",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Distance Chips Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        distanceOptions.forEach { distance ->
                            val label = if (distance < 1000) "${distance}m" else "${distance / 1000}km"
                            val isSelected = selectedDistanceMeters == distance

                            FilterChip(
                                selected = isSelected,
                                onClick = { selectedDistanceMeters = distance },
                                label = { Text(label, fontSize = 13.sp) },
                                shape = RoundedCornerShape(10.dp),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Custom distance button
                    TextButton(
                        onClick = { showCustomDistanceDialog = true },
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Icon(imageVector = Icons.Default.Tune, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Custom distance")
                    }
                }
            }

            // 3. Alarm Sound Summary Preview Tile
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenSettings() },
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(
                    modifier = Modifier.padding(18.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.MusicNote,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(26.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Alarm Sound",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = preferences.alarmSoundName,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Text(
                        text = "Change",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f, fill = false))
            Spacer(modifier = Modifier.height(24.dp))

            // 4. Clearly Dominant Action: START JOURNEY
            Button(
                onClick = {
                    selectedDestination?.let { dest ->
                        onStartJourney(dest, selectedDistanceMeters)
                    }
                },
                enabled = selectedDestination != null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = Color.White,
                    disabledContainerColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                    disabledContentColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            ) {
                Icon(imageVector = Icons.Default.Navigation, contentDescription = null)
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = if (selectedDestination != null) "START JOURNEY" else "Select Destination to Start",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }
        }
    }

    // Destination Dialog
    if (showDestinationPicker) {
        DestinationPickerDialog(
            onDismiss = { showDestinationPicker = false },
            onDestinationSelected = { dest ->
                selectedDestination = dest
            }
        )
    }

    // Custom Distance Dialog
    if (showCustomDistanceDialog) {
        AlertDialog(
            onDismissRequest = { showCustomDistanceDialog = false },
            title = { Text("Custom Alert Distance") },
            text = {
                OutlinedTextField(
                    value = customDistanceInput,
                    onValueChange = { customDistanceInput = it.filter { ch -> ch.isDigit() } },
                    label = { Text("Distance in meters (e.g. 1500)") },
                    singleLine = true
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    val dist = customDistanceInput.toIntOrNull()
                    if (dist != null && dist >= 100) {
                        selectedDistanceMeters = dist
                    }
                    showCustomDistanceDialog = false
                }) {
                    Text("OK")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCustomDistanceDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
