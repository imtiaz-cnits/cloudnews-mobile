import {
    Mic,
    MicOff,
    PhoneOff,
    SwitchCamera,
    Video,
    VideoOff,
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/theme';

interface ControlsBarProps {
  isMicMuted: boolean;
  isCameraOff: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onSwitchCamera?: () => void;
  onLeave: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  isMicMuted,
  isCameraOff,
  onToggleMic,
  onToggleCamera,
  onSwitchCamera,
  onLeave,
}) => {
  return (
    <View style={styles.container}>
      {/* Mic Button */}
      <TouchableOpacity
        style={[styles.button, isMicMuted && styles.inactiveButton]}
        onPress={onToggleMic}
        activeOpacity={0.7}
      >
        {isMicMuted ? (
          <MicOff color={Colors.status.danger} size={22} />
        ) : (
          <Mic color={Colors.text.primary} size={22} />
        )}
      </TouchableOpacity>

      {/* Camera Button */}
      <TouchableOpacity
        style={[styles.button, isCameraOff && styles.inactiveButton]}
        onPress={onToggleCamera}
        activeOpacity={0.7}
      >
        {isCameraOff ? (
          <VideoOff color={Colors.status.danger} size={22} />
        ) : (
          <Video color={Colors.text.primary} size={22} />
        )}
      </TouchableOpacity>

      {/* Switch Camera Button */}
      {onSwitchCamera && (
        <TouchableOpacity
          style={styles.button}
          onPress={onSwitchCamera}
          activeOpacity={0.7}
        >
          <SwitchCamera color={Colors.text.primary} size={22} />
        </TouchableOpacity>
      )}

      {/* Leave Call Button */}
      <TouchableOpacity
        style={[styles.button, styles.leaveButton]}
        onPress={onLeave}
        activeOpacity={0.7}
      >
        <PhoneOff color={Colors.text.primary} size={22} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.controlOverlay,
    borderColor: Colors.glass.border,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    alignSelf: 'center',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: Colors.status.danger,
    borderWidth: 1,
  },
  leaveButton: {
    backgroundColor: Colors.status.danger,
  },
});

export default ControlsBar;

