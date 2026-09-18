import { AudioSession, registerGlobals } from '@livekit/react-native';
import { Room, RoomOptions, RoomConnectOptions } from 'livekit-client';

let isGlobalsRegistered = false;

/**
 * Register LiveKit WebRTC globals. Must be called before connecting to a room.
 */
export function initLiveKit() {
  if (!isGlobalsRegistered) {
    try {
      registerGlobals();
      isGlobalsRegistered = true;
    } catch (err) {
      console.warn('Failed to register LiveKit globals:', err);
    }
  }
}

/**
 * Optimized LiveKit Room configuration for Mainland China <-> Hong Kong route.
 * Enforces Dynacast (bandwidth saving), Adaptive Stream (viewport matching),
 * and Opus RED (packet-loss resilience).
 */
export const DEFAULT_ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  audioCaptureDefaults: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  publishDefaults: {
    videoCodec: 'h264',
    dtx: true,
    red: true,
    screenShareEncoding: {
      maxBitrate: 6_000_000,
      maxFramerate: 30,
    },
  },
};

export const DEFAULT_CONNECT_OPTIONS: RoomConnectOptions = {
  autoSubscribe: true,
  peerConnectionTimeout: 60000,
};

/**
 * Helper to create an optimized LiveKit Room instance.
 */
export function createOptimizedRoom(customOptions?: Partial<RoomOptions>): Room {
  initLiveKit();
  return new Room({
    ...DEFAULT_ROOM_OPTIONS,
    ...customOptions,
  });
}

/**
 * Configure audio session for voice communication.
 * Sets communication mode and voice focus so audio & microphone remain active
 * both in foreground and background (e.g. during screen share or when minimized).
 */
export async function startAudioSession() {
  try {
    await AudioSession.configureAudio({
      android: {
        preferredOutputList: ['speaker', 'earpiece', 'headset', 'bluetooth'],
        audioTypeOptions: {
          manageAudioFocus: true,
          audioMode: 'inCommunication',
          audioFocusMode: 'gain',
          audioAttributesUsageType: 'voiceCommunication',
          audioAttributesContentType: 'speech',
        },
      },
      ios: {
        defaultOutput: 'speaker',
      },
    });
    await AudioSession.startAudioSession();
  } catch (err) {
    console.warn('Could not start AudioSession:', err);
  }
}

/**
 * Stop active audio session on room leave.
 */
export async function stopAudioSession() {
  try {
    await AudioSession.stopAudioSession();
  } catch (err) {
    console.warn('Could not stop AudioSession:', err);
  }
}

export default {
  initLiveKit,
  DEFAULT_ROOM_OPTIONS,
  DEFAULT_CONNECT_OPTIONS,
  createOptimizedRoom,
  startAudioSession,
  stopAudioSession,
};

