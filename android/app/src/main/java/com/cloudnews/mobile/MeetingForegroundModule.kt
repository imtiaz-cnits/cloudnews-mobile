package com.cloudnews.mobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MeetingForegroundModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "MeetingForegroundService"

    @ReactMethod
    fun start(title: String?, subtitle: String?) {
        MeetingForegroundService.startService(reactApplicationContext, title, subtitle)
    }

    @ReactMethod
    fun stop() {
        MeetingForegroundService.stopService(reactApplicationContext)
    }
}
