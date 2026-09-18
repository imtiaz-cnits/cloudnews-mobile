import axios from 'axios';
import { ENV } from '../config/env';
import storage, { StorageKeys } from './storage';

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor
apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interfaces
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthResponse {
  user: {
    id: number;
    name: string;
    username?: string;
    email: string;
    avatar_url?: string;
  };
  token: string;
}

export interface MeetingData {
  room_name: string;
  meeting_code: string;
  livekit_token: string;
  is_host: boolean;
  token?: string;
  livekit_url?: string;
  title?: string;
  meeting?: any;
}

export interface ScheduledMeeting {
  id: number;
  title: string;
  meeting_code: string;
  scheduled_at: string;
  is_host: boolean;
  passcode?: string;
  requires_passcode?: boolean;
  waiting_room: boolean;
  status: 'upcoming' | 'ongoing' | 'expired'; // Backend should ideally provide this, or we derive it
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar_url?: string;
}

/**
 * Sets or clears the default Authorization header on apiClient.
 */
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

/**
 * Retrieve saved auth state from storage and synchronize the API client header.
 */
export const getStoredAuth = async (): Promise<{
  token: string | null;
  user: User | null;
  isGuest: boolean;
  isAuthenticated: boolean;
}> => {
  try {
    const [token, userStr, isGuestStr] = await Promise.all([
      storage.getItem(StorageKeys.AUTH_TOKEN),
      storage.getItem(StorageKeys.USER_DATA),
      storage.getItem(StorageKeys.IS_GUEST),
    ]);

    const isGuest = isGuestStr === 'true';
    let user: User | null = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {}
    }

    const hasValidToken = Boolean(token && typeof token === 'string' && token.trim().length > 0);
    const isAuthenticated = Boolean(hasValidToken && !isGuest);

    if (hasValidToken && token) {
      setAuthToken(token.trim());
    }

    return { token: token ? token.trim() : null, user, isGuest, isAuthenticated };
  } catch (err) {
    console.warn('[API] getStoredAuth error:', err);
    return { token: null, user: null, isGuest: false, isAuthenticated: false };
  }
};

/**
 * API Handlers
 */

// 1. Host / Account Login
export const login = async (loginIdentifier: string, password: string): Promise<ApiResponse<AuthResponse>> => {
  const response = await apiClient.post('/auth/login', {
    login: loginIdentifier,
    username: loginIdentifier,
    password,
  });

  if (response.data.success && response.data.data) {
    const rawData = response.data.data;
    const token = rawData.token || (response.data as any).token;
    const user = rawData.user || (response.data as any).user;

    if (token) {
      const cleanToken = String(token).trim();
      await storage.setItem(StorageKeys.AUTH_TOKEN, cleanToken);
      setAuthToken(cleanToken);
    }
    if (user) {
      await storage.setItem(StorageKeys.USER_DATA, typeof user === 'string' ? user : JSON.stringify(user));
    }
    await storage.setItem(StorageKeys.IS_GUEST, 'false');
  }

  return response.data;
};

// 2. Intentional Logout
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } catch (err) {
    console.log('[API] Logout endpoint notification note:', err);
  } finally {
    setAuthToken(null);
    await storage.removeItem(StorageKeys.AUTH_TOKEN);
    await storage.removeItem(StorageKeys.USER_DATA);
    await storage.removeItem(StorageKeys.IS_GUEST);
  }
};

// 3. Guest Login
export const guestLogin = async (name: string, deviceId?: string): Promise<ApiResponse<AuthResponse>> => {
  let effectiveDeviceId: string | undefined = deviceId;
  if (!effectiveDeviceId) {
    try {
      const saved = await storage.getItem('cloudnews_device_uuid');
      if (saved) {
        effectiveDeviceId = saved;
      } else {
        effectiveDeviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
        await storage.setItem('cloudnews_device_uuid', effectiveDeviceId);
      }
    } catch {
      // fallback
    }
  }

  const response = await apiClient.post('/auth/guest', {
    name,
    device_id: effectiveDeviceId,
  });
  if (response.data.success) {
    await storage.setItem(StorageKeys.AUTH_TOKEN, response.data.data.token);
    await storage.setItem(StorageKeys.IS_GUEST, 'true');
    if (response.data.data.user) {
      await storage.setItem(StorageKeys.USER_DATA, JSON.stringify(response.data.data.user));
    }
    setAuthToken(response.data.data.token);
  }
  return response.data;
};

// 2. Create Meeting
export const createMeeting = async (
  title: string,
  options?: { meetingCode?: string; passcode?: string; maxParticipants?: number }
): Promise<ApiResponse<MeetingData>> => {
  return (await apiClient.post('/meetings', {
    title,
    meeting_code: options?.meetingCode,
    passcode: options?.passcode,
    max_participants: options?.maxParticipants,
  })).data;
};

// 3. Join Meeting
export const joinMeeting = async (code: string, passcode?: string): Promise<ApiResponse<MeetingData>> => {
  // Ensure the code is clean before sending
  const cleanCode = code.replace(/[\s-]/g, '');
  return (await apiClient.post(`/meetings/${cleanCode}/join`, passcode ? { passcode } : {})).data;
};

export const joinMeetingRoom = joinMeeting;

// 4. Validate Meeting Code
export const validateMeeting = async (code: string, passcode?: string): Promise<ApiResponse<any>> => {
  const cleanCode = code.replace(/[\s-]/g, '');
  return (await apiClient.post('/meetings/validate', { code: cleanCode, passcode })).data;
};

// 5. End Meeting (Host)
export const endMeeting = async (code: string): Promise<ApiResponse<any>> => {
  return (await apiClient.post(`/meetings/${code}/end`)).data;
};

// 6. Leave Meeting
export const leaveMeeting = async (code: string): Promise<ApiResponse<any>> => {
  return (await apiClient.post(`/meetings/${code}/leave`)).data;
};

// 7. Schedule Meeting
export const scheduleMeeting = async (data: {
  title: string;
  scheduled_at: string;
  passcode?: string;
  waiting_room: boolean;
}): Promise<ApiResponse<ScheduledMeeting>> => {
  return (await apiClient.post('/meetings/schedule', data)).data;
};

// 8. Get Scheduled Meetings
export const getScheduledMeetings = async (): Promise<ApiResponse<ScheduledMeeting[]>> => {
  return (await apiClient.get('/meetings/scheduled')).data;
};

// 9. Delete Meeting
export const deleteMeeting = async (code: string): Promise<ApiResponse<any>> => {
  return (await apiClient.delete(`/meetings/${code}`)).data;
};

// 10. Get Users for Chat / Meeting Invites
export const getUsers = async (search?: string): Promise<ApiResponse<User[]>> => {
  return (await apiClient.get('/users', { params: search ? { search } : undefined })).data;
};

// 11. Update User Profile
export const updateProfile = async (data: {
  name?: string;
  avatar_url?: string;
}): Promise<ApiResponse<User>> => {
  return (await apiClient.put('/users/profile', data)).data;
};

export interface UploadedMeetingFile {
  file_name: string;
  file_url: string;
  file_size: number;
  file_size_formatted: string;
  file_type: 'image' | 'video' | 'audio' | 'document';
  mime_type?: string;
  meeting_code: string;
  uploaded_at: string;
}

// 12. Upload file in meeting room (Hong Kong Server)
export const uploadMeetingFile = async (
  meetingCode: string,
  file: {
    uri: string;
    name: string;
    type?: string;
  },
  category?: 'image' | 'video' | 'audio' | 'document',
  onProgress?: (progress: number) => void
): Promise<ApiResponse<UploadedMeetingFile>> => {
  const cleanCode = meetingCode.replace(/[\s-]/g, '');
  const formData = new FormData();

  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || 'application/octet-stream',
  } as any);

  if (category) {
    formData.append('category', category);
  }

  const response = await apiClient.post(`/meetings/${cleanCode}/files`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return response.data;
};

export interface MeetingMessageItem {
  id: number | string;
  meeting_id?: number;
  meeting_code?: string;
  user_id?: number;
  sender_name: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  text?: string;
  file_name?: string;
  file_size?: string;
  media_url?: string;
  duration?: string;
  created_at?: string;
  updated_at?: string;
}

export const getMeetingMessages = async (code: string): Promise<ApiResponse<MeetingMessageItem[]>> => {
  const cleanCode = code.replace(/[\s-]/g, '');
  return (await apiClient.get(`/meetings/${cleanCode}/messages`)).data;
};

export const sendMeetingMessage = async (
  code: string,
  data: Partial<MeetingMessageItem>
): Promise<ApiResponse<MeetingMessageItem>> => {
  const cleanCode = code.replace(/[\s-]/g, '');
  return (await apiClient.post(`/meetings/${cleanCode}/messages`, data)).data;
};

export const removeMeetingParticipant = async (code: string, identity: string): Promise<ApiResponse<any>> => {
  const cleanCode = code.replace(/[\s-]/g, '');
  return (await apiClient.post(`/meetings/${cleanCode}/participants/remove`, { identity })).data;
};

export const getMeetingInviteLink = (meetingCode: string): string => {
  return `${ENV.INVITE_WEB_URL}/room/${meetingCode}`;
};

export default {
  login,
  logout,
  guestLogin,
  setAuthToken,
  getStoredAuth,
  createMeeting,
  joinMeeting,
  validateMeeting,
  endMeeting,
  leaveMeeting,
  removeMeetingParticipant,
  scheduleMeeting,
  getScheduledMeetings,
  getUsers,
  updateProfile,
  uploadMeetingFile,
  getMeetingMessages,
  sendMeetingMessage,
};
