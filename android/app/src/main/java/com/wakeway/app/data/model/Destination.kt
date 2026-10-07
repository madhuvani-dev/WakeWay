package com.wakeway.app.data.model


/**
 * Represents a geographical destination chosen by the user.
 */
data class Destination(
    val id: String = "",
    val name: String,
    val address: String = "",
    val latitude: Double,
    val longitude: Double,
    val category: String = "",
    val imageUrl: String = "",
    val description: String = ""
) {
    val placeId: String
        get() = if (id.isNotBlank()) id else "place_${name.lowercase().replace(Regex("[^a-z0-9]"), "_")}"
}
