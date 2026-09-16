package com.wakeway.app.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val TravelColorScheme = lightColorScheme(
    primary = Terracotta,
    onPrimary = Color.White,
    primaryContainer = WarmOchreMuted,
    onPrimaryContainer = DeepTeal,
    surface = WarmIvory,
    onSurface = DeepTeal,
    surfaceVariant = WarmIvoryCard,
    onSurfaceVariant = MutedSlate,
    background = WarmIvory,
    onBackground = DeepTeal,
    outline = WarmIvoryBorder
)

@Composable
fun WakeWayTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = TravelColorScheme,
        typography = Typography,
        content = content
    )
}
