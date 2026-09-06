import axios from 'axios';
import { Platform } from 'react-native';

// Android emulator maps 10.0.2.2 to host machine's localhost; iOS uses localhost
const DEFAULT_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000/api',
  ios: 'http://localhost:8000/api',
  default: 'http://localhost:8000/api',
});

export const apiClient = axios.create({
  baseURL: DEFAULT_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

export interface CreateRoomResponse {
  success: boolean;
  message: string;
  data: {
    room_name: string;
    empty_timeout: number;
    max_participants: number;
  };
}

export interface JoinTokenResponse {
  success: boolean;
  data: {
    token: string;
    room_name: string;
    identity: string;
    name: string;
    livekit_url: string;
  };
}

export async function createMeetingRoom(
  roomName?: string,
  emptyTimeout = 300,
  maxParticipants = 50,
): Promise<CreateRoomResponse> {
  const response = await apiClient.post<CreateRoomResponse>('/v1/rooms/create', {
    room_name: roomName,
    empty_timeout: emptyTimeout,
    max_participants: maxParticipants,
  });
  return response.data;
}

export async function getMeetingJoinToken(
  roomName: string,
  identity?: string,
  name?: string,
  metadata?: Record<string, any>,
): Promise<JoinTokenResponse> {
  const response = await apiClient.post<JoinTokenResponse>('/v1/rooms/join-token', {
    room_name: roomName,
    identity,
    name,
    metadata,
  });
  return response.data;
}

export default {
  createMeetingRoom,
  getMeetingJoinToken,
};

