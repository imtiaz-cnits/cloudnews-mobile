import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableOpacityProps,
    ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/theme';

interface GradientButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  colors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  colors = Colors.gradients.accent,
  style,
  icon,
  ...rest
}) => {
  const gradientColors = disabled
    ? ['#334155', '#1E293B']
    : (colors as unknown as string[]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.touchable, style]}
      {...rest}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={Colors.text.primary} size="small" />
        ) : (
          <>
            {icon}
            <Text
              style={[styles.text, icon ? styles.textWithIcon : null]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1, // Ensure gradient fills the touchable height
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold', // Font explicitly added here
  },
  textWithIcon: {
    marginLeft: 10,
  },
});

export default GradientButton;

