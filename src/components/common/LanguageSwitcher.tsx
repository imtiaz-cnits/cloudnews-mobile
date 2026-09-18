import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export interface LanguageSwitcherProps {
  style?: any;
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ style, compact = false }) => {
  const { currentLang, setLanguage } = useTranslation();
  const { isDark, colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        !isDark && {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.pill,
          currentLang === 'zh' && { backgroundColor: colors.primary },
        ]}
        onPress={() => setLanguage('zh')}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.pillText,
            !isDark && { color: colors.textSecondary },
            currentLang === 'zh' && styles.pillTextActive,
          ]}
        >
          中文
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.pill,
          currentLang === 'en' && { backgroundColor: colors.primary },
        ]}
        onPress={() => setLanguage('en')}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.pillText,
            !isDark && { color: colors.textSecondary },
            currentLang === 'en' && styles.pillTextActive,
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  containerCompact: {
    padding: 2,
    borderRadius: 16,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  pillActive: {
    backgroundColor: '#00A8FF',
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
  },
});

export default LanguageSwitcher;
