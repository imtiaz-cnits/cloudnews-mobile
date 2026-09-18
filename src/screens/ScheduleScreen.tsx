import { useNavigation } from '@react-navigation/native';
import {
  Calendar,
  Check,
  CheckCircle,
  ChevronLeft,
  Clock,
  Copy,
  Lock,
  RefreshCw,
  Shield,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GradientButton from '../components/common/GradientButton';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../context/ThemeContext';
import { RootStackNavigationProp } from '../navigation/types';
import { scheduleMeeting } from '../services/api';
import storage, { StorageKeys } from '../services/storage';

export const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Schedule'>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark, colors } = useTheme();

  const [topic, setTopic] = useState('Cloud News Meeting');
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    if (d.getMinutes() > 30) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
    } else {
      d.setMinutes(30, 0, 0);
    }
    return d;
  });

  const [requirePasscode, setRequirePasscode] = useState(true);
  const [passcode, setPasscode] = useState(() =>
    Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [copiedPasscode, setCopiedPasscode] = useState(false);
  const [enableWaitingRoom, setEnableWaitingRoom] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fallback / iOS picker modal state
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [tempPickerDate, setTempPickerDate] = useState<Date>(scheduledDate);

  React.useEffect(() => {
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

  const formatDateDisplay = (dateObj: Date): { main: string; sub: string } => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const main = `${year}-${month}-${day}`;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let sub = '';
    if (diffDays === 0) {
      sub = 'Today';
    } else if (diffDays === 1) {
      sub = 'Tomorrow';
    } else {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      sub = days[dateObj.getDay()];
    }

    return { main, sub };
  };

  const formatTimeDisplay = (dateObj: Date): { main: string; sub: string } => {
    const hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const hours24 = String(hours).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;

    return {
      main: `${hours24}:${minutes}`,
      sub: `${hours12}:${minutes} ${ampm}`,
    };
  };

  const handleOpenDatePicker = () => {
    if (Platform.OS === 'android') {
      try {
        DateTimePickerAndroid.open({
          value: scheduledDate,
          mode: 'date',
          minimumDate: new Date(),
          onChange: (event: DateTimePickerEvent, selected?: Date) => {
            if (event.type === 'set' && selected) {
              const updated = new Date(scheduledDate);
              updated.setFullYear(
                selected.getFullYear(),
                selected.getMonth(),
                selected.getDate()
              );
              setScheduledDate(updated);
            }
          },
        });
        return;
      } catch (e) {
        console.warn('Native date picker error, using modal fallback:', e);
      }
    }
    setTempPickerDate(new Date(scheduledDate));
    setPickerMode('date');
  };

  const handleOpenTimePicker = () => {
    if (Platform.OS === 'android') {
      try {
        DateTimePickerAndroid.open({
          value: scheduledDate,
          mode: 'time',
          is24Hour: true,
          onChange: (event: DateTimePickerEvent, selected?: Date) => {
            if (event.type === 'set' && selected) {
              const updated = new Date(scheduledDate);
              updated.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
              setScheduledDate(updated);
            }
          },
        });
        return;
      } catch (e) {
        console.warn('Native time picker error, using modal fallback:', e);
      }
    }
    setTempPickerDate(new Date(scheduledDate));
    setPickerMode('time');
  };

  const handleRegeneratePasscode = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setPasscode(newCode);
    setCopiedPasscode(false);
  };

  const handleCopyPasscode = async () => {
    if (!passcode) return;
    await Clipboard.setStringAsync(passcode);
    setCopiedPasscode(true);
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  const handleSave = async () => {
    if (!topic.trim()) {
      Alert.alert(t('common.error'), t('schedule.topicPlaceholder'));
      return;
    }

    const now = new Date();
    if (scheduledDate.getTime() <= now.getTime() + 60 * 1000) {
      Alert.alert(t('common.error'), t('schedule.futureTimeError'));
      return;
    }

    if (requirePasscode) {
      const cleanPass = passcode.trim();
      if (!cleanPass || cleanPass.length < 4 || cleanPass.length > 16) {
        Alert.alert(t('common.error'), t('schedule.passcodeLengthError'));
        return;
      }
    }

    setLoading(true);
    try {
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      const hours = String(scheduledDate.getHours()).padStart(2, '0');
      const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
      const startTime = `${year}-${month}-${day} ${hours}:${minutes}:00`;

      const response = await scheduleMeeting({
        title: topic.trim(),
        scheduled_at: startTime,
        passcode: requirePasscode ? passcode.trim() : undefined,
        waiting_room: enableWaitingRoom,
      });

      if (response.success && response.data) {
        const meeting = response.data;
        const passMsg = requirePasscode ? `\nPasscode: ${passcode.trim()}` : '';
        Alert.alert(
          t('common.success'),
          `${t('schedule.successMsg')}\n\nID: ${meeting.meeting_code}${passMsg}`,
          [
            {
              text: t('common.ok'),
              onPress: () => navigation.replace('Home'),
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), response.message || 'Could not schedule meeting');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Something went wrong';
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const dateDisplay = formatDateDisplay(scheduledDate);
  const timeDisplay = formatTimeDisplay(scheduledDate);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            !isDark && { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
        >
          <ChevronLeft color={isDark ? '#94a3b8' : colors.textSecondary} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('schedule.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Topic */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: isDark ? '#94a3b8' : colors.textSecondary }]}>
            {t('schedule.topicLabel')}
          </Text>
          <TextInput
            style={[
              styles.input,
              !isDark && {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={topic}
            onChangeText={setTopic}
            placeholder={t('schedule.topicPlaceholder')}
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
          />
        </View>

        {/* Date & Time Selectors */}
        <View style={styles.row}>
          {/* Date Picker Button */}
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: isDark ? '#94a3b8' : colors.textSecondary }]}>
              {t('schedule.dateLabel')}
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerTriggerBox,
                !isDark && {
                  backgroundColor: colors.card,
                  borderColor: 'rgba(0, 140, 208, 0.3)',
                },
              ]}
              onPress={handleOpenDatePicker}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.pickerIconWrap,
                  !isDark && { backgroundColor: 'rgba(0, 140, 208, 0.1)' },
                ]}
              >
                <Calendar color={colors.primary} size={18} />
              </View>
              <View style={styles.pickerTextColumn}>
                <Text style={[styles.pickerMainText, { color: colors.text }]}>{dateDisplay.main}</Text>
                <Text style={[styles.pickerSubText, { color: colors.primary }]}>{dateDisplay.sub}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Time Picker Button */}
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: isDark ? '#94a3b8' : colors.textSecondary }]}>
              {t('schedule.timeLabel')}
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerTriggerBox,
                !isDark && {
                  backgroundColor: colors.card,
                  borderColor: 'rgba(0, 140, 208, 0.3)',
                },
              ]}
              onPress={handleOpenTimePicker}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.pickerIconWrap,
                  !isDark && { backgroundColor: 'rgba(0, 140, 208, 0.1)' },
                ]}
              >
                <Clock color={colors.primary} size={18} />
              </View>
              <View style={styles.pickerTextColumn}>
                <Text style={[styles.pickerMainText, { color: colors.text }]}>{timeDisplay.main}</Text>
                <Text style={[styles.pickerSubText, { color: colors.primary }]}>{timeDisplay.sub}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security & Meeting Options */}
        <View
          style={[
            styles.settingsCard,
            !isDark && {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            },
          ]}
        >
          <View style={styles.settingsHeaderRow}>
            <Shield color={colors.primary} size={16} />
            <Text style={[styles.settingsTitle, { color: isDark ? '#94a3b8' : colors.textSecondary }]}>
              {t('schedule.optionsTitle')}
            </Text>
          </View>

          {/* Passcode Switch */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <View style={styles.settingLabelRow}>
                <Lock color={colors.primary} size={15} />
                <Text style={[styles.settingText, { color: colors.text }]}>{t('schedule.passcode')}</Text>
              </View>
              <Text style={styles.settingSub}>{t('schedule.passcodeSubtitle')}</Text>
            </View>
            <Switch
              value={requirePasscode}
              onValueChange={setRequirePasscode}
              trackColor={{ false: isDark ? '#1e293b' : '#cbd5e1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Passcode Input Field (Shown when Require Passcode is ON) */}
          {requirePasscode && (
            <View
              style={[
                styles.passcodeContainer,
                !isDark && {
                  backgroundColor: 'rgba(0, 140, 208, 0.06)',
                  borderColor: 'rgba(0, 140, 208, 0.25)',
                },
              ]}
            >
              <Text style={[styles.passcodeLabel, { color: colors.primary }]}>
                {t('schedule.passcodeFieldLabel')}
              </Text>
              <View style={styles.passcodeRow}>
                <View
                  style={[
                    styles.passcodeInputBox,
                    !isDark && {
                      backgroundColor: '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Lock color={isDark ? '#64748b' : '#94a3b8'} size={16} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.passcodeInput, { color: colors.text }]}
                    value={passcode}
                    onChangeText={setPasscode}
                    placeholder="6-digit passcode"
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    keyboardType="number-pad"
                    maxLength={16}
                    autoCapitalize="none"
                  />
                </View>

                {/* Regenerate Button */}
                <TouchableOpacity
                  style={[
                    styles.passcodeActionBtn,
                    !isDark && {
                      backgroundColor: '#F1F5F9',
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleRegeneratePasscode}
                  activeOpacity={0.7}
                  accessibilityLabel="Regenerate passcode"
                >
                  <RefreshCw color={colors.primary} size={16} />
                </TouchableOpacity>

                {/* Copy Button */}
                <TouchableOpacity
                  style={[
                    styles.passcodeActionBtn,
                    !isDark && {
                      backgroundColor: '#F1F5F9',
                      borderColor: colors.border,
                    },
                    copiedPasscode && styles.passcodeActionBtnSuccess,
                  ]}
                  onPress={handleCopyPasscode}
                  activeOpacity={0.7}
                  accessibilityLabel="Copy passcode"
                >
                  {copiedPasscode ? (
                    <Check color="#10B981" size={16} />
                  ) : (
                    <Copy color={colors.primary} size={16} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.border }]} />

          {/* Waiting Room Switch */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <View style={styles.settingLabelRow}>
                <Shield color={colors.primary} size={15} />
                <Text style={[styles.settingText, { color: colors.text }]}>{t('schedule.waitingRoom')}</Text>
              </View>
              <Text style={styles.settingSub}>{t('schedule.waitingRoomSubtitle')}</Text>
            </View>
            <Switch
              value={enableWaitingRoom}
              onValueChange={setEnableWaitingRoom}
              trackColor={{ false: isDark ? '#1e293b' : '#cbd5e1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 20,
            backgroundColor: colors.background,
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border,
            borderTopWidth: 1,
          },
        ]}
      >
        <GradientButton
          title={loading ? '' : t('schedule.scheduleBtn')}
          icon={
            loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <CheckCircle color="#FFF" size={20} />
            )
          }
          onPress={handleSave}
          style={styles.saveBtn}
          colors={['#00A8FF', '#0066CC']}
          disabled={loading}
        />
      </View>

      {/* Fallback Picker Modal (iOS or unsupported environments) */}
      {pickerMode && (
        <Modal
          transparent
          animationType="fade"
          visible={Boolean(pickerMode)}
          onRequestClose={() => setPickerMode(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {pickerMode === 'date' ? t('schedule.dateLabel') : t('schedule.timeLabel')}
                </Text>
              </View>

              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={tempPickerDate}
                  mode={pickerMode}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  is24Hour={true}
                  minimumDate={pickerMode === 'date' ? new Date() : undefined}
                  onChange={(_, selected) => {
                    if (selected) setTempPickerDate(selected);
                  }}
                  themeVariant={isDark ? 'dark' : 'light'}
                  textColor={colors.text}
                />
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, !isDark && { backgroundColor: '#F1F5F9' }]}
                  onPress={() => setPickerMode(null)}
                >
                  <Text style={[styles.modalCancelText, !isDark && { color: colors.textSecondary }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={() => {
                    const updated = new Date(scheduledDate);
                    if (pickerMode === 'date') {
                      updated.setFullYear(
                        tempPickerDate.getFullYear(),
                        tempPickerDate.getMonth(),
                        tempPickerDate.getDate()
                      );
                    } else {
                      updated.setHours(
                        tempPickerDate.getHours(),
                        tempPickerDate.getMinutes(),
                        0,
                        0
                      );
                    }
                    setScheduledDate(updated);
                    setPickerMode(null);
                  }}
                >
                  <Text style={styles.modalConfirmText}>{t('common.confirm') || 'OK'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 54,
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerTriggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.25)',
    height: 60,
    paddingHorizontal: 12,
    gap: 10,
  },
  pickerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTextColumn: {
    flex: 1,
  },
  pickerMainText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  pickerSubText: {
    color: '#00A8FF',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: 'rgba(15, 27, 48, 0.72)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 14,
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  settingsTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  settingSub: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 3,
  },
  passcodeContainer: {
    backgroundColor: 'rgba(0, 168, 255, 0.05)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.2)',
    gap: 8,
  },
  passcodeLabel: {
    color: '#00A8FF',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.5,
  },
  passcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passcodeInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 44,
    paddingHorizontal: 12,
  },
  passcodeInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'monospace',
    letterSpacing: 2,
    padding: 0,
  },
  passcodeActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passcodeActionBtnSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  footer: {
    padding: 20,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0B1728',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  pickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#00A8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
});

export default ScheduleScreen;
