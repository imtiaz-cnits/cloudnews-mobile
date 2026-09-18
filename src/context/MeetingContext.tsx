import React, { createContext, useContext, useState, useCallback } from 'react';
import storage, { StorageKeys } from '../services/storage';
import { resetToOnboarding, resetToHome } from '../navigation/navigationRef';
import { startMeetingForegroundService, stopMeetingForegroundService } from '../utils/wakeLock';

export interface MeetingSession {
  roomName: string;
  token: string;
  serverUrl: string;
  displayName?: string;
  meetingCode?: string;
  meetingTitle?: string;
  isHost?: boolean;
  isGuest?: boolean;
  muteAudio?: boolean;
  muteVideo?: boolean;
}

export interface MeetingContextType {
  activeMeeting: MeetingSession | null;
  isMinimized: boolean;
  startMeeting: (session: MeetingSession) => void;
  minimizeMeeting: () => void;
  maximizeMeeting: () => void;
  endMeeting: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMeeting, setActiveMeeting] = useState<MeetingSession | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const startMeeting = useCallback((session: MeetingSession) => {
    setActiveMeeting(prev => {
      if (
        prev &&
        prev.roomName === session.roomName &&
        prev.token === session.token
      ) {
        return prev;
      }
      return session;
    });
    setIsMinimized(false);
    startMeetingForegroundService(session.meetingTitle || session.roomName);
  }, []);

  const minimizeMeeting = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const maximizeMeeting = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const endMeeting = useCallback(async () => {
    stopMeetingForegroundService();
    const isGuestSession = Boolean(
      activeMeeting?.isGuest || (await storage.getItem(StorageKeys.IS_GUEST)) === 'true'
    );

    try {
      if (isGuestSession) {
        await storage.removeItem(StorageKeys.AUTH_TOKEN);
        await storage.removeItem(StorageKeys.USER_DATA);
        await storage.removeItem(StorageKeys.IS_GUEST);
        resetToOnboarding();
      } else {
        resetToHome();
      }
    } catch (e) {
      console.warn('[MeetingContext] Error during endMeeting cleanup:', e);
      resetToOnboarding();
    } finally {
      setActiveMeeting(null);
      setIsMinimized(false);
    }
  }, [activeMeeting]);

  return (
    <MeetingContext.Provider
      value={{
        activeMeeting,
        isMinimized,
        startMeeting,
        minimizeMeeting,
        maximizeMeeting,
        endMeeting,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
};

export const useMeeting = (): MeetingContextType => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
};

export const useMeetingContext = useMeeting;
