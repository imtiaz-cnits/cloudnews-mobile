import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Camera,
  Pencil,
  X,
  Check,
  LogOut,
  Settings,
  ShieldCheck,
  Info,
  ClipboardList,
  Globe,
  Moon,
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import ThemeSwitcher from '../components/common/ThemeSwitcher';
import GeneralSettingsSheet from '../components/modals/GeneralSettingsSheet';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackNavigationProp } from '../navigation/types';
import storage, { StorageKeys } from '../services/storage';
import { validateFileSize } from '../utils/fileValidation';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { getInitials, getAvatarTextStyle } from '../utils/helpers';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Profile'>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, updateUser, logout } = useUser();
  const { isDark, colors } = useTheme();

  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isGeneralSettingsVisible, setIsGeneralSettingsVisible] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
      const isGuest = await storage.getItem(StorageKeys.IS_GUEST);
      if (!token || isGuest === 'true') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    };
    checkAuth();
  }, [navigation]);

  const handlePickProfileImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileSize = file.size || 0;
        const validation = validateFileSize(fileSize);

        // 5MB limit check
        if (!validation.isValid) {
          Alert.alert(
            t('profile.fileTooLargeTitle'),
            `${t('profile.fileTooLargeDesc')}\n\n(${validation.sizeFormatted} > 5 MB)`
          );
          return;
        }

        setIsUploadingPhoto(true);
        await updateUser({
          avatar: file.uri,
          avatar_url: file.uri,
        });
        Alert.alert(t('common.success') || 'Success', t('profile.photoUpdated'));
      }
    } catch (err) {
      console.warn('[ProfileScreen] Error picking profile photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert('Required', t('profile.nameRequired'));
      return;
    }

    try {
      setIsSavingName(true);
      await updateUser({ name: trimmed });
      setIsEditNameModalVisible(false);
      Alert.alert(t('common.success') || 'Success', t('profile.nameUpdated'));
    } catch (e) {
      Alert.alert('Error', 'Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profile.signOut'), t('profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.signOut'),
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (e) {
            console.warn('[Profile] Logout error:', e);
          }
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        },
      },
    ]);
  };

  const ProfileItem = ({
    icon: Icon,
    title,
    subtitle,
    color = '#94a3b8',
    onPress,
    rightComponent,
  }: any) => (
    <TouchableOpacity
      style={[
        styles.profileItem,
        !isDark && {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={rightComponent ? 1 : 0.7}
      disabled={!onPress && Boolean(rightComponent)}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
          <Icon color={color} size={20} />
        </View>
        <View style={{ flex: rightComponent ? 1 : undefined }}>
          <Text style={[styles.itemTitle, !isDark && { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.itemSub, !isDark && { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Header: Edit button removed from top right */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            !isDark && { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <ChevronLeft color={isDark ? '#94a3b8' : colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, !isDark && { color: colors.textPrimary }]}>
          {t('profile.title')}
        </Text>
        {/* Spacer to keep title centered */}
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            !isDark && {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Avatar with Camera upload button directly on it */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              style={styles.avatar}
              onPress={handlePickProfileImage}
              activeOpacity={0.8}
            >
              {user?.avatar || user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar || user.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={[styles.avatarText, getAvatarTextStyle(user?.name, 32)]}>
                  {getInitials(user?.name, 'IA')}
                </Text>
              )}
              {isUploadingPhoto && (
                <View style={styles.avatarUploadingOverlay}>
                  <ActivityIndicator color="#00A8FF" size="small" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cameraBadgeBtn,
                !isDark && { borderColor: colors.card },
              ]}
              onPress={handlePickProfileImage}
              activeOpacity={0.8}
            >
              <Camera color="#FFFFFF" size={14} />
            </TouchableOpacity>

            <View style={[styles.onlineStatus, !isDark && { borderColor: colors.card }]} />
          </View>

          {/* Name Row with Edit button right next to name */}
          <View style={styles.nameRow}>
            <Text style={[styles.profileName, !isDark && { color: colors.textPrimary }]}>
              {user?.name || 'Imtiaz Ahmed'}
            </Text>
            <TouchableOpacity
              style={styles.nameEditBtn}
              onPress={() => {
                setNameInput(user?.name || '');
                setIsEditNameModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Pencil color="#00A8FF" size={15} />
            </TouchableOpacity>
          </View>

          {/* Host Account Badge */}
          <View style={styles.badgeRow}>
            <View style={styles.hostBadge}>
              <ShieldCheck color="#10b981" size={12} />
              <Text style={styles.hostBadgeText}>{t('profile.hostAccount')}</Text>
            </View>
          </View>

          {/* Strictly Read-Only Username (Not editable) */}
          <View
            style={[
              styles.usernameContainer,
              !isDark && { backgroundColor: colors.cardSubtle },
            ]}
          >
            <Text style={[styles.profileUsername, !isDark && { color: colors.textSecondary }]}>
              @{user?.username || 'imtiaz-cnits'}
            </Text>
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, !isDark && { color: colors.textMuted }]}>
            {t('profile.appSettings')}
          </Text>

          {/* Language Switcher Row */}
          <ProfileItem
            icon={Globe}
            title={t('profile.language')}
            subtitle={t('profile.languageSubtitle')}
            color="#00A8FF"
            rightComponent={<LanguageSwitcher compact />}
          />

          {/* Theme Switcher Row (implemented right after Language) */}
          <ProfileItem
            icon={Moon}
            title={t('profile.theme')}
            subtitle={t('profile.themeSubtitle')}
            color="#00A8FF"
            rightComponent={<ThemeSwitcher compact />}
          />

          <ProfileItem
            icon={Settings}
            title={t('profile.generalSettings')}
            subtitle="1080p Full HD • Voice Clarity"
            color="#00A8FF"
            onPress={() => setIsGeneralSettingsVisible(true)}
          />
          <ProfileItem icon={Info} title={t('profile.about')} subtitle={t('profile.version')} />
          <ProfileItem icon={ClipboardList} title={t('profile.reportIssue')} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.logoutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={isEditNameModalVisible} transparent animationType="fade">
        <View style={[styles.modalBackdrop, !isDark && { backgroundColor: colors.modalOverlay }]}>
          <View
            style={[
              styles.editModalCard,
              { paddingBottom: insets.bottom + 20 },
              !isDark && {
                backgroundColor: colors.modalBg,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, !isDark && { color: colors.textPrimary }]}>
                {t('profile.editName')}
              </Text>
              <TouchableOpacity
                onPress={() => setIsEditNameModalVisible(false)}
                style={styles.editModalClose}
              >
                <X color={isDark ? '#94a3b8' : colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.editModalLabel, !isDark && { color: colors.textSecondary }]}>
              {t('profile.enterName')}
            </Text>
            <TextInput
              style={[
                styles.editModalInput,
                !isDark && {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="e.g. Imtiaz Ahmed"
              placeholderTextColor={isDark ? '#64748b' : colors.textMuted}
              autoFocus
              maxLength={60}
            />

            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={[
                  styles.editModalCancelBtn,
                  !isDark && { backgroundColor: colors.cardSubtle },
                ]}
                onPress={() => setIsEditNameModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.editModalCancelText,
                    !isDark && { color: colors.textSecondary },
                  ]}
                >
                  {t('profile.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editModalSaveBtn}
                onPress={handleSaveName}
                disabled={isSavingName}
                activeOpacity={0.7}
              >
                {isSavingName ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Check color="#FFFFFF" size={16} style={{ marginRight: 6 }} />
                    <Text style={styles.editModalSaveText}>{t('profile.save')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* General Settings Sheet for HD/4K Video & Voice Tuning */}
      <GeneralSettingsSheet
        visible={isGeneralSettingsVisible}
        onClose={() => setIsGeneralSettingsVisible(false)}
        isHost={user?.is_host ?? true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(15, 27, 48, 0.4)',
    borderRadius: 24,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#525A6B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0, 168, 255, 0.4)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
  },
  cameraBadgeBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00A8FF',
    borderWidth: 2.5,
    borderColor: '#0B1728',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  onlineStatus: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    borderWidth: 3,
    borderColor: '#0B1728',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  profileName: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  nameEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 8,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  hostBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  usernameContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  profileUsername: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  section: {
    marginTop: 30,
    gap: 12,
  },
  sectionLabel: {
    color: '#475569',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 1.5,
    marginLeft: 4,
    marginBottom: 4,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginRight: 10,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  itemSub: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 18,
    marginTop: 40,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  editModalCard: {
    backgroundColor: '#0B1728',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editModalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  editModalClose: {
    padding: 4,
  },
  editModalLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    marginBottom: 8,
  },
  editModalInput: {
    backgroundColor: '#050B14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    marginBottom: 20,
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalCancelText: {
    color: '#94a3b8',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  editModalSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00A8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
});

export default ProfileScreen;
