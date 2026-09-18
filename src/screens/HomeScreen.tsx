import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import {
  Calendar,
  CalendarPlus,
  Clock,
  Copy,
  Hash,
  Home,
  LayoutGrid,
  Link2,
  LogIn,
  MessageSquare,
  Moon,
  Play,
  Plus,
  Search,
  User,
  Users,
  Video,
  X,
  Link as LinkIcon,
  Check,
  Lock,
  Shield,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
  Pressable,
  Modal,
  RefreshControl,
  Easing,
  BackHandler,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { RootStackNavigationProp } from '../navigation/types';
import { useMeeting } from '../hooks/useMeeting';
import { useMeetingContext } from '../context/MeetingContext';
import { useUser } from '../context/UserContext';
import { getMeetingInviteLink, getScheduledMeetings, ScheduledMeeting, deleteMeeting, getUsers, User as ApiUser } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import storage, { StorageKeys, getPersonalMeetingCode } from '../services/storage';
import { useTheme } from '../context/ThemeContext';
import { ENV } from '../config/env';
import { getInitials, getAvatarTextStyle } from '../utils/helpers';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Home'>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark, colors } = useTheme();
  const { startNewMeeting } = useMeeting();
  const { startMeeting } = useMeetingContext();
  const { user } = useUser();

  const [isVerifiedHost, setIsVerifiedHost] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [personalRoomCode, setPersonalRoomCode] = useState<string>('824-109');
  const [isStartingPersonalRoom, setIsStartingPersonalRoom] = useState(false);

  useEffect(() => {
    const activeProfile = user || currentUser;
    if (activeProfile) {
      getPersonalMeetingCode(activeProfile).then(code => {
        if (code) {
          setPersonalRoomCode(code);
        }
      });
    }
  }, [user, currentUser]);

  const personalRoomDisplayUrl = `cloudnewsmeet.com/room/${personalRoomCode}`;
  const personalRoomFullUrl = getMeetingInviteLink(personalRoomCode);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [matchingContacts, setMatchingContacts] = useState<ApiUser[]>([]);
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);
  const contactSearchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Create Meeting Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [createdRoomData, setCreatedRoomData] = useState<any>(null);

  // Speed Dial State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (contactSearchTimerRef.current) {
      clearTimeout(contactSearchTimerRef.current);
    }

    const trimmed = text.trim();
    if (trimmed.length >= 2) {
      setIsSearchingContacts(true);
      contactSearchTimerRef.current = setTimeout(async () => {
        try {
          const res = await getUsers(trimmed);
          if (res?.success && Array.isArray(res.data)) {
            setMatchingContacts(res.data.filter((u: ApiUser) => u.id !== currentUser?.id));
          } else {
            setMatchingContacts([]);
          }
        } catch {
          setMatchingContacts([]);
        } finally {
          setIsSearchingContacts(false);
        }
      }, 350);
    } else {
      setMatchingContacts([]);
      setIsSearchingContacts(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setMatchingContacts([]);
    setIsSearchingContacts(false);
    if (contactSearchTimerRef.current) {
      clearTimeout(contactSearchTimerRef.current);
    }
  };

  const cleanQuery = searchQuery.trim().toLowerCase().replace(/[-\s]/g, '');
  const filteredMeetings = useMemo(() => {
    if (!searchQuery.trim()) return meetings;
    const q = searchQuery.trim().toLowerCase();
    return meetings.filter(m => {
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchCode =
        m.meeting_code.toLowerCase().includes(q) ||
        m.meeting_code.replace(/[-\s]/g, '').toLowerCase().includes(cleanQuery);
      const matchPass = Boolean(m.passcode && m.passcode.toLowerCase().includes(q));
      return matchTitle || matchCode || matchPass;
    });
  }, [meetings, searchQuery, cleanQuery]);

  const isLikelyMeetingCode = useMemo(() => {
    const raw = searchQuery.trim();
    const clean = raw.replace(/[-\s]/g, '');
    return (
      clean.length >= 5 &&
      (/^\d+$/.test(clean) ||
        raw.toLowerCase().startsWith('cloudnews-') ||
        raw.includes('/join/'))
    );
  }, [searchQuery]);

  const quickJoinTargetCode = useMemo(() => {
    if (!isLikelyMeetingCode) return null;
    let raw = searchQuery.trim();
    if (raw.includes('/')) {
      raw = raw.split('/').filter(Boolean).pop() || '';
    }
    return raw.split('?')[0].trim();
  }, [isLikelyMeetingCode, searchQuery]);

  const fetchMeetings = async (overrideUser?: any) => {
    try {
      const response = await getScheduledMeetings();
      if (response && response.success) {
        const activeUser = overrideUser || user || currentUser;
        const activeUserId = activeUser?.id;
        // Strictly filter to ensure only meetings created by this host are displayed
        const myHostMeetings = (response.data || []).filter((m: ScheduledMeeting) => {
          if (m.is_host === false) return false;
          if (activeUserId && (m as any).host?.id && (m as any).host?.id !== activeUserId) return false;
          if (activeUserId && (m as any).host_id && (m as any).host_id !== activeUserId) return false;
          return true;
        });
        setMeetings(myHostMeetings);
      }
    } catch (err) {
      console.log('API info: Scheduled meetings endpoint not found or server offline');
      setMeetings([]); // Set empty list on error instead of crashing
    }
  };

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
      const isGuest = await storage.getItem(StorageKeys.IS_GUEST);

      if (!token || isGuest === 'true') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
        return;
      }

      let parsedUser: any = null;
      const userData = await storage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        try {
          parsedUser = JSON.parse(userData);
          setCurrentUser(parsedUser);
        } catch (e) {}
      }

      setIsVerifiedHost(true);
      fetchMeetings(parsedUser);
    };

    checkAuthAndLoad();
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    setRefreshing(false);
  };

  const isMenuOpenRef = useRef(false);

  const openMenu = useCallback(() => {
    isMenuOpenRef.current = true;
    setIsMenuOpen(true);

    Animated.parallel([
      Animated.timing(rotation, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(menuAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [rotation, menuAnim]);

  const closeMenu = useCallback((instant = false) => {
    isMenuOpenRef.current = false;

    if (instant) {
      rotation.setValue(0);
      menuAnim.setValue(0);
      setIsMenuOpen(false);
      return;
    }

    Animated.parallel([
      Animated.timing(rotation, {
        toValue: 0,
        duration: 200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsMenuOpen(false);
      }
    });
  }, [rotation, menuAnim]);

  const toggleMenu = useCallback(() => {
    if (isMenuOpenRef.current) {
      closeMenu(false);
    } else {
      openMenu();
    }
  }, [openMenu, closeMenu]);

  // Clean up when screen loses focus (navigation to another screen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      closeMenu(true);
    });
    return unsubscribe;
  }, [navigation, closeMenu]);

  // Handle hardware back press on Android to smoothly close menu
  useEffect(() => {
    if (!isMenuOpen) return;
    const onBackPress = () => {
      closeMenu(false);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isMenuOpen, closeMenu]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
    extrapolate: 'clamp',
  });

  const menuTranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
    extrapolate: 'clamp',
  });

  const handleStartMeetingClick = () => {
    setMeetingTitle('Cloud News Meet');
    setShowCreateModal(true);
  };

  const handleCreateMeeting = async () => {
    setLoading(true);
    try {
      const data = await startNewMeeting(meetingTitle || 'Quick Meet');
      setCreatedRoomData(data);
      const code = data.meeting?.meeting_code || data.meeting_code;
      setGeneratedLink(getMeetingInviteLink(code));
      fetchMeetings(); // Refresh list after creation
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartPersonalRoom = async () => {
    if (isStartingPersonalRoom) return;
    setIsStartingPersonalRoom(true);
    try {
      const activeUser = user || currentUser;
      const hostName = activeUser?.name || 'Personal';
      const roomTitle = `${hostName}'s Meeting Room`;

      const data = await startNewMeeting(roomTitle, {
        meetingCode: personalRoomCode,
      });

      const meetingData = data.meeting || data;
      const roomName = meetingData.room_name || data.room_name || '';
      const token = data.livekit_token || data.token || '';
      const serverUrl = data.livekit_url || ENV.LIVEKIT_WS_URL;
      const code = meetingData.meeting_code || personalRoomCode;

      if (!roomName || !token) {
        throw new Error('Unable to generate room credentials');
      }

      startMeeting({
        roomName,
        token,
        serverUrl,
        displayName: activeUser?.name || 'Host',
        meetingCode: code,
        meetingTitle: meetingData.title || roomTitle,
        isHost: true,
      });
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to start personal room');
    } finally {
      setIsStartingPersonalRoom(false);
    }
  };

  const handleJoinCreatedMeeting = () => {
    if (createdRoomData) {
      setShowCreateModal(false);
      startMeeting({
        roomName: createdRoomData.meeting.room_name,
        token: createdRoomData.token,
        serverUrl: createdRoomData.livekit_url,
        displayName: user?.name || currentUser?.name || 'IA',
        meetingCode: createdRoomData.meeting.meeting_code,
        meetingTitle: createdRoomData.meeting.title || createdRoomData.meeting.meeting_code,
        isHost: true,
      });
    }
  };

  const handleJoinScheduled = (meeting: ScheduledMeeting) => {
    navigation.navigate('Join', { meetingCode: meeting.meeting_code });
  };

  const handleDeleteMeeting = (meeting: ScheduledMeeting) => {
    Alert.alert(
      t('home.deleteConfirmTitle'),
      `${t('home.deleteConfirmMsg')} "${meeting.title}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteMeeting(meeting.meeting_code);
              if (res.success) {
                fetchMeetings();
              }
            } catch (err) {
              Alert.alert(t('common.error'), 'Failed to delete meeting');
            }
          }
        }
      ]
    );
  };

  const getMeetingStatus = (meeting: ScheduledMeeting) => {
    if (meeting.status === 'expired') return { label: t('home.expired'), color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' };

    const now = new Date();
    const scheduledTime = meeting.scheduled_at ? new Date(meeting.scheduled_at) : now;
    const diff = (now.getTime() - scheduledTime.getTime()) / (1000 * 60); // minutes

    if (diff >= -30 && diff <= 1440) return { label: t('home.ongoing'), color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };

    return { label: t('home.upcoming'), color: '#00A8FF', bg: 'rgba(0, 168, 255, 0.1)' };
  };

  if (!isVerifiedHost) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Speed Dial Overlay */}
      {isMenuOpen && (
        <Pressable style={styles.overlay} onPress={() => closeMenu(false)} />
      )}

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
          <View style={[styles.avatar, !isDark && { borderColor: colors.border, borderWidth: 1 }]}>
            {user?.avatar || user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar || user.avatar_url }}
                style={styles.avatarImg}
              />
            ) : (
              <Text style={[styles.avatarText, getAvatarTextStyle(user?.name || currentUser?.name, 16)]}>
                {getInitials(user?.name || currentUser?.name, 'CN')}
              </Text>
            )}
          </View>
          <View style={[styles.onlineStatus, !isDark && { borderColor: colors.background }]} />
        </TouchableOpacity>

        <View
          style={[
            styles.searchBar,
            !isDark && {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Search color={isDark ? '#94a3b8' : colors.textSecondary} size={16} />
          <TextInput
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={isDark ? '#94a3b8' : colors.textMuted}
            style={[styles.searchInput, !isDark && { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.searchClearBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X color={isDark ? '#94a3b8' : colors.textSecondary} size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A8FF" />
        }
      >
        {searchQuery.trim().length > 0 ? (
          <View style={styles.searchResultsContainer}>
            {/* Search Header */}
            <View style={styles.searchResultsHeader}>
              <Text style={[styles.searchResultsTitle, !isDark && { color: colors.textPrimary }]}>
                {t('home.searchResults')} ({filteredMeetings.length + matchingContacts.length + (quickJoinTargetCode ? 1 : 0)})
              </Text>
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchBtn} activeOpacity={0.7}>
                <Text style={[styles.clearSearchText, !isDark && { color: colors.primary }]}>{t('home.clearSearch')}</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Join Card (If query looks like a meeting code/link) */}
            {quickJoinTargetCode && (
              <TouchableOpacity
                style={styles.searchQuickJoinCard}
                onPress={() => navigation.navigate('Join', { meetingCode: quickJoinTargetCode })}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isDark ? ['rgba(0, 168, 255, 0.25)', 'rgba(0, 102, 204, 0.15)'] : ['rgba(0, 140, 208, 0.2)', 'rgba(0, 102, 204, 0.1)']}
                  style={styles.searchQuickJoinGradient}
                >
                  <View style={styles.searchQuickJoinIcon}>
                    <Video color="#FFF" size={20} />
                  </View>
                  <View style={styles.searchQuickJoinTexts}>
                    <Text style={styles.searchQuickJoinBadge}>{t('home.quickJoinAction')}</Text>
                    <Text style={styles.searchQuickJoinCode}>{quickJoinTargetCode}</Text>
                    <Text style={[styles.searchQuickJoinSub, !isDark && { color: colors.textSecondary }]}>{t('join.enterMeeting')}</Text>
                  </View>
                  <View style={styles.quickJoinGoBtn}>
                    <Text style={styles.quickJoinGoText}>{t('home.go')}</Text>
                    <ChevronRight color="#FFF" size={14} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Matching Meetings */}
            {filteredMeetings.length > 0 && (
              <View style={styles.searchSection}>
                <View style={styles.searchSectionHeader}>
                  <Calendar color={colors.primary} size={16} />
                  <Text style={[styles.searchSectionTitle, !isDark && { color: colors.textSecondary }]}>
                    {t('home.searchMatchingMeetings')} ({filteredMeetings.length})
                  </Text>
                </View>

                {filteredMeetings.map((meeting) => {
                  const status = getMeetingStatus(meeting);
                  return (
                    <View key={meeting.id} style={[styles.agendaItem, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={[styles.agendaTimeBox, !isDark && { backgroundColor: colors.iconBoxBg, borderColor: 'rgba(0, 140, 208, 0.2)' }]}>
                        <Text style={[styles.agendaTime, !isDark && { color: colors.primary }]}>{new Date(meeting.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                        <Text style={[styles.agendaAmPm, !isDark && { color: colors.textSecondary }]}>{new Date(meeting.scheduled_at).getHours() >= 12 ? 'PM' : 'AM'}</Text>
                      </View>
                      <View style={styles.agendaContent}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.agendaTitle, !isDark && { color: colors.textPrimary }]} numberOfLines={1}>{meeting.title}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                          </View>
                        </View>
                        <View style={styles.agendaMeta}>
                          <View style={styles.metaCodeWrap}>
                            <Hash color={isDark ? '#64748b' : colors.textMuted} size={11} />
                            <Text style={[styles.agendaSub, !isDark && { color: colors.textSecondary }]}>{meeting.meeting_code}</Text>
                          </View>
                          {Boolean(meeting.passcode || meeting.requires_passcode) && (
                            <View style={styles.metaOptionBadge}>
                              <Lock color={colors.primary} size={10} />
                              <Text style={[styles.metaOptionBadgeText, !isDark && { color: colors.primary }]}>
                                {meeting.passcode ? `P: ${meeting.passcode}` : 'Pass'}
                              </Text>
                            </View>
                          )}
                          {Boolean(meeting.waiting_room) && (
                            <View style={[styles.metaOptionBadge, styles.metaOptionBadgeWaiting]}>
                              <Shield color="#10b981" size={10} />
                              <Text style={[styles.metaOptionBadgeText, { color: '#10b981' }]}>
                                Wait Room
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.agendaActions}>
                        {meeting.is_host && (
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteMeeting(meeting)}
                          >
                            <Trash2 color="#ef4444" size={18} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.joinBtnSmall, status.label === t('home.expired') && { opacity: 0.5 }]}
                          onPress={() => handleJoinScheduled(meeting)}
                          disabled={status.label === t('home.expired')}
                        >
                          <Text style={styles.joinBtnSmallText}>{t('home.join')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Matching Contacts */}
            {(matchingContacts.length > 0 || isSearchingContacts) && (
              <View style={styles.searchSection}>
                <View style={styles.searchSectionHeader}>
                  <Users color={colors.primary} size={16} />
                  <Text style={[styles.searchSectionTitle, !isDark && { color: colors.textSecondary }]}>
                    {t('home.searchMatchingContacts')} ({matchingContacts.length})
                  </Text>
                  {isSearchingContacts && (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                  )}
                </View>

                {matchingContacts.map(contact => (
                  <TouchableOpacity
                    key={contact.id}
                    style={[styles.contactItem, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => navigation.navigate('ChatDetail', { userId: contact.id, name: contact.name })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.contactAvatar}>
                      <Text style={[styles.contactAvatarText, getAvatarTextStyle(contact.name, 14)]}>
                        {getInitials(contact.name, 'CN')}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={[styles.contactName, !isDark && { color: colors.textPrimary }]}>{contact.name}</Text>
                      <Text style={[styles.contactEmail, !isDark && { color: colors.textSecondary }]}>{contact.email || `@${contact.username}`}</Text>
                    </View>
                    <View style={[styles.contactMsgBtn, !isDark && { backgroundColor: colors.iconBoxBg, borderColor: 'rgba(0, 140, 208, 0.2)' }]}>
                      <MessageSquare color={colors.primary} size={16} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* No Results Fallback */}
            {filteredMeetings.length === 0 && matchingContacts.length === 0 && !quickJoinTargetCode && !isSearchingContacts && (
              <View style={styles.searchEmptyCard}>
                <View style={[styles.searchEmptyIconBox, !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border }]}>
                  <Search color={isDark ? '#64748b' : colors.textMuted} size={28} />
                </View>
                <Text style={[styles.searchEmptyTitle, !isDark && { color: colors.textPrimary }]}>{t('home.noSearchResults')}</Text>
                <Text style={[styles.searchEmptySub, !isDark && { color: colors.primary }]}>
                  "{searchQuery}"
                </Text>
                <Text style={[styles.searchEmptyHint, !isDark && { color: colors.textSecondary }]}>{t('home.noSearchResultsHint')}</Text>
                <TouchableOpacity style={[styles.searchEmptyClearBtn, !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border }]} onPress={handleClearSearch} activeOpacity={0.7}>
                  <Text style={[styles.searchEmptyClearBtnText, !isDark && { color: colors.textPrimary }]}>{t('home.clearSearch')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCardLarge}
            onPress={handleStartMeetingClick}
          >
            <LinearGradient
              colors={isDark ? ['rgba(0, 168, 255, 0.2)', 'rgba(0, 102, 204, 0.2)'] : ['rgba(0, 140, 208, 0.15)', 'rgba(0, 102, 204, 0.08)']}
              style={[styles.quickCardGradient, !isDark && { borderColor: 'rgba(0, 140, 208, 0.3)' }]}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.primary }]}><Video color="#FFF" size={22} /></View>
              <Text style={[styles.quickText, !isDark && { color: colors.primary }]}>{t('home.startMeeting')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Join')}
          >
            <View style={[styles.iconBoxMuted, !isDark && { backgroundColor: colors.iconBoxBg }]}><Plus color={colors.primary} size={22} /></View>
            <Text style={[styles.quickTextMuted, !isDark && { color: colors.textPrimary }]}>{t('home.joinMeeting')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Schedule')}
          >
            <View style={[styles.iconBoxMuted, !isDark && { backgroundColor: colors.iconBoxBg }]}><CalendarPlus color="#10b981" size={22} /></View>
            <Text style={[styles.quickTextMuted, !isDark && { color: colors.textPrimary }]}>{t('home.schedule')}</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Room Link Card */}
        <View style={[styles.glassCard, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.headerIcon, !isDark && { backgroundColor: colors.iconBoxBg }]}><Link2 color={colors.primary} size={18} /></View>
              <View>
                <Text style={[styles.cardTitle, !isDark && { color: colors.textPrimary }]}>{t('home.personalRoomLink')}</Text>
                <Text style={[styles.cardSub, !isDark && { color: colors.textSecondary }]}>{t('home.fixedId')}</Text>
              </View>
            </View>
            <View style={styles.onlineBadge}><Text style={styles.onlineBadgeText}>{t('common.active')}</Text></View>
          </View>
          <TouchableOpacity
            style={[styles.urlBox, !isDark && { backgroundColor: colors.cardSubtle }]}
            onPress={() => copyToClipboard(personalRoomFullUrl)}
            activeOpacity={0.7}
          >
            <Text style={[styles.urlText, !isDark && { color: colors.primary }]} numberOfLines={1}>
              {personalRoomDisplayUrl}
            </Text>
            <TouchableOpacity onPress={() => copyToClipboard(personalRoomFullUrl)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {copied ? <Check color="#10b981" size={14} /> : <Copy color={isDark ? '#94a3b8' : colors.textSecondary} size={14} />}
            </TouchableOpacity>
          </TouchableOpacity>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border }]}
              onPress={() => copyToClipboard(personalRoomFullUrl)}
            >
              {copied ? <Check color="#10b981" size={16} /> : <Copy color={colors.primary} size={16} />}
              <Text style={[styles.secondaryBtnText, !isDark && { color: colors.textPrimary }]}>
                {copied ? t('common.copied') : t('home.copyLink')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtnSmall, isStartingPersonalRoom && { opacity: 0.8 }]}
              onPress={handleStartPersonalRoom}
              disabled={isStartingPersonalRoom}
            >
              {isStartingPersonalRoom ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Play color="#FFF" size={14} fill="#FFF" />
                  <Text style={styles.primaryBtnSmallText}>{t('home.startRoom')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.scheduleSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, !isDark && { color: colors.textSecondary }]}>{t('home.todaysSchedule')}</Text>
            <Text style={[styles.viewAll, !isDark && { color: colors.primary }]} onPress={() => navigation.navigate('Schedule')}>{t('home.viewAll')} ({meetings.length})</Text>
          </View>

          {meetings.length === 0 ? (
            <View style={styles.emptySchedule}>
                <Text style={[styles.emptyScheduleText, !isDark && { color: colors.textMuted }]}>{t('home.noMeetings')}</Text>
            </View>
          ) : (
            meetings.map((meeting) => {
              const status = getMeetingStatus(meeting);
              const meetingDate = meeting.scheduled_at ? new Date(meeting.scheduled_at) : new Date();
              return (
                <View key={meeting.id} style={[styles.agendaItem, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.agendaTimeBox, !isDark && { backgroundColor: colors.iconBoxBg, borderColor: 'rgba(0, 140, 208, 0.2)' }]}>
                    <Text style={[styles.agendaTime, !isDark && { color: colors.primary }]}>{meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                    <Text style={[styles.agendaAmPm, !isDark && { color: colors.textSecondary }]}>{meetingDate.getHours() >= 12 ? 'PM' : 'AM'}</Text>
                  </View>
                  <View style={styles.agendaContent}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.agendaTitle, !isDark && { color: colors.textPrimary }]} numberOfLines={1}>{meeting.title}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>
                    <View style={styles.agendaMeta}>
                      <View style={styles.metaCodeWrap}>
                        <Hash color={isDark ? '#64748b' : colors.textMuted} size={11} />
                        <Text style={[styles.agendaSub, !isDark && { color: colors.textSecondary }]}>{meeting.meeting_code}</Text>
                      </View>
                      {Boolean(meeting.passcode || meeting.requires_passcode) && (
                        <View style={styles.metaOptionBadge}>
                          <Lock color={colors.primary} size={10} />
                          <Text style={[styles.metaOptionBadgeText, !isDark && { color: colors.primary }]}>
                            {meeting.passcode ? `P: ${meeting.passcode}` : 'Pass'}
                          </Text>
                        </View>
                      )}
                      {Boolean(meeting.waiting_room) && (
                        <View style={[styles.metaOptionBadge, styles.metaOptionBadgeWaiting]}>
                          <Shield color="#10b981" size={10} />
                          <Text style={[styles.metaOptionBadgeText, { color: '#10b981' }]}>
                            Wait Room
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.agendaActions}>
                    {meeting.is_host && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteMeeting(meeting)}
                      >
                        <Trash2 color="#ef4444" size={18} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.joinBtnSmall, status.label === t('home.expired') && { opacity: 0.5 }]}
                      onPress={() => handleJoinScheduled(meeting)}
                      disabled={status.label === t('home.expired')}
                    >
                      <Text style={styles.joinBtnSmallText}>{t('home.join')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
        </>
      )}
      </ScrollView>

      {/* Create Meeting Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalOverlay, !isDark && { backgroundColor: colors.modalOverlay }]}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + 20 },
              !isDark && {
                backgroundColor: colors.modalBg,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.modalDragHandle, !isDark && { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, !isDark && { color: colors.textPrimary }]}>{t('home.createMeetingTitle')}</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X color={isDark ? '#94a3b8' : colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, !isDark && { color: colors.textSecondary }]}>{t('home.meetingTitlePlaceholder')}</Text>
              <View style={[styles.modalInputWrapper, !isDark && { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <TextInput
                  style={[styles.modalInput, !isDark && { color: colors.textPrimary }]}
                  value={meetingTitle}
                  onChangeText={setMeetingTitle}
                  placeholder={t('home.meetingTitlePlaceholder')}
                  placeholderTextColor={isDark ? '#64748b' : colors.textMuted}
                />
              </View>

              {!generatedLink ? (
                <TouchableOpacity
                  style={[
                    styles.generateBtn,
                    !isDark && {
                      backgroundColor: colors.iconBoxBg,
                      borderColor: 'rgba(0, 140, 208, 0.3)',
                    },
                  ]}
                  onPress={handleCreateMeeting}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <LinkIcon color={colors.primary} size={18} />
                      <Text style={[styles.generateBtnText, !isDark && { color: colors.primary }]}>{t('home.createAndJoin')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.linkResultBox}>
                  <Text style={styles.linkResultLabel}>{copied ? t('common.linkCopied') : t('home.personalRoomLink')}</Text>
                  <View style={[styles.linkDisplay, !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border }, copied && { borderColor: '#10b981' }]}>
                    <Text style={[styles.linkText, !isDark && { color: colors.primary }]} numberOfLines={1}>{generatedLink}</Text>
                    <TouchableOpacity onPress={() => copyToClipboard(generatedLink)}>
                      {copied ? <Check color="#10b981" size={18} /> : <Copy color={colors.primary} size={18} />}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.modalJoinBtn} onPress={handleJoinCreatedMeeting}>
                    <Video color="#FFF" size={20} />
                    <Text style={styles.modalJoinBtnText}>{t('join.enterMeeting')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Speed Dial Menu Items */}
      {isMenuOpen && (
        <Animated.View style={[styles.menuContainer, { bottom: insets.bottom + 165, opacity: menuAnim, transform: [{ translateY: menuTranslateY }] }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(true); navigation.navigate('Profile'); }}>
            <View style={[styles.menuLabelWrapper, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
               <Text style={[styles.menuText, !isDark && { color: colors.textPrimary }]}>{t('home.personalRoomLink')}</Text>
            </View>
            <View style={[styles.menuIconBox, !isDark && { backgroundColor: colors.cardSubtle }]}><Home color={isDark ? '#050B14' : colors.textPrimary} size={22} strokeWidth={2.2} /></View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(true); navigation.navigate('Schedule'); }}>
            <View style={[styles.menuLabelWrapper, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
               <Text style={[styles.menuText, !isDark && { color: colors.textPrimary }]}>{t('home.schedule')}</Text>
            </View>
            <View style={[styles.menuIconBox, !isDark && { backgroundColor: colors.cardSubtle }]}><CalendarPlus color={isDark ? '#050B14' : colors.textPrimary} size={22} strokeWidth={2.2} /></View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(true); navigation.navigate('Join'); }}>
            <View style={[styles.menuLabelWrapper, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
               <Text style={[styles.menuText, !isDark && { color: colors.textPrimary }]}>{t('home.joinMeeting')}</Text>
            </View>
            <View style={[styles.menuIconBox, !isDark && { backgroundColor: colors.cardSubtle }]}><LogIn color={isDark ? '#050B14' : colors.textPrimary} size={22} strokeWidth={2.2} /></View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: insets.bottom + 100 },
          !isDark && { backgroundColor: colors.primary, shadowColor: colors.primary },
        ]}
        onPress={toggleMenu}
        activeOpacity={0.9}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Plus color={isDark ? '#050B14' : '#FFFFFF'} size={28} strokeWidth={2.5} />
        </Animated.View>
      </TouchableOpacity>

      {/* Navigation Dock */}
      <View
        style={[
          styles.navDock,
          { marginBottom: insets.bottom + 10 },
          !isDark && {
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        <TouchableOpacity style={styles.navItem}><LayoutGrid color={colors.primary} size={22} /><Text style={[styles.navTextActive, !isDark && { color: colors.primary }]}>{t('nav.home')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Messages')}><MessageSquare color={isDark ? '#94a3b8' : colors.textSecondary} size={22} /><Text style={[styles.navText, !isDark && { color: colors.textSecondary }]}>{t('nav.messages')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Schedule')}><Calendar color={isDark ? '#94a3b8' : colors.textSecondary} size={22} /><Text style={[styles.navText, !isDark && { color: colors.textSecondary }]}>{t('nav.schedule')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}><User color={isDark ? '#94a3b8' : colors.textSecondary} size={22} /><Text style={[styles.navText, !isDark && { color: colors.textSecondary }]}>{t('nav.profile')}</Text></TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050B14' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 30 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 10, gap: 12 },
  profileBtn: { position: 'relative' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#525A6B', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 19 },
  avatarText: { color: '#FFF', fontSize: 14, fontFamily: 'PlusJakartaSans-Bold' },
  onlineStatus: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#050B14' },
  searchBar: { flex: 1, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.07)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', gap: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', padding: 0 },
  searchClearBtn: { padding: 4 },
  searchResultsContainer: { gap: 18 },
  searchResultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  searchResultsTitle: { color: '#FFF', fontSize: 15, fontFamily: 'PlusJakartaSans-Bold' },
  clearSearchBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  clearSearchText: { color: '#94a3b8', fontSize: 11, fontFamily: 'PlusJakartaSans-Medium' },

  searchQuickJoinCard: { borderRadius: 18, overflow: 'hidden', marginBottom: 8 },
  searchQuickJoinGradient: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: 'rgba(0, 168, 255, 0.35)', borderRadius: 18, gap: 12 },
  searchQuickJoinIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#00A8FF', alignItems: 'center', justifyContent: 'center' },
  searchQuickJoinTexts: { flex: 1 },
  searchQuickJoinBadge: { color: '#00A8FF', fontSize: 10, fontFamily: 'PlusJakartaSans-Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  searchQuickJoinCode: { color: '#FFF', fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', marginTop: 1 },
  searchQuickJoinSub: { color: '#94a3b8', fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', marginTop: 1 },
  quickJoinGoBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00A8FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 2 },
  quickJoinGoText: { color: '#FFF', fontSize: 11, fontFamily: 'PlusJakartaSans-Bold' },

  searchSection: { gap: 10 },
  searchSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  searchSectionTitle: { color: '#94a3b8', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', letterSpacing: 0.5 },

  contactItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 27, 48, 0.72)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', gap: 12 },
  contactAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0, 168, 255, 0.18)', borderWidth: 1, borderColor: 'rgba(0, 168, 255, 0.35)', alignItems: 'center', justifyContent: 'center' },
  contactAvatarText: { color: '#38BDF8', fontSize: 13, fontFamily: 'PlusJakartaSans-Bold' },
  contactInfo: { flex: 1 },
  contactName: { color: '#FFF', fontSize: 13, fontFamily: 'PlusJakartaSans-Bold' },
  contactEmail: { color: '#64748b', fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', marginTop: 1 },
  contactMsgBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(0, 168, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(0, 168, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },

  searchEmptyCard: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 8 },
  searchEmptyIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  searchEmptyTitle: { color: '#FFF', fontSize: 15, fontFamily: 'PlusJakartaSans-Bold' },
  searchEmptySub: { color: '#00A8FF', fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', textAlign: 'center' },
  searchEmptyHint: { color: '#64748b', fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', textAlign: 'center', maxWidth: 260, marginTop: 2 },
  searchEmptyClearBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' },
  searchEmptyClearBtnText: { color: '#FFF', fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 150 },
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickCardLarge: { flex: 1, height: 110, borderRadius: 20, overflow: 'hidden' },
  quickCardGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0, 168, 255, 0.3)' },
  quickCard: { flex: 1, height: 110, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconBoxMuted: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center' },
  quickText: { color: '#FFF', fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', marginTop: 10 },
  quickTextMuted: { color: '#FFF', fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', marginTop: 10, textAlign: 'center' },
  glassCard: { backgroundColor: 'rgba(15, 27, 48, 0.72)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', marginBottom: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', gap: 10 },
  headerIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0, 168, 255, 0.15)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#FFF', fontSize: 13, fontFamily: 'PlusJakartaSans-Bold' },
  cardSub: { color: '#94a3b8', fontSize: 10, fontFamily: 'PlusJakartaSans-Medium' },
  onlineBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  onlineBadgeText: { color: '#10b981', fontSize: 10, fontFamily: 'PlusJakartaSans-Bold' },
  urlBox: { flexDirection: 'row', backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: 10, borderRadius: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  urlText: { color: '#00A8FF', fontSize: 11, fontFamily: 'monospace' },
  cardActions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { flex: 1, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  secondaryBtnText: { color: '#e2e8f0', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold' },
  primaryBtnSmall: { flex: 1, height: 40, backgroundColor: '#00A8FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  primaryBtnSmallText: { color: '#FFF', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold' },
  scheduleSection: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  sectionTitle: { color: '#94a3b8', fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', letterSpacing: 1 },
  viewAll: { color: '#00A8FF', fontSize: 10, fontFamily: 'PlusJakartaSans-Bold' },
  agendaItem: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', gap: 14 },
  agendaTimeBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0, 168, 255, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0, 168, 255, 0.2)' },
  agendaTime: { color: '#00A8FF', fontSize: 11, fontFamily: 'PlusJakartaSans-Bold' },
  agendaAmPm: { color: '#64748b', fontSize: 8, fontFamily: 'PlusJakartaSans-Bold' },
  agendaContent: { flex: 1 },
  agendaTitle: { color: '#FFF', fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', maxWidth: '70%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 8, fontFamily: 'PlusJakartaSans-Bold', textTransform: 'uppercase' },
  agendaMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  metaCodeWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaOptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.2)',
  },
  metaOptionBadgeWaiting: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  metaOptionBadgeText: {
    color: '#00A8FF',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  agendaSub: { color: '#64748b', fontSize: 10, fontFamily: 'PlusJakartaSans-Medium' },
  agendaActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },
  joinBtnSmall: { backgroundColor: '#00A8FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  joinBtnSmallText: { color: '#FFF', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold' },
  emptySchedule: { alignItems: 'center', paddingVertical: 20 },
  emptyScheduleText: { color: '#64748b', fontSize: 12, fontFamily: 'PlusJakartaSans-Medium' },
  fab: { position: 'absolute', right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 10, zIndex: 40 },
  menuContainer: { position: 'absolute', right: 22, gap: 14, alignItems: 'flex-end', zIndex: 40 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabelWrapper: { backgroundColor: 'rgba(15, 27, 48, 0.85)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  menuText: { color: '#FFF', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold' },
  menuIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  navDock: { position: 'absolute', bottom: 10, left: 20, right: 20, height: 70, backgroundColor: 'rgba(12, 22, 38, 0.85)', borderRadius: 35, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', zIndex: 20 },
  navItem: { alignItems: 'center', gap: 4 },
  navText: { color: '#94a3b8', fontSize: 10, fontFamily: 'PlusJakartaSans-Medium' },
  navTextActive: { color: '#00A8FF', fontSize: 10, fontFamily: 'PlusJakartaSans-Bold' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0B1728', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  modalDragHandle: { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#FFF', fontSize: 20, fontFamily: 'PlusJakartaSans-Bold' },
  modalBody: { gap: 16 },
  modalLabel: { color: '#94a3b8', fontSize: 13, fontFamily: 'PlusJakartaSans-Bold' },
  modalInputWrapper: { height: 56, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 16, justifyContent: 'center' },
  modalInput: { color: '#FFF', fontSize: 15, fontFamily: 'PlusJakartaSans-Medium' },
  generateBtn: { height: 56, backgroundColor: 'rgba(0, 168, 255, 0.1)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(0, 168, 255, 0.3)' },
  generateBtnText: { color: '#00A8FF', fontSize: 15, fontFamily: 'PlusJakartaSans-Bold' },
  linkResultBox: { gap: 16, marginTop: 8 },
  linkResultLabel: { color: '#10b981', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', textAlign: 'center' },
  linkDisplay: { height: 50, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  linkText: { color: '#00A8FF', fontSize: 13, fontFamily: 'monospace', flex: 1, marginRight: 10 },
  modalJoinBtn: { height: 58, backgroundColor: '#00A8FF', borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#00A8FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  modalJoinBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'PlusJakartaSans-Bold' },
});

export default HomeScreen;
