package com.wakeway.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.wakeway.app.data.model.Destination
import com.wakeway.app.data.model.FavouritePlace
import com.wakeway.app.data.model.HistoryEntry
import org.json.JSONArray
import org.json.JSONObject

/**
 * Repository for managing and persisting Favourite Places and Travel History
 * using the application's existing SharedPreferences persistence architecture.
 */
class PlaceRepository(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREFS_NAME = "wakeway_places_store"
        private const val KEY_FAVOURITES = "key_favourites_json"
        private const val KEY_HISTORY = "key_history_json"
        private const val KEY_CUSTOM_PLACES = "key_custom_places_json"
    }

    /**
     * Built-in curated catalog of transport hubs.
     */
    val defaultPlaces: List<Destination> = listOf(
        Destination(
            id = "dest-secunderabad",
            name = "Secunderabad Junction Railway Station",
            address = "Station Road, Secunderabad, Telangana, India",
            latitude = 17.4344,
            longitude = 78.5015,
            category = "Major Railway Junction",
            imageUrl = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
            description = "Major South Central Railway hub connecting northern and southern Indian passenger express corridors."
        ),
        Destination(
            id = "dest-grand-central",
            name = "Grand Central Terminal",
            address = "89 E 42nd St, New York, NY 10017, USA",
            latitude = 40.7527,
            longitude = -73.9772,
            category = "Historic Transit Terminal",
            imageUrl = "https://images.unsplash.com/photo-1556983852-43bf21186b2a?w=800&auto=format&fit=crop&q=80",
            description = "Iconic Beaux-Arts architectural landmark and high-frequency commuter rail hub in Midtown Manhattan."
        ),
        Destination(
            id = "dest-kings-cross",
            name = "London King’s Cross Station",
            address = "Euston Rd, London N1 9AL, United Kingdom",
            latitude = 51.5308,
            longitude = -0.1238,
            category = "Intercity Passenger Terminal",
            imageUrl = "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80",
            description = "Central London rail terminus connecting the East Coast Main Line to Scotland and northern England."
        ),
        Destination(
            id = "dest-tokyo-station",
            name = "Tokyo Station",
            address = "1 Chome Marunouchi, Chiyoda City, Tokyo, Japan",
            latitude = 35.6812,
            longitude = 139.7671,
            category = "Shinkansen Bullet Train Hub",
            imageUrl = "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80",
            description = "The historic red-brick central rail terminal serving all high-speed Shinkansen lines and urban transit."
        )
    )

    // =========================================================================
    // FAVOURITES MANAGEMENT
    // =========================================================================

    fun getFavourites(): List<FavouritePlace> {
        val jsonString = prefs.getString(KEY_FAVOURITES, null) ?: return emptyList()
        val list = mutableListOf<FavouritePlace>()
        try {
            val array = JSONArray(jsonString)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(
                    FavouritePlace(
                        placeId = obj.getString("placeId"),
                        savedAt = obj.optLong("savedAt", System.currentTimeMillis())
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    fun isFavourite(placeId: String): Boolean {
        return getFavourites().any { it.placeId == placeId }
    }

    fun toggleFavourite(destination: Destination): Boolean {
        cachePlace(destination)
        val current = getFavourites().toMutableList()
        val exists = current.any { it.placeId == destination.placeId }
        val newState = if (exists) {
            current.removeAll { it.placeId == destination.placeId }
            false
        } else {
            current.add(0, FavouritePlace(placeId = destination.placeId))
            true
        }
        saveFavourites(current)
        return newState
    }

    fun removeFavourite(placeId: String) {
        val current = getFavourites().toMutableList()
        current.removeAll { it.placeId == placeId }
        saveFavourites(current)
    }

    private fun saveFavourites(list: List<FavouritePlace>) {
        val array = JSONArray()
        list.forEach {
            val obj = JSONObject()
            obj.put("placeId", it.placeId)
            obj.put("savedAt", it.savedAt)
            array.put(obj)
        }
        prefs.edit().putString(KEY_FAVOURITES, array.toString()).apply()
    }

    // =========================================================================
    // TRAVEL HISTORY MANAGEMENT (Sorted most recently explored first, no duplicates)
    // =========================================================================

    fun getHistory(): List<HistoryEntry> {
        val jsonString = prefs.getString(KEY_HISTORY, null) ?: return emptyList()
        val list = mutableListOf<HistoryEntry>()
        try {
            val array = JSONArray(jsonString)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(
                    HistoryEntry(
                        placeId = obj.getString("placeId"),
                        lastExploredAt = obj.getLong("lastExploredAt")
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list.sortedByDescending { it.lastExploredAt }
    }

    /**
     * Records a place in Travel History when meaningfully explored.
     * Moves existing entry to the top with updated timestamp to prevent duplicates.
     */
    fun recordExplored(destination: Destination) {
        cachePlace(destination)
        val current = getHistory().toMutableList()
        current.removeAll { it.placeId == destination.placeId }
        current.add(0, HistoryEntry(placeId = destination.placeId, lastExploredAt = System.currentTimeMillis()))
        saveHistory(current)
    }

    fun clearHistory() {
        prefs.edit().remove(KEY_HISTORY).apply()
    }

    private fun saveHistory(list: List<HistoryEntry>) {
        val array = JSONArray()
        list.forEach {
            val obj = JSONObject()
            obj.put("placeId", it.placeId)
            obj.put("lastExploredAt", it.lastExploredAt)
            array.put(obj)
        }
        prefs.edit().putString(KEY_HISTORY, array.toString()).apply()
    }

    // =========================================================================
    // PLACE CACHING & LOOKUP
    // =========================================================================

    fun findPlaceById(placeId: String): Destination? {
        val defaultMatch = defaultPlaces.find { it.placeId == placeId || it.id == placeId }
        if (defaultMatch != null) return defaultMatch

        val cachedJson = prefs.getString(KEY_CUSTOM_PLACES, null) ?: return null
        return try {
            val obj = JSONObject(cachedJson)
            if (obj.has(placeId)) {
                val p = obj.getJSONObject(placeId)
                Destination(
                    id = p.optString("id", placeId),
                    name = p.getString("name"),
                    address = p.optString("address", ""),
                    latitude = p.getDouble("latitude"),
                    longitude = p.getDouble("longitude"),
                    category = p.optString("category", ""),
                    imageUrl = p.optString("imageUrl", ""),
                    description = p.optString("description", "")
                )
            } else null
        } catch (e: Exception) {
            null
        }
    }

    private fun cachePlace(destination: Destination) {
        try {
            val currentMap = JSONObject(prefs.getString(KEY_CUSTOM_PLACES, "{}") ?: "{}")
            val pObj = JSONObject().apply {
                put("id", destination.id)
                put("name", destination.name)
                put("address", destination.address)
                put("latitude", destination.latitude)
                put("longitude", destination.longitude)
                put("category", destination.category)
                put("imageUrl", destination.imageUrl)
                put("description", destination.description)
            }
            currentMap.put(destination.placeId, pObj)
            prefs.edit().putString(KEY_CUSTOM_PLACES, currentMap.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
