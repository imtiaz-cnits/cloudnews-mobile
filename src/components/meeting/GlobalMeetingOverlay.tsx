import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { LiveKitRoom } from '@livekit/react-native';
import { Room, RoomConnectOptions, DisconnectReason } from 'livekit-client';
import { useMeeting } from '../../context/MeetingContext';
import { initLiveKit, startAudioSession, stopAudioSession } from '../../services/livekit';
import { MeetingRoomContent } from '../../screens/MeetingRoomScreen';
import { FloatingPiPView } from './FloatingPiPView';
import { endMeeting as endMeetingApi, leaveMeeting as leaveMeetingApi } from '../../services/api';
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
  const activeMeetingKeyRef = useRef<string | null>(null);

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

  const videoPreset = useMemo(() => {
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
          maxBitrate: 8_000_000,
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

    // Default: 1080p Full HD (2.5 - 3.5 Mbps)
    return {
      capture: {
        width: 1920,
        height: 1080,
        frameRate: meetingSettings.frameRate,
      },
      encoding: {
        maxBitrate: 3_500_000,
        maxFramerate: meetingSettings.frameRate,
      },
    };
  }, [meetingSettings, activeMeeting?.isHost]);

  // Audio session and permission initialization per unique meeting session
  useEffect(() => {
    if (!activeMeeting) {
      activeMeetingKeyRef.current = null;
      setPermissionsChecked(false);
      stopAudioSession();
      return;
    }

    const sessionKey = `${activeMeeting.roomName}_${activeMeeting.token}`;
    if (activeMeetingKeyRef.current === sessionKey) {
      return;
    }
    activeMeetingKeyRef.current = sessionKey;

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

  // Handle transient errors gracefully without ejecting user
  const handleError = useCallback((e: Error) => {
    console.warn('[GlobalMeetingOverlay] LiveKit connection event (auto-recovering):', e.message);
  }, []);

  // Resilient disconnect handling: Only end meeting on explicit leave or room teardown
  const handleDisconnected = useCallback((reason?: DisconnectReason) => {
    console.log('[GlobalMeetingOverlay] Room disconnected event with reason:', reason);
    if (
      reason === DisconnectReason.CLIENT_INITIATED ||
      reason === DisconnectReason.ROOM_DELETED ||
      reason === DisconnectReason.ROOM_CLOSED ||
      reason === DisconnectReason.PARTICIPANT_REMOVED ||
      reason === DisconnectReason.USER_REJECTED
    ) {
      if (reason === DisconnectReason.PARTICIPANT_REMOVED && !activeMeeting?.isHost) {
        Alert.alert(
          'Removed from Meeting',
          'You have been removed from the meeting by the host.',
          [{ text: 'OK' }]
        );
      }
      endMeeting();
    } else {
      console.warn('[GlobalMeetingOverlay] Transient disconnect; keeping session intact for auto-reconnect:', reason);
    }
  }, [activeMeeting?.isHost, endMeeting]);

  // Memoized connection options to prevent re-triggering connect effects
  const connectOptions = useMemo<RoomConnectOptions>(() => ({
    autoSubscribe: true,
    peerConnectionTimeout: 30000,
    maxRetries: 10,
    websocketTimeout: 20000,
  }), []);

  // Stable single Room instance: strictly keyed to the unique meeting credentials
  const room = useMemo(() => {
    if (!activeMeeting?.token || !activeMeeting?.serverUrl) return undefined;
    initLiveKit();
    return new Room({
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
        backupCodec: { codec: 'vp8' },
        videoEncoding: videoPreset.encoding,
        screenShareEncoding: {
          maxBitrate: 4_000_000,
          maxFramerate: 30,
        },
        dtx: true,
        red: true,
      },
    });
    // Intentionally omit videoPreset from dependencies to avoid recreating the Room instance mid-call
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMeeting?.roomName, activeMeeting?.token]);

  // Clean room disconnection on session termination
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect().catch(() => {});
      }
    };
  }, [room]);

  const handleFloatingLeave = useCallback(async () => {
    if (activeMeeting?.isHost && activeMeeting.meetingCode) {
      try {
        await endMeetingApi(activeMeeting.meetingCode);
      } catch {}
    } else if (activeMeeting?.meetingCode) {
      try {
        await leaveMeetingApi(activeMeeting.meetingCode);
      } catch {}
    }
    endMeeting();
  }, [activeMeeting, endMeeting]);

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
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Primary Video Conference Room */}
      <LiveKitRoom
        serverUrl={activeMeeting.serverUrl}
        token={activeMeeting.token}
        connect={true}
        video={!activeMeeting.muteVideo && hasCameraPermission}
        audio={!activeMeeting.muteAudio && hasAudioPermission}
        connectOptions={connectOptions}
        room={room}
        onDisconnected={handleDisconnected}
        onError={handleError}
      >
        {/* Active In-App View */}
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
            onLeave={handleFloatingLeave}
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
