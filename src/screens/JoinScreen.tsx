import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Hash,
  Mic,
  MicOff,
  User,
  Video,
  VideoOff,
  CheckCircle2,
  AlertCircle,
  X,
  Radio,
  Lock,
  Clock,
} from 'lucide-react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GradientButton from '../components/common/GradientButton';
import { RootStackNavigationProp, RootStackRouteProp } from '../navigation/types';
import { guestLogin, joinMeeting, validateMeeting } from '../services/api';
import storage, { StorageKeys } from '../services/storage';
import { ENV } from '../config/env';
import { useTranslation } from '../hooks/useTranslation';
import { useMeetingContext } from '../context/MeetingContext';
import { useTheme } from '../context/ThemeContext';

interface MeetingValidationInfo {
  isValid: boolean;
  title: string;
  code: string;
  roomName?: string;
  isActive?: boolean;
  requiresPasscode?: boolean;
}

const extractCleanMeetingCode = (rawInput: string): string => {
  if (!rawInput) return '';
  let clean = rawInput.trim();

  // Handle URL paths: get the last path segment
  if (clean.includes('/')) {
    clean = clean.split('/').filter(p => Boolean(p.trim())).pop() || '';
  }

  // Remove query parameters if present
  clean = clean.split('?')[0].trim();

  // If format is like cloudnews-xyz, keep room name
  if (clean.toLowerCase().startsWith('cloudnews-')) {
    return clean;
  }

  // Otherwise remove hyphens, spaces, and special characters
  return clean.replace(/[-\s]/g, '').toUpperCase();
};

const formatMeetingCodeDisplay = (code: string): string => {
  if (!code) return '';
  const plain = code.replace(/[^a-zA-Z0-9]/g, '');
  if (plain.length === 6 && !code.includes('-')) {
    return `${plain.slice(0, 3)}-${plain.slice(3, 6)}`;
  }
  if (plain.length === 9 && !code.includes('-')) {
    return `${plain.slice(0, 3)}-${plain.slice(3, 6)}-${plain.slice(6, 9)}`;
  }
  return code;
};

export const JoinScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Join'>>();
  const route = useRoute<RootStackRouteProp<'Join'>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { startMeeting } = useMeetingContext();
  const { isDark, colors } = useTheme();

  // Form State
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [requiresPasscode, setRequiresPasscode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [muteAudio, setMuteAudio] = useState(false);
  const [muteVideo, setMuteVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isHostUser, setIsHostUser] = useState(false);
  const [hostUserName, setHostUserName] = useState('');

  // Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState<MeetingValidationInfo | null>(null);
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Host-First Gating State
  const [isWaitingForHost, setIsWaitingForHost] = useState(false);
  const [waitingMeetingTitle, setWaitingMeetingTitle] = useState('');
  const [waitingMeetingCode, setWaitingMeetingCode] = useState('');
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const radarAnim = useRef(new Animated.Value(0)).current;

  // Pulsating radar animation loop
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isWaitingForHost) {
      radarAnim.setValue(0);
      anim = Animated.loop(
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      anim.start();
    } else {
      radarAnim.setValue(0);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [isWaitingForHost, radarAnim]);

  const clearWaitingState = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setIsWaitingForHost(false);
    setLoading(false);
  }, []);

  // Ensure polling timer is strictly cleared on component unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, []);

  const startHostPolling = useCallback(
    (
      cleanCode: string,
      passcodeVal?: string,
      effectiveDisplayName?: string,
      isGuestJoin?: boolean
    ) => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }

      setIsWaitingForHost(true);
      setLoading(false);

      pollingTimerRef.current = setInterval(async () => {
        try {
          console.log('[Join] Polling for host on code:', cleanCode);
          const res = await joinMeeting(cleanCode, passcodeVal);

          if (res?.success && res.data?.livekit_token) {
            console.log('[Join] Host has arrived! Connecting to LiveKit room...');
            clearWaitingState();

            const resolvedServerUrl = (res.data as any).livekit_url || ENV.LIVEKIT_WS_URL;
            const resolvedRoomName = res.data.room_name;
            const resolvedMeetingTitle =
              (res.data as any).title ||
              meetingInfo?.title ||
              res.data.meeting_code ||
              cleanCode;

            startMeeting({
              roomName: resolvedRoomName,
              token: res.data.livekit_token,
              serverUrl: resolvedServerUrl,
              displayName: effectiveDisplayName || 'Participant',
              isGuest: Boolean(isGuestJoin),
              meetingCode: res.data.meeting_code || cleanCode,
              meetingTitle: resolvedMeetingTitle,
              isHost: isGuestJoin ? false : Boolean(res.data.is_host),
              muteAudio: muteAudio,
              muteVideo: muteVideo,
            });

            if (isGuestJoin) {
              navigation.replace('Onboarding');
            } else {
              navigation.replace('Home');
            }
          }
        } catch (pollErr: any) {
          const errCode = pollErr.response?.data?.code;
          const errStatus = pollErr.response?.data?.status;
          if (errCode === 'WAITING_FOR_HOST' || errStatus === 'waiting_for_host') {
            // Host has not joined yet; silently continue polling
            return;
          }
          console.warn('[Join] Polling error:', pollErr.message);
        }
      }, 3500);
    },
    [clearWaitingState, meetingInfo, muteAudio, muteVideo, navigation, startMeeting]
  );

  // Initialize display name from storage
  useEffect(() => {
    const loadSavedUser = async () => {
      try {
        const [token, userDataStr, isGuestStr] = await Promise.all([
          storage.getItem(StorageKeys.AUTH_TOKEN),
          storage.getItem(StorageKeys.USER_DATA),
          storage.getItem(StorageKeys.IS_GUEST),
        ]);

        const hasHostAuth = Boolean(token && isGuestStr !== 'true');
        setIsHostUser(hasHostAuth);

        if (hasHostAuth && userDataStr) {
          try {
            const user = JSON.parse(userDataStr);
            if (user?.name) {
              setHostUserName(user.name);
              setDisplayName(user.name);
              return;
            }
          } catch {}
        }

        const lastGuestName = await storage.getItem('cloudnews_last_guest_name');
        if (lastGuestName) {
          setDisplayName(lastGuestName);
        }
      } catch (e) {
        console.warn('[Join] Failed to load saved user name:', e);
      }
    };
    loadSavedUser();
  }, []);

  // Validate meeting code against backend
  const checkMeetingCode = useCallback(async (codeToValidate: string) => {
    const clean = extractCleanMeetingCode(codeToValidate);
    if (!clean || clean.length < 5) {
      setMeetingInfo(null);
      setRequiresPasscode(false);
      setIsValidating(false);
      return;
    }

    try {
      setIsValidating(true);
      const res = await validateMeeting(clean);
      if (res?.success && res.data) {
        const needsPasscode = Boolean(res.data.requires_passcode);
        setMeetingInfo({
          isValid: Boolean(res.data.valid !== false),
          title: res.data.title || 'Live Meeting',
          code: res.data.meeting_code || formatMeetingCodeDisplay(clean),
          roomName: res.data.room_name,
          isActive: Boolean(res.data.is_active),
          requiresPasscode: needsPasscode,
        });
        setRequiresPasscode(needsPasscode);
      } else {
        setMeetingInfo({
          isValid: false,
          title: 'Meeting Not Found',
          code: clean,
        });
        setRequiresPasscode(false);
      }
    } catch (err: any) {
      const errData = err.response?.data?.errors || err.response?.data?.data || err.response?.data;
      if (errData?.requires_passcode) {
        setMeetingInfo({
          isValid: true,
          title: errData.title || 'Live Meeting',
          code: errData.meeting_code || formatMeetingCodeDisplay(clean),
          isActive: true,
          requiresPasscode: true,
        });
        setRequiresPasscode(true);
      } else {
        setMeetingInfo({
          isValid: false,
          title: 'Meeting Not Found',
          code: clean,
        });
        setRequiresPasscode(false);
      }
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Handle incoming route params (Deep Link or navigation param)
  useEffect(() => {
    if (route.params?.meetingCode) {
      const incomingCode = route.params.meetingCode.trim();
      const formatted = formatMeetingCodeDisplay(incomingCode);
      setMeetingId(formatted);
      checkMeetingCode(incomingCode);
    }
  }, [route.params?.meetingCode, checkMeetingCode]);

  // Debounced validation on text change
  const handleMeetingIdChange = (text: string) => {
    setMeetingId(text);
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    const clean = extractCleanMeetingCode(text);
    if (clean.length >= 5) {
      validationTimerRef.current = setTimeout(() => {
        checkMeetingCode(clean);
      }, 600);
    } else {
      setMeetingInfo(null);
      setIsValidating(false);
    }
  };

  const handleClearCode = () => {
    setMeetingId('');
    setPasscode('');
    setRequiresPasscode(false);
    setMeetingInfo(null);
    setIsValidating(false);
  };

  const handleJoin = async () => {
    const cleanCode = extractCleanMeetingCode(meetingId);
    if (!cleanCode || cleanCode.length < 5) {
      Alert.alert(t('common.error'), t('join.invalidCode'));
      return;
    }

    if (requiresPasscode && !passcode.trim()) {
      Alert.alert(t('common.error'), t('join.passcodeRequired'));
      return;
    }

    const effectiveDisplayName =
      displayName.trim() ||
      hostUserName ||
      `Guest_${Math.floor(1000 + Math.random() * 9000)}`;

    let isGuestJoin = true;
    setLoading(true);
    try {
      // 1. Determine if this join is a guest join
      let token = await storage.getItem(StorageKeys.AUTH_TOKEN);
      const isSavedGuest = (await storage.getItem(StorageKeys.IS_GUEST)) === 'true';

      // CRITICAL: If the user already has an active authenticated host session, NEVER downgrade or wipe host token
      const hasHostSession = Boolean(token && !isSavedGuest);
      isGuestJoin = !hasHostSession;

      if (isGuestJoin) {
        let hasValidGuestSession = false;
        try {
          const storedUserStr = await storage.getItem(StorageKeys.USER_DATA);
          if (storedUserStr && token && isSavedGuest) {
            const parsedUser = JSON.parse(storedUserStr);
            if (parsedUser?.name === effectiveDisplayName) {
              hasValidGuestSession = true;
            }
          }
        } catch {}

        if (!hasValidGuestSession) {
          console.log('[Join] Performing seamless guest login for:', effectiveDisplayName);
          const guestRes = await guestLogin(effectiveDisplayName);
          if (guestRes.success && guestRes.data?.token) {
            token = guestRes.data.token;
            await storage.setItem(StorageKeys.AUTH_TOKEN, token);
            await storage.setItem(StorageKeys.IS_GUEST, 'true');
            if (guestRes.data.user) {
              await storage.setItem(StorageKeys.USER_DATA, JSON.stringify(guestRes.data.user));
            }
          } else {
            throw new Error(guestRes.message || 'Guest authentication failed. Please check network.');
          }
        }
      }

      // Save display name preference locally
      await storage.setItem('cloudnews_last_guest_name', effectiveDisplayName);

      // 2. Call backend join endpoint
      console.log('[Join] Joining room with code:', cleanCode);
      let meetingRes;
      try {
        meetingRes = await joinMeeting(cleanCode, passcode.trim() || undefined);
      } catch (joinErr: any) {
        // Handle token expiration: re-login guest if guest; if host alert cleanly
        if (joinErr.response?.status === 401) {
          if (!hasHostSession) {
            console.log('[Join] Token expired (401). Retrying with fresh guest session...');
            await storage.removeItem(StorageKeys.AUTH_TOKEN);
            await storage.removeItem(StorageKeys.IS_GUEST);
            const freshGuest = await guestLogin(effectiveDisplayName);
            if (freshGuest.success && freshGuest.data?.token) {
              await storage.setItem(StorageKeys.AUTH_TOKEN, freshGuest.data.token);
              await storage.setItem(StorageKeys.IS_GUEST, 'true');
              meetingRes = await joinMeeting(cleanCode, passcode.trim() || undefined);
            } else {
              throw joinErr;
            }
          } else {
            Alert.alert(t('common.error'), 'Host session expired. Please log in again.');
            return;
          }
        } else if (
          joinErr.response?.data?.code === 'WAITING_FOR_HOST' ||
          joinErr.response?.data?.status === 'waiting_for_host'
        ) {
          meetingRes = joinErr.response.data;
        } else {
          throw joinErr;
        }
      }

      // Check if waiting for host
      if (
        meetingRes?.code === 'WAITING_FOR_HOST' ||
        meetingRes?.status === 'waiting_for_host'
      ) {
        setWaitingMeetingTitle(meetingInfo?.title || cleanCode);
        setWaitingMeetingCode(formatMeetingCodeDisplay(cleanCode));
        startHostPolling(cleanCode, passcode.trim() || undefined, effectiveDisplayName, isGuestJoin);
        return;
      }

      if (meetingRes?.success && meetingRes.data?.livekit_token) {
        const resolvedServerUrl = (meetingRes.data as any).livekit_url || ENV.LIVEKIT_WS_URL;
        const resolvedRoomName = meetingRes.data.room_name;
        const resolvedMeetingTitle =
          (meetingRes.data as any).title ||
          meetingInfo?.title ||
          meetingRes.data.meeting_code ||
          cleanCode;

        startMeeting({
          roomName: resolvedRoomName,
          token: meetingRes.data.livekit_token,
          serverUrl: resolvedServerUrl,
          displayName: effectiveDisplayName,
          isGuest: isGuestJoin,
          meetingCode: meetingRes.data.meeting_code || cleanCode,
          meetingTitle: resolvedMeetingTitle,
          isHost: isGuestJoin ? false : Boolean(meetingRes.data.is_host),
          muteAudio: muteAudio,
          muteVideo: muteVideo,
        });

        if (isGuestJoin) {
          // Sandboxed guest session: Background screen is Onboarding, NEVER Home!
          navigation.replace('Onboarding');
        } else {
          // Authenticated host session: Background screen is Home
          navigation.replace('Home');
        }
      } else {
        Alert.alert(
          t('join.joinFailed'),
          meetingRes?.message || 'Meeting could not be found or has already ended by host.'
        );
      }
    } catch (error: any) {
      if (
        error.response?.data?.code === 'WAITING_FOR_HOST' ||
        error.response?.data?.status === 'waiting_for_host'
      ) {
        setWaitingMeetingTitle(meetingInfo?.title || cleanCode);
        setWaitingMeetingCode(formatMeetingCodeDisplay(cleanCode));
        startHostPolling(cleanCode, passcode.trim() || undefined, effectiveDisplayName, isGuestJoin);
        return;
      }
      if (
        error.response?.data?.data?.requires_passcode ||
        error.response?.data?.requires_passcode
      ) {
        setRequiresPasscode(true);
      }
      const msg = error.response?.data?.message || error.message || 'Failed to connect to the meeting server.';
      console.error('[Join] Error:', msg);
      Alert.alert(t('join.joinFailed'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, !isDark && { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {isWaitingForHost ? (
        /* Dedicated Sleek Standby View */
        <View style={[styles.standbyContainer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
          {/* Standby Header */}
          <View style={styles.standbyHeader}>
            <TouchableOpacity
              onPress={clearWaitingState}
              style={[styles.backBtn, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <ChevronLeft color={isDark ? '#F8FAFC' : colors.textPrimary} size={22} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, !isDark && { color: colors.textPrimary }]}>
              {t('join.waitingForHostTitle')}
            </Text>
            <View style={{ width: 42 }} />
          </View>

          {/* Standby Content */}
          <View style={styles.standbyContent}>
            {/* Pulsating Radar Concentric Rings */}
            <View style={styles.radarContainer}>
              <Animated.View
                style={[
                  styles.radarWave,
                  {
                    borderColor: colors.primary,
                    transform: [
                      {
                        scale: radarAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 2.4],
                        }),
                      },
                    ],
                    opacity: radarAnim.interpolate({
                      inputRange: [0, 0.4, 1],
                      outputRange: [0.6, 0.25, 0],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.radarWave,
                  {
                    borderColor: colors.primary,
                    transform: [
                      {
                        scale: radarAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.7],
                        }),
                      },
                    ],
                    opacity: radarAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 0.4, 0],
                    }),
                  },
                ]}
              />
              <View style={[styles.radarCenterCircle, { backgroundColor: colors.primary }]}>
                <Clock color="#FFFFFF" size={36} />
              </View>
            </View>

            {/* Standby Card Info */}
            <View style={[styles.standbyCard, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.standbyTitle, !isDark && { color: colors.textPrimary }]}>
                {t('join.waitingForHostTitle')}
              </Text>
              <Text style={[styles.standbySubtitle, !isDark && { color: colors.textSecondary }]}>
                {t('join.waitingForHostSubtitle')}
              </Text>

              {/* Meeting Details Pill */}
              <View style={[styles.standbyInfoPill, !isDark && { backgroundColor: colors.cardSubtle }]}>
                <Radio color={colors.primary} size={15} style={{ marginRight: 8 }} />
                <Text style={[styles.standbyCodeText, !isDark && { color: colors.textPrimary }]}>
                  {t('join.idPrefix')} {waitingMeetingCode || meetingId}
                </Text>
              </View>

              {waitingMeetingTitle ? (
                <Text style={[styles.standbyMeetingTitle, !isDark && { color: colors.textMuted }]} numberOfLines={1}>
                  {waitingMeetingTitle}
                </Text>
              ) : null}

              {/* Live Polling Status Indicator */}
              <View style={styles.standbyStatusRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.standbyStatusText, !isDark && { color: colors.textSecondary }]}>
                  {t('join.waitingForHostChecking')}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Button: Leave / Cancel */}
          <View style={styles.standbyBottom}>
            <TouchableOpacity
              onPress={clearWaitingState}
              style={[styles.cancelStandbyBtn, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <X color="#EF4444" size={18} style={{ marginRight: 8 }} />
              <Text style={styles.cancelStandbyText}>{t('join.cancelWaiting')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Top Header */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }, !isDark && { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else if (isHostUser) {
                  navigation.replace('Home');
                } else {
                  navigation.replace('Onboarding');
                }
              }}
              style={[styles.backBtn, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <ChevronLeft color={isDark ? '#F8FAFC' : colors.textPrimary} size={22} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, !isDark && { color: colors.textPrimary }]}>{t('join.title')}</Text>
            <View style={{ width: 42 }} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
        {/* Meeting ID or Link Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, !isDark && { color: colors.textSecondary }]}>{t('join.meetingIdLabel')}</Text>
          <View style={[styles.inputCard, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Hash color={colors.primary} size={20} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, !isDark && { color: colors.textPrimary }]}
              value={meetingId}
              onChangeText={handleMeetingIdChange}
              placeholder={t('join.meetingIdPlaceholder')}
              placeholderTextColor={isDark ? '#64748b' : colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            {meetingId.length > 0 && (
              <TouchableOpacity onPress={handleClearCode} style={styles.clearBtn} activeOpacity={0.7}>
                <X color={isDark ? '#94a3b8' : colors.textSecondary} size={16} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Validation Status / Meeting Info Card */}
        {isValidating && (
          <View style={styles.validatingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.validatingText, !isDark && { color: colors.primary }]}>{t('join.verifying')}</Text>
          </View>
        )}

        {meetingInfo && !isValidating && (
          <View
            style={[
              styles.infoCard,
              !isDark && { backgroundColor: colors.card, borderColor: colors.border },
              meetingInfo.isValid ? styles.infoCardValid : styles.infoCardInvalid,
            ]}
          >
            <View style={styles.infoHeaderRow}>
              {meetingInfo.isValid ? (
                <>
                  <View style={styles.pulseDotContainer}>
                    <View style={styles.pulseDot} />
                  </View>
                  <Text style={styles.infoBadgeValid}>
                    {meetingInfo.isActive ? t('join.activeReady') : t('join.meetingFound')}
                  </Text>
                </>
              ) : (
                <>
                  <AlertCircle color="#EF4444" size={16} style={{ marginRight: 6 }} />
                  <Text style={styles.infoBadgeInvalid}>{t('join.notFound')}</Text>
                </>
              )}
            </View>

            <Text style={[styles.infoMeetingTitle, !isDark && { color: colors.textPrimary }]} numberOfLines={2}>
              {meetingInfo.title}
            </Text>

            <View style={[styles.infoCodeTag, !isDark && { backgroundColor: colors.cardSubtle }]}>
              <Radio color={colors.primary} size={13} style={{ marginRight: 6 }} />
              <Text style={[styles.infoCodeTagText, !isDark && { color: colors.primary }]}>{t('join.idPrefix')} {meetingInfo.code}</Text>
            </View>
          </View>
        )}

        {/* Display Name Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, !isDark && { color: colors.textSecondary }]}>{t('join.displayNameLabel')}</Text>
          <View style={[styles.inputCard, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <User color={colors.primary} size={20} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, !isDark && { color: colors.textPrimary }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('join.displayNamePlaceholder')}
              placeholderTextColor={isDark ? '#64748b' : colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          <Text style={[styles.helperText, !isDark && { color: colors.textSecondary }]}>
            {t('join.displayNameHint')}
          </Text>
          {isHostUser && (
            <View style={styles.hostBadgeContainer}>
              <CheckCircle2 color="#10B981" size={14} style={{ marginRight: 6 }} />
              <Text style={styles.hostBadgeText}>
                {t('join.joiningAsHost').replace('{name}', hostUserName || displayName)}
              </Text>
            </View>
          )}
        </View>

        {/* Passcode Input (When required by meeting) */}
        {requiresPasscode && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, !isDark && { color: colors.textSecondary }]}>{t('join.passcodeLabel')}</Text>
            <View style={[styles.inputCard, !isDark && { backgroundColor: colors.card }, { borderColor: colors.primary }]}>
              <Lock color={colors.primary} size={20} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, !isDark && { color: colors.textPrimary }]}
                value={passcode}
                onChangeText={setPasscode}
                placeholder={t('join.passcodePlaceholder')}
                placeholderTextColor={isDark ? '#64748b' : colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
            <Text style={[styles.helperText, { color: colors.primary }]}>
              {t('join.passcodeRequired')}
            </Text>
          </View>
        )}

        {/* Pre-call Settings Card */}
        <View style={[styles.settingsCard, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.settingsSectionTitle, !isDark && { color: colors.textSecondary }]}>{t('join.joinOptions')}</Text>

          {/* Mute Audio Option */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, muteAudio && styles.settingIconWrapMuted]}>
                {muteAudio ? <MicOff color="#EF4444" size={18} /> : <Mic color="#10B981" size={18} />}
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingTitle, !isDark && { color: colors.textPrimary }]}>{t('join.muteMic')}</Text>
                <Text style={[styles.settingSubtitle, !isDark && { color: colors.textSecondary }]}>
                  {muteAudio ? t('join.micOffSubtitle') : t('join.micOnSubtitle')}
                </Text>
              </View>
            </View>
            <Switch
              value={muteAudio}
              onValueChange={setMuteAudio}
              trackColor={{ false: isDark ? '#1e293b' : '#CBD5E1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingDivider, !isDark && { backgroundColor: colors.divider }]} />

          {/* Turn Off Video Option */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, muteVideo && styles.settingIconWrapMuted]}>
                {muteVideo ? <VideoOff color="#EF4444" size={18} /> : <Video color="#10B981" size={18} />}
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingTitle, !isDark && { color: colors.textPrimary }]}>{t('join.turnCameraOff')}</Text>
                <Text style={[styles.settingSubtitle, !isDark && { color: colors.textSecondary }]}>
                  {muteVideo ? t('join.cameraOffSubtitle') : t('join.cameraOnSubtitle')}
                </Text>
              </View>
            </View>
            <Switch
              value={muteVideo}
              onValueChange={setMuteVideo}
              trackColor={{ false: isDark ? '#1e293b' : '#CBD5E1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>

          {/* Floating Bottom Join Button */}
          <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }, !isDark && { backgroundColor: colors.background }]}>
            <GradientButton
              title={loading ? t('join.joiningRoom') : t('join.enterMeeting')}
              icon={
                loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <CheckCircle2 color="#FFFFFF" size={20} />
                )
              }
              onPress={handleJoin}
              style={styles.joinBtn}
              colors={['#00A8FF', '#0066CC']}
              disabled={loading || !meetingId.trim()}
            />
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050B14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(5, 11, 20, 0.85)',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1728',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  helperText: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 2,
    marginLeft: 4,
  },
  validatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  validatingText: {
    color: '#00A8FF',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 8,
  },
  infoCardValid: {
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
    borderColor: 'rgba(0, 168, 255, 0.35)',
  },
  infoCardInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDotContainer: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  infoBadgeValid: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.5,
  },
  infoBadgeInvalid: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  infoMeetingTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 2,
  },
  infoCodeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  infoCodeTagText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  settingsCard: {
    backgroundColor: '#0B1728',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  settingsSectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    marginBottom: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconWrapMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  settingTexts: {
    flex: 1,
  },
  settingTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  settingSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 11, 20, 0.95)',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  joinBtn: {
    height: 56,
    borderRadius: 16,
  },
  hostBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    alignSelf: 'flex-start',
  },
  hostBadgeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  standbyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  standbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  standbyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  radarContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  radarWave: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  radarCenterCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  standbyCard: {
    width: '100%',
    backgroundColor: '#0B1528',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  standbyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  standbySubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  standbyInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#132238',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
  },
  standbyCodeText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  standbyMeetingTitle: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  standbyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  standbyStatusText: {
    color: '#94A3B8',
    fontSize: 13,
    marginLeft: 10,
  },
  standbyBottom: {
    paddingTop: 16,
    alignItems: 'center',
  },
  cancelStandbyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelStandbyText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default JoinScreen;
