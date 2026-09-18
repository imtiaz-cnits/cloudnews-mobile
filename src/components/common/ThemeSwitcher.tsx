import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';

export interface ThemeSwitcherProps {
  style?: any;
  compact?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ style, compact = false }) => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <TouchableOpacity
        style={[styles.pill, theme === 'dark' && styles.pillActive]}
        onPress={() => setTheme('dark')}
        activeOpacity={0.8}
      >
        <Moon
          size={12}
          color={theme === 'dark' ? '#FFFFFF' : '#94A3B8'}
          style={styles.icon}
        />
        <Text style={[styles.pillText, theme === 'dark' && styles.pillTextActive]}>
          {t('profile.dark')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pill, theme === 'light' && styles.pillActive]}
        onPress={() => setTheme('light')}
        activeOpacity={0.8}
      >
        <Sun
          size={12}
          color={theme === 'light' ? '#FFFFFF' : '#94A3B8'}
          style={styles.icon}
        />
        <Text style={[styles.pillText, theme === 'light' && styles.pillTextActive]}>
          {t('profile.light')}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  pillActive: {
    backgroundColor: '#00A8FF',
  },
  icon: {
    marginRight: 2,
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
  },
});

export default ThemeSwitcher;
