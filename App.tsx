/**
 * Cloud News App
 * @format
 */
import "./global.css";
import { registerGlobals } from '@livekit/react-native';

// Register LiveKit WebRTC globals before any components render
registerGlobals();

import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { UserProvider } from './src/context/UserContext';
import { MeetingProvider } from './src/context/MeetingContext';
import { GlobalMeetingOverlay } from './src/components/meeting/GlobalMeetingOverlay';
import AppNavigator from './src/navigation/AppNavigator';
import { ENV } from './src/config/env';
import { loadCustomFonts } from './src/utils/fontLoader';

import { getStoredAuth } from './src/services/api';
import { RootStackParamList } from './src/navigation/types';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const ThemedStatusBar: React.FC = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
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
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <UserProvider>
            <MeetingProvider>
              <ThemedStatusBar />
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
