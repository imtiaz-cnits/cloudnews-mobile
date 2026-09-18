import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface CustomInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  containerStyle,
  leftIcon,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { isDark, colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, !isDark && { color: colors.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          !isDark && { backgroundColor: colors.card, borderColor: colors.border },
          isFocused && styles.focusedInput,
          Boolean(error) && styles.errorInput,
        ]}
      >
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, !isDark && { color: colors.text }, style]}
          placeholderTextColor={isDark ? Colors.text.muted : colors.textMuted}
          onFocus={e => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 14,
    marginBottom: Spacing.xs,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardDark,
    borderColor: Colors.glass.border,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  focusedInput: {
    borderColor: Colors.accent,
  },
  errorInput: {
    borderColor: Colors.status.danger,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    paddingVertical: Spacing.md - 2,
  },
  errorText: {
    color: Colors.status.danger,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: Spacing.xs,
  },
});

export default CustomInput;

