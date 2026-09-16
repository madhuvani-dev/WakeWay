package com.wakeway.app.service

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

/**
 * Manages vibration pulses during destination alert.
 */
class VibrationController(context: Context) {

    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        vibratorManager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    private val pattern = longArrayOf(0, 500, 300, 500, 700)
    private val amplitudes = intArrayOf(0, 255, 0, 255, 0)

    fun startVibration() {
        try {
            if (vibrator?.hasVibrator() == true) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val effect = VibrationEffect.createWaveform(pattern, amplitudes, 0)
                    vibrator.vibrate(effect)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(pattern, 0)
                }
            }
        } catch (e: Exception) {
            Log.e("VibrationController", "Failed to start vibration", e)
        }
    }

    fun stopVibration() {
        try {
            vibrator?.cancel()
        } catch (e: Exception) {
            Log.e("VibrationController", "Failed to cancel vibration", e)
        }
    }
}
