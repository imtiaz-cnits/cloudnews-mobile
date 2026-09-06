import { useNavigation } from '@react-navigation/native';
import { Globe, ShieldCheck, Video, Zap } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GlassCard from '../components/common/GlassCard';
import GradientButton from '../components/common/GradientButton';
import { Colors } from '../constants/colors';
import { Spacing, Typography } from '../constants/theme';
import { RootStackNavigationProp } from '../navigation/types';

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Onboarding'>>();

  return (
    <View style={styles.container}>
      {/* Brand Hero Visual */}
      <View style={styles.heroSection}>
        <View style={styles.logoBadge}>
          <Video color={Colors.accent} size={48} />
        </View>
        <Text style={styles.appName}>CLOUD NEWS</Text>
        <Text style={styles.appTagline}>Real-Time Video Conferencing</Text>
      </View>

      {/* Feature Highlights */}
      <GlassCard style={styles.featureCard} variant="dark">
        <View style={styles.featureRow}>
          <Zap color={Colors.accent} size={22} />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Ultra-Low Latency SFU</Text>
            <Text style={styles.featureSubtitle}>Powered by LiveKit WebRTC architecture</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <ShieldCheck color={Colors.status.success} size={22} />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Decoupled Architecture</Text>
            <Text style={styles.featureSubtitle}>Stateless token validation & room management</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <Globe color={Colors.primary} size={22} />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Cross-Platform Ready</Text>
            <Text style={styles.featureSubtitle}>Seamless video routing on iOS & Android</Text>
          </View>
        </View>
      </GlassCard>

      {/* Call to Action */}
      <View style={styles.footer}>
        <GradientButton
          title="Get Started"
          onPress={() => navigation.replace('Home')}
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    ...Typography.headingLarge,
    color: Colors.text.primary,
    letterSpacing: 2,
  },
  appTagline: {
    ...Typography.bodyMedium,
    color: Colors.accent,
    marginTop: Spacing.xs,
  },
  featureCard: {
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  featureTitle: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  featureSubtitle: {
    color: Colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    marginBottom: Spacing.md,
  },
  ctaButton: {
    width: '100%',
  },
});

export default OnboardingScreen;

