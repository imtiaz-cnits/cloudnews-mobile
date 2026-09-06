import { AudioSession, registerGlobals } from '@livekit/react-native';

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
 * Configure audio session for voice communication.
 */
export async function startAudioSession() {
  try {
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
  startAudioSession,
  stopAudioSession,
};

