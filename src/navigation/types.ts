import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Join: { autoJoin?: boolean; meetingCode?: string; isGuest?: boolean } | undefined;
  Schedule: undefined;
  Messages: undefined;
  Profile: undefined;
  ChatDetail: { userId: number; name: string };
  MeetingRoom: {
    roomName: string;
    token: string;
    serverUrl: string;
    displayName: string;
    isGuest?: boolean;
    isHost?: boolean;
    meetingCode?: string;
    meetingTitle?: string;
    muteAudio?: boolean;
    muteVideo?: boolean;
  };
};

export type RootStackNavigationProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

export type RootStackRouteProp<T extends keyof RootStackParamList> =
  RouteProp<RootStackParamList, T>;
