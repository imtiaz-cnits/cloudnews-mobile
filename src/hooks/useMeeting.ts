import { useCallback, useEffect, useState } from 'react';
import { createMeetingRoom, getMeetingJoinToken } from '../services/api';
import { initLiveKit, startAudioSession, stopAudioSession } from '../services/livekit';

export interface MeetingSessionConfig {
  roomName: string;
  displayName: string;
  identity?: string;
}

export interface MeetingState {
  isConnecting: boolean;
  isConnected: boolean;
  token: string | null;
  serverUrl: string | null;
  roomName: string | null;
  error: string | null;
  isMicMuted: boolean;
  isCameraOff: boolean;
}

export function useMeeting() {
  const [state, setState] = useState<MeetingState>({
    isConnecting: false,
    isConnected: false,
    token: null,
    serverUrl: null,
    roomName: null,
    error: null,
    isMicMuted: false,
    isCameraOff: false,
  });

  useEffect(() => {
    initLiveKit();
  }, []);

  /**
   * Join or start a meeting by room name & participant name
   */
  const joinMeeting = useCallback(async (config: MeetingSessionConfig) => {
    setState(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
      roomName: config.roomName,
    }));

    try {
      // 1. Fetch join token from Laravel API backend
      const response = await getMeetingJoinToken(
        config.roomName,
        config.identity,
        config.displayName,
      );

      await startAudioSession();

      setState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: true,
        token: response.data.token,
        serverUrl: response.data.livekit_url,
        roomName: response.data.room_name,
        error: null,
      }));

      return response.data;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err?.message || 'Failed to join meeting';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: errorMsg,
      }));
      throw new Error(errorMsg);
    }
  }, []);

  /**
   * Create a new room on the backend
   */
  const createRoom = useCallback(async (roomName?: string) => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    try {
      const response = await createMeetingRoom(roomName);
      setState(prev => ({ ...prev, isConnecting: false }));
      return response.data.room_name;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err?.message || 'Failed to create room';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMsg,
      }));
      throw new Error(errorMsg);
    }
  }, []);

  /**
   * Toggle local microphone state
   */
  const toggleMic = useCallback(() => {
    setState(prev => ({ ...prev, isMicMuted: !prev.isMicMuted }));
  }, []);

  /**
   * Toggle local camera state
   */
  const toggleCamera = useCallback(() => {
    setState(prev => ({ ...prev, isCameraOff: !prev.isCameraOff }));
  }, []);

  /**
   * Leave meeting and tear down audio session
   */
  const leaveMeeting = useCallback(async () => {
    await stopAudioSession();
    setState({
      isConnecting: false,
      isConnected: false,
      token: null,
      serverUrl: null,
      roomName: null,
      error: null,
      isMicMuted: false,
      isCameraOff: false,
    });
  }, []);

  return {
    ...state,
    joinMeeting,
    createRoom,
    toggleMic,
    toggleCamera,
    leaveMeeting,
  };
}

export default useMeeting;

