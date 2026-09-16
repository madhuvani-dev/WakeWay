package com.wakeway.app.util

import android.location.Location
import java.util.Locale
import kotlin.math.*

object DistanceCalculator {

    private const val EARTH_RADIUS_METERS = 6371000.0

    /**
     * Calculates the great-circle distance between two points using the Haversine formula.
     * Compatible with Android without needing GMS services initialized.
     */
    fun calculateDistanceMeters(
        startLat: Double,
        startLng: Double,
        endLat: Double,
        endLng: Double
    ): Float {
        val results = FloatArray(1)
        Location.distanceBetween(startLat, startLng, endLat, endLng, results)
        if (results[0] > 0) {
            return results[0]
        }

        // Fallback to pure Haversine formula
        val dLat = Math.toRadians(endLat - startLat)
        val dLon = Math.toRadians(endLng - startLng)
        val a = sin(dLat / 2).pow(2) +
                cos(Math.toRadians(startLat)) * cos(Math.toRadians(endLat)) *
                sin(dLon / 2).pow(2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return (EARTH_RADIUS_METERS * c).toFloat()
    }

    /**
     * Human-friendly distance formatting:
     * - Under 1 km: "450 m"
     * - 1 km and above: "2.4 km"
     */
    fun formatDistance(meters: Float?): String {
        if (meters == null || meters < 0) return "--"
        return if (meters < 1000f) {
            "${meters.roundToInt()} m"
        } else {
            String.format(Locale.getDefault(), "%.1f km", meters / 1000f)
        }
    }
}
