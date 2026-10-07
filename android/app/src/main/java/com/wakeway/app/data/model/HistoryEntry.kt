package com.wakeway.app.data.model

/**
 * Persisted record of a place meaningfully explored by the user.
 * Stores placeId reference and timestamp of latest exploration.
 */
data class HistoryEntry(
    val placeId: String,
    val lastExploredAt: Long = System.currentTimeMillis()
)
