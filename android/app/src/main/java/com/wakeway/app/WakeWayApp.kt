package com.wakeway.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings

class WakeWayApp : Application() {

    companion object {
        const val CHANNEL_ID_JOURNEY = "wakeway_journey_channel"
        const val CHANNEL_ID_ALARM = "wakeway_alarm_channel"
        const val NOTIFICATION_ID_JOURNEY = 1001
        const val NOTIFICATION_ID_ALARM = 1002
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // 1. Ongoing Journey Monitoring Channel (Quiet, non-intrusive)
            val journeyChannel = NotificationChannel(
                CHANNEL_ID_JOURNEY,
                getString(R.string.channel_journey_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.channel_journey_desc)
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }

            // 2. High-Priority Alarm Channel (Wakes user when approaching destination)
            val alarmChannel = NotificationChannel(
                CHANNEL_ID_ALARM,
                getString(R.string.channel_alarm_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.channel_alarm_desc)
                setShowBadge(true)
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build()
                setSound(Settings.System.DEFAULT_ALARM_ALERT_URI, audioAttributes)
            }

            notificationManager.createNotificationChannel(journeyChannel)
            notificationManager.createNotificationChannel(alarmChannel)
        }
    }
}
