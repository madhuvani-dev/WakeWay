package com.wakeway.app.data.model

sealed interface JourneyState {
    data object Idle : JourneyState

    data class Active(
        val destination: Destination,
        val alertDistanceMeters: Int,
        val currentDistanceMeters: Float? = null,
        val lastUpdatedTimestamp: Long = System.currentTimeMillis()
    ) : JourneyState

    data class Triggered(
        val destination: Destination,
        val alertDistanceMeters: Int,
        val currentDistanceMeters: Float
    ) : JourneyState

    data class Completed(
        val destination: Destination
    ) : JourneyState

    data object Cancelled : JourneyState
}
