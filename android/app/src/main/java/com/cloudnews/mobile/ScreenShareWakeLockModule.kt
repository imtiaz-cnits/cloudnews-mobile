package com.cloudnews.mobile

import android.content.Context
import android.os.PowerManager
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ScreenShareWakeLockModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var wakeLock: PowerManager.WakeLock? = null

    override fun getName(): String = "ScreenShareWakeLock"

    @ReactMethod
    fun acquireWakeLock() {
        currentActivity?.runOnUiThread {
            currentActivity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        try {
            val powerManager = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (wakeLock == null && powerManager != null) {
                @Suppress("DEPRECATION")
                wakeLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                    "CloudNews:ScreenShareWakeLock"
                )
                wakeLock?.setReferenceCounted(false)
            }
            if (wakeLock?.isHeld != true) {
                wakeLock?.acquire(4 * 60 * 60 * 1000L) // 4 hours safe maximum duration
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun releaseWakeLock() {
        currentActivity?.runOnUiThread {
            currentActivity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun startMeetingForeground(title: String?, subtitle: String?) {
        MeetingForegroundService.startService(reactApplicationContext, title, subtitle)
    }

    @ReactMethod
    fun stopMeetingForeground() {
        MeetingForegroundService.stopService(reactApplicationContext)
    }
}
