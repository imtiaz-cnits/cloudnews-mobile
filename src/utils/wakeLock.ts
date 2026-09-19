import { NativeModules, Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const SCREEN_SHARE_TAG = 'cloudnews-screen-share';

/**
 * Keeps the device screen awake and active during screen sharing.
 * Combines window-level keep-awake with native PowerManager WakeLock
 * to ensure the screen never sleeps or dims, even if Cloud News is
 * minimized while presenting another app (slides, browser, PDF, etc.).
 */
export async function acquireScreenShareWakeLock(): Promise<void> {
  try {
    // 1. Expo Keep Awake (handles Activity Window FLAG_KEEP_SCREEN_ON)
    await activateKeepAwakeAsync(SCREEN_SHARE_TAG);
  } catch (err) {
    console.warn('[WakeLock] Expo activateKeepAwakeAsync failed:', err);
  }

  // 2. Native Android PowerManager WakeLock (keeps screen on across entire OS)
  if (Platform.OS === 'android' && NativeModules.ScreenShareWakeLock) {
    try {
      NativeModules.ScreenShareWakeLock.acquireWakeLock();
    } catch (err) {
      console.warn('[WakeLock] Native acquireWakeLock failed:', err);
    }
  }
}

/**
 * Releases the wake lock when screen sharing ends, restoring normal
 * system screen timeout behavior.
 */
export async function releaseScreenShareWakeLock(): Promise<void> {
  try {
    // 1. Expo Keep Awake release
    await deactivateKeepAwake(SCREEN_SHARE_TAG);
  } catch (err) {
    console.warn('[WakeLock] Expo deactivateKeepAwake failed:', err);
  }

  // 2. Native Android PowerManager WakeLock release & MediaProjection notification cleanup
  if (Platform.OS === 'android' && NativeModules.ScreenShareWakeLock) {
    try {
      if (typeof NativeModules.ScreenShareWakeLock.stopScreenShare === 'function') {
        NativeModules.ScreenShareWakeLock.stopScreenShare();
      } else {
        NativeModules.ScreenShareWakeLock.releaseWakeLock();
      }
    } catch (err) {
      console.warn('[WakeLock] Native releaseWakeLock failed:', err);
    }
  }
}

/**
 * Starts the native Android Foreground Service with continuous microphone & audio
 * persistence and Partial WakeLock to guarantee the OS does NOT kill the app process
 * when minimized (e.g. during meeting or screen sharing).
 */
export function startMeetingForegroundService(title?: string, subtitle?: string): void {
  if (Platform.OS === 'android') {
    const meetingTitle = title || '云讯会议 / CloudNews Meeting';
    const meetingSubtitle = subtitle || '通话中 · 麦克风与音频已保持开启 / Meeting active · Mic & audio running';

    try {
      if (NativeModules.MeetingForegroundService?.start) {
        NativeModules.MeetingForegroundService.start(meetingTitle, meetingSubtitle);
      } else if (NativeModules.ScreenShareWakeLock?.startMeetingForeground) {
        NativeModules.ScreenShareWakeLock.startMeetingForeground(meetingTitle, meetingSubtitle);
      }
    } catch (err) {
      console.warn('[ForegroundService] startMeetingForegroundService error:', err);
    }
  }
}

/**
 * Stops the native Android Foreground Service when the meeting ends or the user leaves.
 */
export function stopMeetingForegroundService(): void {
  if (Platform.OS === 'android') {
    try {
      if (NativeModules.MeetingForegroundService?.stop) {
        NativeModules.MeetingForegroundService.stop();
      } else if (NativeModules.ScreenShareWakeLock?.stopMeetingForeground) {
        NativeModules.ScreenShareWakeLock.stopMeetingForeground();
      }
    } catch (err) {
      console.warn('[ForegroundService] stopMeetingForegroundService error:', err);
    }
  }
}

/**
 * Triggers system overlay permission prompt if needed on Android (MIUI / Huawei).
 */
export function requestOverlayPermission(): void {
  if (Platform.OS === 'android' && NativeModules.ScreenShareWakeLock?.requestOverlayPermission) {
    try {
      NativeModules.ScreenShareWakeLock.requestOverlayPermission();
    } catch (err) {
      console.warn('[WakeLock] requestOverlayPermission error:', err);
    }
  }
}

