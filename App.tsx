/**
 * Cloud News App
 * @format
 */
import "./global.css";
import { registerGlobals } from '@livekit/react-native';

// Register LiveKit WebRTC globals before any components render
registerGlobals();

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { UserProvider, useUser } from './src/context/UserContext';
import { MeetingProvider, useMeeting } from './src/context/MeetingContext';
import { GlobalMeetingOverlay } from './src/components/meeting/GlobalMeetingOverlay';
import AppNavigator from './src/navigation/AppNavigator';
import { ENV } from './src/config/env';
import { loadCustomFonts } from './src/utils/fontLoader';

import { getStoredAuth, setAuthRevocationListener } from './src/services/api';
import { resetToOnboarding } from './src/navigation/navigationRef';
import { RootStackParamList } from './src/navigation/types';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const ThemedStatusBar: React.FC = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
};

const AuthRevocationHandler: React.FC = () => {
  const { logout } = useUser();
  const { endMeeting, activeMeeting } = useMeeting();

  const activeMeetingRef = useRef(activeMeeting);
  activeMeetingRef.current = activeMeeting;
  const endMeetingRef = useRef(endMeeting);
  endMeetingRef.current = endMeeting;
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    setAuthRevocationListener(async (message: string) => {
      console.warn('[AuthRevocationHandler] Session revoked, cleaning up meeting and auth state');

      if (activeMeetingRef.current) {
        try {
          await endMeetingRef.current();
        } catch (e) {
          console.warn('[AuthRevocationHandler] Error ending meeting on revocation:', e);
        }
      }

      try {
        await logoutRef.current();
      } catch (e) {
        console.warn('[AuthRevocationHandler] Error logging out on revocation:', e);
      }

      resetToOnboarding();

      Alert.alert(
        'Account Signed Out',
        message,
        [{ text: 'OK' }],
        { cancelable: false }
      );
    });

    return () => {
      setAuthRevocationListener(null);
    };
  }, []);

  return null;
};

function App(): React.JSX.Element | null {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Onboarding');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Parallel bootstrap: 1. Native fonts, 2. Stored auth session & API token
        const [loadedFonts, auth] = await Promise.all([
          loadCustomFonts().catch(e => {
            console.warn('[App] Error loading custom fonts:', e);
            return false;
          }),
          getStoredAuth().catch(e => {
            console.warn('[App] Error checking stored auth session:', e);
            return { token: null, user: null, isGuest: false, isAuthenticated: false };
          }),
        ]);

        console.log('[App] Cold-boot bootstrap ready. isAuthenticated:', auth.isAuthenticated);

        if (isMounted) {
          if (auth.isAuthenticated) {
            setInitialRoute('Home');
          } else {
            setInitialRoute('Onboarding');
          }
        }
      } catch (e) {
        console.warn('[App] Bootstrap error:', e);
      } finally {
        if (isMounted) {
          setAppIsReady(true);
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#040912', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <UserProvider>
            <MeetingProvider>
              <ThemedStatusBar />
              <AuthRevocationHandler />
              <AppNavigator initialRouteName={initialRoute} />
              <GlobalMeetingOverlay />
            </MeetingProvider>
          </UserProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
