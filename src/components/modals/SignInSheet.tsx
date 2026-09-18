import { KeyRound, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../common/CustomInput';
import GlassCard from '../common/GlassCard';
import GradientButton from '../common/GradientButton';

interface SignInSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (displayName: string, roomCode?: string) => void;
  mode?: 'join' | 'profile';
  initialRoomCode?: string;
}

export const SignInSheet: React.FC<SignInSheetProps> = ({
  visible,
  onClose,
  onConfirm,
  mode = 'join',
  initialRoomCode = '',
}) => {
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [error, setError] = useState('');
  const { isDark, colors } = useTheme();

  const handleSubmit = () => {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setError('');
    onConfirm(displayName.trim(), roomCode.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.backdrop,
          !isDark && { backgroundColor: 'rgba(15, 23, 42, 0.4)' },
        ]}
      >
        <TouchableOpacity
          style={styles.dismissOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <GlassCard style={styles.sheetContainer} variant={isDark ? "dark" : "light"}>
          <View style={styles.header}>
            <Text style={[Typography.headingSmall, !isDark && { color: colors.text }]}>
              {mode === 'join' ? 'Join Conference' : 'User Profile'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color={isDark ? Colors.text.muted : colors.textMuted} size={22} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <CustomInput
              label="Display Name"
              placeholder="e.g. Alex Johnson"
              value={displayName}
              onChangeText={text => {
                setDisplayName(text);
                if (error) setError('');
              }}
              error={error}
              leftIcon={<User color={Colors.text.muted} size={18} />}
            />

            {mode === 'join' && (
              <CustomInput
                label="Room ID / Code"
                placeholder="e.g. daily-sync-room"
                value={roomCode}
                onChangeText={setRoomCode}
                autoCapitalize="none"
                leftIcon={<KeyRound color={Colors.text.muted} size={18} />}
              />
            )}

            <GradientButton
              title={mode === 'join' ? 'Connect & Enter' : 'Save Details'}
              onPress={handleSubmit}
              style={styles.submitButton}
            />
          </View>
        </GlassCard>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 9, 18, 0.75)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  content: {
    gap: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});

export default SignInSheet;

