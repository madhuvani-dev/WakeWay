package com.wakeway.app.data.model

/**
 * Persisted record of a user's saved favourite place.
 * Stores placeId reference and timestamp without duplicating entity models.
 */
data class FavouritePlace(
    val placeId: String,
    val savedAt: Long = System.currentTimeMillis()
)
