import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { LiveKitRoom } from '@livekit/react-native';
import { useMeeting } from '../../context/MeetingContext';
import { initLiveKit, startAudioSession, stopAudioSession } from '../../services/livekit';
import { MeetingRoomContent } from '../../screens/MeetingRoomScreen';
import { FloatingPiPView } from './FloatingPiPView';
import storage, { StorageKeys, MeetingSettings, DEFAULT_MEETING_SETTINGS } from '../../services/storage';

// Ensure LiveKit WebRTC globals are ready
initLiveKit();

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];

      if (Platform.Version >= 33) {
        // @ts-ignore
        permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      await PermissionsAndroid.requestMultiple(permissions);

      const cameraGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      const audioGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

      return cameraGranted && audioGranted;
    } catch (err) {
      console.warn('[GlobalMeetingOverlay] Error requesting permissions:', err);
      return false;
    }
  }
  return true;
}

export const GlobalMeetingOverlay: React.FC = () => {
  const {
    activeMeeting,
    isMinimized,
    minimizeMeeting,
    maximizeMeeting,
    endMeeting,
  } = useMeeting();

  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [hasAudioPermission, setHasAudioPermission] = useState(true);
  const [meetingSettings, setMeetingSettings] = useState<MeetingSettings>(DEFAULT_MEETING_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.getItem(StorageKeys.MEETING_SETTINGS);
        if (stored) {
          const parsed = JSON.parse(stored);
          setMeetingSettings({ ...DEFAULT_MEETING_SETTINGS, ...parsed });
        }
      } catch (err) {
        console.warn('[GlobalMeetingOverlay] Error reading meeting settings:', err);
      }
    })();
  }, [activeMeeting]);

  const videoPreset = React.useMemo(() => {
    const is4K = meetingSettings.videoQuality === '4k' && Boolean(activeMeeting?.isHost);
    const is720p = meetingSettings.videoQuality === '720p';

    if (is4K) {
      return {
        capture: {
          width: 3840,
          height: 2160,
          frameRate: meetingSettings.frameRate,
        },
        encoding: {
          maxBitrate: 12_000_000,
          maxFramerate: meetingSettings.frameRate,
        },
      };
    }

    if (is720p) {
      return {
        capture: {
          width: 1280,
          height: 720,
          frameRate: meetingSettings.frameRate,
        },
        encoding: {
          maxBitrate: 1_800_000,
          maxFramerate: meetingSettings.frameRate,
        },
      };
    }

    // Default: 1080p Full HD (3.5 - 4.5 Mbps)
    return {
      capture: {
        width: 1920,
        height: 1080,
        frameRate: meetingSettings.frameRate,
      },
      encoding: {
        maxBitrate: 4_000_000,
        maxFramerate: meetingSettings.frameRate,
      },
    };
  }, [meetingSettings, activeMeeting?.isHost]);

  useEffect(() => {
    if (!activeMeeting) {
      setPermissionsChecked(false);
      stopAudioSession();
      return;
    }

    startAudioSession();

    (async () => {
      try {
        const granted = await requestPermissions();
        if (Platform.OS === 'android') {
          const cam = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
          const aud = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
          setHasCameraPermission(cam);
          setHasAudioPermission(aud);
        }
      } catch (err) {
        console.warn('[GlobalMeetingOverlay] Error checking permissions:', err);
      } finally {
        setPermissionsChecked(true);
      }
    })();

    return () => {
      stopAudioSession();
    };
  }, [activeMeeting]);

  const handleError = useCallback((e: Error) => {
    console.error('[GlobalMeetingOverlay] LiveKit Connection error:', e.message);
    if (e.message.includes('negotiation')) {
      Alert.alert(
        'Network Latency',
        'Negotiation failed. This is likely a firewall or bandwidth issue. Check your connection.',
        [{ text: 'Retry', onPress: () => endMeeting() }]
      );
    } else {
      Alert.alert('Meeting Error', e.message, [{ text: 'OK', onPress: () => endMeeting() }]);
    }
  }, [endMeeting]);

  if (!activeMeeting || !activeMeeting.token || !activeMeeting.serverUrl) {
    return null;
  }

  if (!permissionsChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A8FF" />
      </View>
    );
  }

  const shouldEnableAudio = hasAudioPermission && !activeMeeting.muteAudio;
  const shouldEnableVideo = hasCameraPermission && !activeMeeting.muteVideo;

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents={isMinimized ? 'box-none' : 'auto'}
    >
      <LiveKitRoom
        serverUrl={activeMeeting.serverUrl}
        token={activeMeeting.token}
        connect={true}
        audio={shouldEnableAudio}
        video={shouldEnableVideo}
        onDisconnected={endMeeting}
        onError={handleError}
        connectOptions={{
          autoSubscribe: true,
          peerConnectionTimeout: 60000,
        }}
        options={{
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          videoCaptureDefaults: {
            resolution: videoPreset.capture,
          },
          publishDefaults: {
            videoCodec: 'h264',
            videoEncoding: videoPreset.encoding,
            screenShareEncoding: {
              maxBitrate: 6_000_000,
              maxFramerate: 30,
            },
            dtx: true,
            red: true,
          },
        }}
      >
        {/* Full-Screen Meeting Content (persists mounted to keep connection & state active) */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              display: isMinimized ? 'none' : 'flex',
              zIndex: isMinimized ? 0 : 9999,
              backgroundColor: '#050B14',
            },
          ]}
          pointerEvents={isMinimized ? 'none' : 'auto'}
        >
          <MeetingRoomContent
            roomName={activeMeeting.roomName}
            meetingCode={activeMeeting.meetingCode}
            meetingTitle={activeMeeting.meetingTitle}
            isHostParam={activeMeeting.isHost}
            isGuest={activeMeeting.isGuest}
            onLeave={endMeeting}
            onMinimize={minimizeMeeting}
            isMinimized={isMinimized}
            muteAudioParam={activeMeeting.muteAudio}
            muteVideoParam={activeMeeting.muteVideo}
            hasAudioPermission={hasAudioPermission}
            hasCameraPermission={hasCameraPermission}
          />
        </View>

        {/* Floating PiP View when minimized */}
        {isMinimized && (
          <FloatingPiPView
            roomName={activeMeeting.roomName}
            meetingTitle={activeMeeting.meetingTitle}
            onMaximize={maximizeMeeting}
            onLeave={endMeeting}
          />
        )}
      </LiveKitRoom>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050B14',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
});

export default GlobalMeetingOverlay;
