import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'dark' | 'light' | 'bordered';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'dark',
  ...rest
}) => {
  const { isDark, colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        !isDark && {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        variant === 'bordered' && styles.bordered,
        variant === 'light' && styles.light,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glass.background,
    borderColor: Colors.glass.border,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  bordered: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  light: {
    backgroundColor: Colors.glass.backgroundLight,
    borderColor: Colors.glass.borderLight,
  },
});

export default GlassCard;

