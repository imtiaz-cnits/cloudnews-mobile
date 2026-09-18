package com.cloudnews.mobile

import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.view.WindowManager

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)

    // Explicitly guarantee FLAG_SECURE is cleared so that Cloud News
    // app screens, controls, and menus are never blacked out during screen sharing.
    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
   * Called when the user presses Home button or leaves the app.
   * If user is in a meeting and screen share is NOT active, automatically enter Picture-in-Picture.
   * If screen share IS active, do NOT enter PiP so user can present other apps.
   */
  override fun onUserLeaveHint() {
      super.onUserLeaveHint()
      if (PictureInPictureModule.canEnterPip()) {
          PictureInPictureModule.enterPipMode(this)
      }
  }

  /**
   * Notify JS/React Native when Picture-in-Picture mode is entered or exited.
   */
  override fun onPictureInPictureModeChanged(
      isInPictureInPictureMode: Boolean,
      newConfig: Configuration
  ) {
      super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
      PictureInPictureModule.notifyPipModeChanged(isInPictureInPictureMode)
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * If meeting is active without screen share, enter PiP instead of closing.
    */
  override fun invokeDefaultOnBackPressed() {
      if (PictureInPictureModule.canEnterPip()) {
          val entered = PictureInPictureModule.enterPipMode(this)
          if (entered) return
      }

      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }

  override fun onDestroy() {
      try {
          MeetingForegroundService.stopService(this)
      } catch (e: Exception) {
          e.printStackTrace()
      }
      super.onDestroy()
  }
}
