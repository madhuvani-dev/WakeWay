package com.wakeway.app.service

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log

/**
 * Handles playing the alarm sound reliably with USAGE_ALARM attributes.
 * Supports custom URIs selected via Storage Access Framework with safe fallback.
 */
class AlarmAudioPlayer(private val context: Context) {

    private var mediaPlayer: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var previewStopRunnable: Runnable? = null

    companion object {
        private const val TAG = "AlarmAudioPlayer"
    }

    /**
     * Starts continuous looping alarm sound.
     */
    fun startAlarm(customUri: Uri?) {
        stop()
        mediaPlayer = createAndPreparePlayer(customUri, isLooping = true)
        try {
            mediaPlayer?.start()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start alarm sound", e)
            playSystemFallbackAlarm(isLooping = true)
        }
    }

    /**
     * Plays a preview of the sound for 6 seconds.
     */
    fun playPreview(customUri: Uri?, onCompletion: () -> Unit) {
        stop()
        mediaPlayer = createAndPreparePlayer(customUri, isLooping = false)
        try {
            mediaPlayer?.setOnCompletionListener {
                stop()
                onCompletion()
            }
            mediaPlayer?.start()

            previewStopRunnable = Runnable {
                stop()
                onCompletion()
            }
            handler.postDelayed(previewStopRunnable!!, 6000)
        } catch (e: Exception) {
            Log.e(TAG, "Preview playback failed", e)
            onCompletion()
        }
    }

    fun isPlaying(): Boolean {
        return mediaPlayer?.isPlaying == true
    }

    fun stop() {
        previewStopRunnable?.let { handler.removeCallbacks(it) }
        previewStopRunnable = null

        try {
            mediaPlayer?.let { player ->
                if (player.isPlaying) {
                    player.stop()
                }
                player.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping media player", e)
        } finally {
            mediaPlayer = null
        }
    }

    private fun createAndPreparePlayer(uri: Uri?, isLooping: Boolean): MediaPlayer? {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setLegacyStreamType(AudioManager.STREAM_ALARM)
            .build()

        if (uri != null) {
            try {
                return MediaPlayer().apply {
                    setAudioAttributes(audioAttributes)
                    setDataSource(context, uri)
                    this.isLooping = isLooping
                    prepare()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Custom URI unavailable or unreadable. Falling back to default system alarm.", e)
            }
        }

        // Fallback: System alarm sound
        return try {
            val defaultAlarmUri = Settings.System.DEFAULT_ALARM_ALERT_URI
                ?: Settings.System.DEFAULT_RINGTONE_URI
            MediaPlayer().apply {
                setAudioAttributes(audioAttributes)
                setDataSource(context, defaultAlarmUri)
                this.isLooping = isLooping
                prepare()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Could not initialize default system alarm sound", e)
            null
        }
    }

    private fun playSystemFallbackAlarm(isLooping: Boolean) {
        try {
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(audioAttributes)
                setDataSource(context, Settings.System.DEFAULT_ALARM_ALERT_URI)
                this.isLooping = isLooping
                prepare()
                start()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Fallback player failed", e)
        }
    }
}
