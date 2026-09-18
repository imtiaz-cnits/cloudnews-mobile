import { useNavigation } from '@react-navigation/native';
import { LogIn, Video, User, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  Animated,
  Easing,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import GradientButton from '../components/common/GradientButton';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { RootStackNavigationProp } from '../navigation/types';
import { login } from '../services/api';
import storage, { StorageKeys } from '../services/storage';

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Onboarding'>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark, colors } = useTheme();
  const { reloadUser } = useUser();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Production release credentials - empty by default to display placeholders
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check for existing authenticated host session and purge any residual guest session
  useEffect(() => {
    let isMounted = true;
    const checkAuthStatus = async () => {
      try {
        const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
        const isGuest = await storage.getItem(StorageKeys.IS_GUEST);
        if (token && isGuest !== 'true') {
          console.log('[Onboarding] Existing host session detected, redirecting to Home');
          if (isMounted) {
            navigation.replace('Home');
          }
        }
      } catch (e) {
        console.warn('[Onboarding] Error checking auth status:', e);
      }
    };
    checkAuthStatus();
    return () => {
      isMounted = false;
    };
  }, [navigation]);

  // Smooth keyboard animation listener
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const duration = Platform.OS === 'ios' ? (e.duration || 250) : 250;
      Animated.timing(keyboardAnim, {
        toValue: 1,
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      const duration = Platform.OS === 'ios' ? (e.duration || 220) : 220;
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardAnim]);

  // Handle Android hardware back press when login form is open
  useEffect(() => {
    if (!showLoginForm) return;

    const onBackPress = () => {
      Keyboard.dismiss();
      setShowLoginForm(false);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [showLoginForm]);

  const handleSignIn = async () => {
    if (!username.trim() || !password) {
      Alert.alert(t('common.error'), 'Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await login(username.trim(), password);

      if (response.success) {
        await reloadUser();
        navigation.replace('Home');
      } else {
        Alert.alert(t('common.error'), response.message || 'Invalid credentials');
      }
    } catch (error: any) {
      console.log('Login Error Object:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Network Error: Check if server is running';
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const heroPaddingTop = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [showLoginForm ? 54 : 80, showLoginForm ? 52 : 70],
  });

  const logoScale = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.84],
  });

  const logoTranslateY = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
  });

  const glowOpacity = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.35],
  });

  const textOpacity = keyboardAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 0, 0],
  });

  const textMaxHeight = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [130, 0],
  });

  const textTranslateY = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  const actionMarginBottom = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 16],
  });

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.mainContainer, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        {/* Top Controls */}
        <View style={styles.topControls}>
          {showLoginForm ? (
            <TouchableOpacity
              style={[
                styles.backButton,
                !isDark && { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => {
                Keyboard.dismiss();
                setShowLoginForm(false);
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft color={isDark ? '#F8FAFC' : colors.text} size={22} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <LanguageSwitcher />
        </View>

        {/* Center Hero Content */}
        <Animated.View style={[styles.heroSection, { paddingTop: heroPaddingTop }]}>
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                transform: [
                  { scale: logoScale },
                  { translateY: logoTranslateY },
                ],
              },
            ]}
          >
            {/* Ambient Ethereal Radial Glow */}
            <Animated.View style={[styles.ambientGlowContainer, { opacity: glowOpacity }]} pointerEvents="none">
              <Svg width={360} height={360} viewBox="0 0 360 360">
                <Defs>
                  <RadialGradient
                    id="logoAmbientGlow"
                    cx="50%"
                    cy="50%"
                    r="50%"
                    fx="50%"
                    fy="50%"
                  >
                    <Stop offset="0%" stopColor="#00A8FF" stopOpacity="0.55" />
                    <Stop offset="25%" stopColor="#00A8FF" stopOpacity="0.32" />
                    <Stop offset="50%" stopColor="#0284C7" stopOpacity="0.16" />
                    <Stop offset="75%" stopColor="#0369A1" stopOpacity="0.05" />
                    <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
                  </RadialGradient>
                  <RadialGradient
                    id="logoCoreGlow"
                    cx="50%"
                    cy="50%"
                    r="35%"
                    fx="50%"
                    fy="50%"
                  >
                    <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.75" />
                    <Stop offset="50%" stopColor="#00A8FF" stopOpacity="0.25" />
                    <Stop offset="100%" stopColor="#00A8FF" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx="180" cy="180" r="180" fill="url(#logoAmbientGlow)" />
                <Circle cx="180" cy="180" r="115" fill="url(#logoCoreGlow)" />
              </Svg>
            </Animated.View>

            <View
              style={[
                styles.logoSquircle,
                !isDark && {
                  backgroundColor: colors.card,
                  borderColor: 'rgba(0, 140, 208, 0.25)',
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  elevation: 4,
                },
              ]}
            >
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.textBlockAnimated,
              {
                opacity: textOpacity,
                maxHeight: textMaxHeight,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            <Text style={[styles.appName, { color: colors.text }]}>{t('common.appName')}</Text>
            <Text style={[styles.appTagline, { color: colors.textSecondary }]}>{t('onboarding.subtitle')}</Text>
          </Animated.View>
        </Animated.View>

        {/* Primary Actions Area */}
        <Animated.View style={[styles.actionSection, { marginBottom: actionMarginBottom }]}>
        {!showLoginForm ? (
          <>
            <GradientButton
              title={t('onboarding.joinMeeting')}
              icon={<Video color="#FFF" size={22} />}
              onPress={() => navigation.navigate('Join', { isGuest: true })}
              style={styles.mainButton}
              colors={['#00A8FF', '#0066CC']}
            />

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                !isDark && {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setShowLoginForm(true)}
            >
              <LogIn color={colors.primary} size={22} />
              <Text
                style={[styles.secondaryButtonText, !isDark && { color: colors.text }]}
                numberOfLines={1}
              >
                {t('onboarding.signIn')}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.footnote, { color: isDark ? '#64748b' : colors.textMuted }]}>
              {t('onboarding.guestNotice')}
            </Text>
          </>
        ) : (
          <View style={styles.loginContainer}>
            <View
              style={[
                styles.inputWrapper,
                !isDark && {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <User color={colors.primary} size={20} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t('onboarding.usernamePlaceholder')}
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View
              style={[
                styles.inputWrapper,
                !isDark && {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Lock color={colors.primary} size={20} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t('onboarding.passwordPlaceholder')}
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(prev => !prev)}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.eyeIconBtn}
              >
                {showPassword ? (
                  <EyeOff color={isDark ? '#94a3b8' : colors.textSecondary} size={20} />
                ) : (
                  <Eye color={isDark ? '#94a3b8' : colors.textSecondary} size={20} />
                )}
              </TouchableOpacity>
            </View>

            <GradientButton
              title={loading ? "" : t('onboarding.signInBtn')}
              onPress={handleSignIn}
              style={styles.mainButton}
              colors={['#00A8FF', '#0066CC']}
              disabled={loading}
              icon={loading ? <ActivityIndicator color="#FFF" /> : <LogIn color="#FFF" size={22} />}
            />
          </View>
        )}
      </Animated.View>
    </View>
  </TouchableWithoutFeedback>
);
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#050B14',
    paddingHorizontal: 24,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    height: 42,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  langContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  langPillActive: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  langPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  langTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  langText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ambientGlowContainer: {
    position: 'absolute',
    width: 360,
    height: 360,
    top: -110,
    left: -110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSquircle: {
    width: 136,
    height: 136,
    borderRadius: 32,
    backgroundColor: '#0B1728',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 168, 255, 0.4)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '94%',
    height: '94%',
  },
  appName: {
    fontSize: 34,
    color: '#FFFFFF',
    marginTop: 24,
    letterSpacing: -1,
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  appTagline: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 26,
    marginTop: 8,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  textBlockAnimated: {
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  actionSection: {
    marginBottom: 40,
    gap: 16,
  },
  mainButton: {
    height: 54, // Standard height
    borderRadius: 14,
  },
  secondaryButton: {
    height: 54, // Matched height with primary button
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#172233',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  footnote: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  loginContainer: {
    gap: 16,
    marginBottom: 12,
  },
  // loginTitle: {
  //   color: '#FFFFFF',
  //   fontSize: 20,
  //   fontFamily: 'PlusJakartaSans-Bold',
  //   textAlign: 'center',
  //   marginBottom: 16,
  // },
  inputWrapper: {
    height: 54,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
  },
  eyeIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OnboardingScreen;
