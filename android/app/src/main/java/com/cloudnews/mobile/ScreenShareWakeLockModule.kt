package com.cloudnews.mobile

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
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

            // Automatically request battery optimization exemption (vital for MIUI 12 and Huawei to keep screen capture running)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && powerManager != null) {
                val packageName = reactApplicationContext.packageName
                if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
                    val activity = currentActivity
                    if (activity != null) {
                        try {
                            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                data = Uri.parse("package:$packageName")
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            activity.startActivity(intent)
                        } catch (intentErr: Exception) {
                            intentErr.printStackTrace()
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                if (!Settings.canDrawOverlays(reactApplicationContext)) {
                    val activity = currentActivity
                    if (activity != null) {
                        val intent = Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:${reactApplicationContext.packageName}")
                        ).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        activity.startActivity(intent)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
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

        // Explicitly terminate MediaProjectionService and dismiss screen sharing notifications
        try {
            MeetingForegroundService.stopMediaProjectionService(reactApplicationContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopScreenShare() {
        releaseWakeLock()
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
