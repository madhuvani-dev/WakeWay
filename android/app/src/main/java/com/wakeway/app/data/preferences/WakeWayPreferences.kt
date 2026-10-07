package com.wakeway.app.data.preferences

import android.content.Context
import android.content.SharedPreferences
import android.net.Uri

/**
 * Manages user preferences such as alarm sound, vibration, and default alert distance.
 */
class WakeWayPreferences(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREFS_NAME = "wakeway_prefs"
        private const val KEY_ALARM_URI = "key_alarm_uri"
        private const val KEY_ALARM_NAME = "key_alarm_name"
        private const val KEY_VIBRATION = "key_vibration"
        private const val KEY_DEFAULT_DISTANCE = "key_default_distance"

        const val DEFAULT_DISTANCE_METERS = 1000 // 1 km
        const val DEFAULT_SOUND_NAME = "WakeWay Pulse (Default)"
    }

    var customAlarmUri: Uri?
        get() {
            val uriString = prefs.getString(KEY_ALARM_URI, null)
            return if (uriString != null) Uri.parse(uriString) else null
        }
        set(value) {
            prefs.edit().putString(KEY_ALARM_URI, value?.toString()).apply()
        }

    var alarmSoundName: String
        get() = prefs.getString(KEY_ALARM_NAME, DEFAULT_SOUND_NAME) ?: DEFAULT_SOUND_NAME
        set(value) {
            prefs.edit().putString(KEY_ALARM_NAME, value).apply()
        }

    var isVibrationEnabled: Boolean
        get() = prefs.getBoolean(KEY_VIBRATION, true)
        set(value) {
            prefs.edit().putBoolean(KEY_VIBRATION, value).apply()
        }

    var defaultAlertDistanceMeters: Int
        get() = prefs.getInt(KEY_DEFAULT_DISTANCE, DEFAULT_DISTANCE_METERS)
        set(value) {
            prefs.edit().putInt(KEY_DEFAULT_DISTANCE, value).apply()
        }

    fun resetToDefaultSound() {
        prefs.edit()
            .remove(KEY_ALARM_URI)
            .putString(KEY_ALARM_NAME, DEFAULT_SOUND_NAME)
            .apply()
    }
}
