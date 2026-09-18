import {
  Check,
  Cpu,
  Lock,
  Mic,
  Monitor,
  Radio,
  Sliders,
  Sparkles,
  Tv,
  Video,
  X,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';
import storage, {
  DEFAULT_MEETING_SETTINGS,
  MeetingSettings,
  StorageKeys,
} from '../../services/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GeneralSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  isHost?: boolean;
}

export const GeneralSettingsSheet: React.FC<GeneralSettingsSheetProps> = ({
  visible,
  onClose,
  isHost = false,
}) => {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { t } = useTranslation();

  const [settings, setSettings] = useState<MeetingSettings>(DEFAULT_MEETING_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const raw = await storage.getItem(StorageKeys.MEETING_SETTINGS);
        if (raw) {
          const parsed = JSON.parse(raw);
          setSettings({ ...DEFAULT_MEETING_SETTINGS, ...parsed });
        }
      } catch (e) {
        console.warn('Error loading meeting settings:', e);
      }
    };
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const updateSetting = async <K extends keyof MeetingSettings>(
    key: K,
    value: MeetingSettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await storage.setItem(StorageKeys.MEETING_SETTINGS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving meeting settings:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
          !isDark && { backgroundColor: colors.modalOverlay },
        ]}
      >
        <TouchableOpacity
          style={[styles.dismissArea, { width: SCREEN_WIDTH }]}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            {
              width: SCREEN_WIDTH,
              height: Math.round(SCREEN_HEIGHT * 0.82),
              paddingBottom: Math.max(insets.bottom, 16),
            },
            !isDark && {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={[styles.dragHandle, !isDark && { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.header, !isDark && { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBox, !isDark && { backgroundColor: colors.iconBoxBg }]}>
                <Sliders color={colors.primary} size={18} />
              </View>
              <View>
                <Text style={[styles.headerTitle, !isDark && { color: colors.textPrimary }]}>
                  {t('profile.generalSettings') || 'General Settings'}
                </Text>
                <Text style={[styles.headerSubtitle, !isDark && { color: colors.textMuted }]}>
                  Stream Quality & Performance
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X color={isDark ? '#94a3b8' : colors.textSecondary} size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1: Video Quality */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Video color={colors.primary} size={16} />
                <Text style={[styles.sectionTitle, !isDark && { color: colors.textSecondary }]}>
                  VIDEO RESOLUTION
                </Text>
              </View>

              {/* 1080p (Default) */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border },
                  settings.videoQuality === '1080p' && {
                    borderColor: colors.primary,
                    backgroundColor: isDark ? 'rgba(0, 168, 255, 0.08)' : 'rgba(0, 140, 208, 0.06)',
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => updateSetting('videoQuality', '1080p')}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.optionTitleRow}>
                    <Text style={[styles.optionTitle, !isDark && { color: colors.textPrimary }]}>
                      1080p Full HD
                    </Text>
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                    </View>
                  </View>
                  <Text style={[styles.optionDesc, !isDark && { color: colors.textMuted }]}>
                    1920 × 1080 @ 30fps • 3.5 Mbps • Recommended
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    settings.videoQuality === '1080p' && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  {settings.videoQuality === '1080p' && <Check color="#FFF" size={12} />}
                </View>
              </TouchableOpacity>

              {/* 4K Ultra HD (Host Only) */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border },
                  !isHost && { opacity: 0.6 },
                  settings.videoQuality === '4k' && {
                    borderColor: '#10B981',
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)',
                  },
                ]}
                activeOpacity={isHost ? 0.7 : 1}
                onPress={() => {
                  if (isHost) {
                    updateSetting('videoQuality', '4k');
                  }
                }}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.optionTitleRow}>
                    <Text style={[styles.optionTitle, !isDark && { color: colors.textPrimary }]}>
                      4K Ultra HD
                    </Text>
                    <View
                      style={[
                        styles.hostBadge,
                        !isHost && styles.hostLockedBadge,
                      ]}
                    >
                      {!isHost && <Lock color="#94a3b8" size={10} style={{ marginRight: 3 }} />}
                      <Text
                        style={[
                          styles.hostBadgeText,
                          !isHost && { color: '#94a3b8' },
                        ]}
                      >
                        {isHost ? 'HOST ACTIVE' : 'HOST ONLY'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.optionDesc, !isDark && { color: colors.textMuted }]}>
                    3840 × 2160 @ 30fps • 12 Mbps • Broadcast Studio
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    settings.videoQuality === '4k' && {
                      borderColor: '#10B981',
                      backgroundColor: '#10B981',
                    },
                  ]}
                >
                  {settings.videoQuality === '4k' && <Check color="#FFF" size={12} />}
                </View>
              </TouchableOpacity>

              {/* 720p HD (Data Saver) */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border },
                  settings.videoQuality === '720p' && {
                    borderColor: colors.primary,
                    backgroundColor: isDark ? 'rgba(0, 168, 255, 0.08)' : 'rgba(0, 140, 208, 0.06)',
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => updateSetting('videoQuality', '720p')}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.optionTitleRow}>
                    <Text style={[styles.optionTitle, !isDark && { color: colors.textPrimary }]}>
                      720p HD (Data Saver)
                    </Text>
                  </View>
                  <Text style={[styles.optionDesc, !isDark && { color: colors.textMuted }]}>
                    1280 × 720 @ 30fps • 1.5 Mbps • Optimized for Low Bandwidth
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    settings.videoQuality === '720p' && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  {settings.videoQuality === '720p' && <Check color="#FFF" size={12} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Section 2: Frame Rate (FPS) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Zap color={colors.primary} size={16} />
                <Text style={[styles.sectionTitle, !isDark && { color: colors.textSecondary }]}>
                  FRAME RATE
                </Text>
              </View>

              <View style={styles.pillsRow}>
                <TouchableOpacity
                  style={[
                    styles.pillBtn,
                    !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border },
                    settings.frameRate === 30 && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => updateSetting('frameRate', 30)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pillBtnText,
                      !isDark && { color: colors.textPrimary },
                      settings.frameRate === 30 && { color: '#FFFFFF' },
                    ]}
                  >
                    30 FPS (Standard & Cool)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.pillBtn,
                    !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border },
                    settings.frameRate === 60 && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => updateSetting('frameRate', 60)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pillBtnText,
                      !isDark && { color: colors.textPrimary },
                      settings.frameRate === 60 && { color: '#FFFFFF' },
                    ]}
                  >
                    60 FPS (Ultra Smooth)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 3: Audio & Voice Clarity */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Mic color={colors.primary} size={16} />
                <Text style={[styles.sectionTitle, !isDark && { color: colors.textSecondary }]}>
                  VOICE & AUDIO ENHANCEMENT
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border },
                  settings.audioMode === 'voice_clarity' && {
                    borderColor: colors.primary,
                    backgroundColor: isDark ? 'rgba(0, 168, 255, 0.08)' : 'rgba(0, 140, 208, 0.06)',
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => updateSetting('audioMode', 'voice_clarity')}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.optionTitleRow}>
                    <Text style={[styles.optionTitle, !isDark && { color: colors.textPrimary }]}>
                      Crystal Clear Voice (Opus FEC + RED)
                    </Text>
                  </View>
                  <Text style={[styles.optionDesc, !isDark && { color: colors.textMuted }]}>
                    Hardware Echo Cancellation, Noise Suppression & Cross-Border Packet Loss Immunity
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    settings.audioMode === 'voice_clarity' && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  {settings.audioMode === 'voice_clarity' && <Check color="#FFF" size={12} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Section 4: Screen Sharing Optimization */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Monitor color={colors.primary} size={16} />
                <Text style={[styles.sectionTitle, !isDark && { color: colors.textSecondary }]}>
                  SCREEN SHARING CLARITY
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border },
                  settings.screenShareClarity === 'detail' && {
                    borderColor: colors.primary,
                    backgroundColor: isDark ? 'rgba(0, 168, 255, 0.08)' : 'rgba(0, 140, 208, 0.06)',
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => updateSetting('screenShareClarity', 'detail')}
              >
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionTitle, !isDark && { color: colors.textPrimary }]}>
                    Text & Presentation Clarity (6 Mbps)
                  </Text>
                  <Text style={[styles.optionDesc, !isDark && { color: colors.textMuted }]}>
                    Prioritizes pin-sharp text, code, and slide diagrams without blurring
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    settings.screenShareClarity === 'detail' && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  {settings.screenShareClarity === 'detail' && <Check color="#FFF" size={12} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Section 5: Hardware Acceleration Status */}
            <View
              style={[
                styles.hwBox,
                !isDark && { backgroundColor: colors.cardSubtle, borderColor: colors.border },
              ]}
            >
              <View style={styles.hwIconWrap}>
                <Cpu color="#10B981" size={20} />
              </View>
              <View style={styles.hwTexts}>
                <Text style={[styles.hwTitle, !isDark && { color: colors.textPrimary }]}>
                  H.264 Hardware Codec Active
                </Text>
                <Text style={[styles.hwSub, !isDark && { color: colors.textMuted }]}>
                  Mobile silicon GPU acceleration enabled for battery efficiency & low heat
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#0B1728',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    alignSelf: 'stretch',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scroll: {
    flex: 1,
    width: '100%',
    marginTop: 6,
  },
  scrollContent: {
    paddingBottom: 48,
    gap: 20,
    paddingTop: 10,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  optionLeft: {
    flex: 1,
    gap: 4,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  defaultBadge: {
    backgroundColor: 'rgba(0, 168, 255, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#00A8FF',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.5,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hostLockedBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  hostBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.5,
  },
  optionDesc: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  hwBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    gap: 12,
    marginTop: 4,
  },
  hwIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hwTexts: {
    flex: 1,
    gap: 2,
  },
  hwTitle: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  hwSub: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 14,
  },
});

export default GeneralSettingsSheet;
