package com.wakeway.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakeway.app.data.model.Destination
import com.wakeway.app.ui.theme.DeepTeal
import com.wakeway.app.ui.theme.MutedSlate
import com.wakeway.app.ui.theme.SoftSage
import com.wakeway.app.ui.theme.Terracotta
import com.wakeway.app.ui.theme.WarmIvory
import com.wakeway.app.ui.theme.WarmIvoryBorder
import com.wakeway.app.util.DistanceCalculator
import kotlin.math.roundToInt

@Composable
fun JourneyScreen(
    destination: Destination,
    alertDistanceMeters: Int,
    currentDistanceMeters: Float?,
    currentSpeedKmh: Float? = null,
    onCancelJourney: () -> Unit
) {
    var showCancelConfirmDialog by remember { mutableStateOf(false) }

    val speedDisplay = if (currentSpeedKmh != null && currentSpeedKmh >= 0f) {
        "${currentSpeedKmh.roundToInt()} km/h"
    } else {
        "0 km/h"
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = WarmIvory
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // 1. Destination Section
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 8.dp)
            ) {
                Text(
                    text = "ON THE WAY",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                    color = MutedSlate
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = Terracotta,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = destination.name,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = DeepTeal,
                        textAlign = TextAlign.Center
                    )
                }
                if (destination.address.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = destination.address,
                        fontSize = 12.sp,
                        color = MutedSlate,
                        maxLines = 1
                    )
                }
            }

            // Central HUD: Distance -> Route -> Alert Distance
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // 2. Remaining Distance
                Text(
                    text = DistanceCalculator.formatDistance(currentDistanceMeters),
                    fontSize = 54.sp,
                    fontWeight = FontWeight.Bold,
                    color = DeepTeal,
                    letterSpacing = (-1).sp
                )
                Text(
                    text = "remaining",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MutedSlate,
                    letterSpacing = 1.sp
                )

                Spacer(modifier = Modifier.height(18.dp))

                // Subtle Route Line
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(SoftSage)
                        )
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(2.dp)
                                .background(SoftSage.copy(alpha = 0.5f))
                        )
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(CircleShape)
                                .background(Terracotta)
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "You",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = MutedSlate
                        )
                        Text(
                            text = "Destination",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = DeepTeal
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Real-time Travel Speed
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "SPEED",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp,
                        color = MutedSlate
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = speedDisplay,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = DeepTeal
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Alert Distance
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, WarmIvoryBorder),
                    modifier = Modifier.padding(horizontal = 16.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.NotificationsActive,
                            contentDescription = null,
                            tint = Terracotta,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Wake me at ${DistanceCalculator.formatDistance(alertDistanceMeters.toFloat())}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = DeepTeal
                        )
                    }
                }
            }

            // 5. Bottom Action: End Journey
            OutlinedButton(
                onClick = { showCancelConfirmDialog = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, WarmIvoryBorder),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = Color.White,
                    contentColor = DeepTeal
                )
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = null,
                    tint = MutedSlate,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "END JOURNEY",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }
        }
    }

    // Cancel Confirmation Dialog
    if (showCancelConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showCancelConfirmDialog = false },
            title = { Text("End Journey?") },
            text = { Text("Location monitoring will stop and no wake alarm will sound.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showCancelConfirmDialog = false
                        onCancelJourney()
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Yes, End")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelConfirmDialog = false }) {
                    Text("Keep Monitoring")
                }
            }
        )
    }
}
