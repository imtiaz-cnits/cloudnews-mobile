import { useNavigation } from '@react-navigation/native';
import { Hash, LogIn, Plus, Sparkles, Users, Video } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import CustomInput from '../components/common/CustomInput';
import GlassCard from '../components/common/GlassCard';
import GradientButton from '../components/common/GradientButton';
import SignInSheet from '../components/modals/SignInSheet';
import { Colors } from '../constants/colors';
import { Spacing, Typography } from '../constants/theme';
import { useMeeting } from '../hooks/useMeeting';
import { RootStackNavigationProp } from '../navigation/types';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Home'>>();
  const { joinMeeting, createRoom } = useMeeting();

  const [roomName, setRoomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateMeeting = async () => {
    const name = displayName.trim() || 'Host User';
    setLoading(true);
    try {
      const generatedRoom = await createRoom();
      const session = await joinMeeting({
        roomName: generatedRoom,
        displayName: name,
      });

      navigation.navigate('MeetingRoom', {
        roomName: session.room_name,
        token: session.token,
        serverUrl: session.livekit_url,
        displayName: name,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create meeting room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async (customDisplayName?: string, customRoomName?: string) => {
    const targetRoom = (customRoomName || roomName).trim();
    const targetUser = (customDisplayName || displayName).trim() || 'Guest User';

    if (!targetRoom) {
      Alert.alert('Room Required', 'Please enter a room name or meeting code to join.');
      return;
    }

    setLoading(true);
    try {
      const session = await joinMeeting({
        roomName: targetRoom,
        displayName: targetUser,
      });

      setIsJoinModalOpen(false);
      navigation.navigate('MeetingRoom', {
        roomName: session.room_name,
        token: session.token,
        serverUrl: session.livekit_url,
        displayName: targetUser,
      });
    } catch (err: any) {
      Alert.alert('Join Failed', err.message || 'Could not connect to room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={Typography.headingMedium}>Cloud News Meet</Text>
          <Text style={Typography.bodyMedium}>Decoupled WebRTC Video Conferencing</Text>
        </View>
        <View style={styles.headerIconBadge}>
          <Video color={Colors.accent} size={24} />
        </View>
      </View>

      {/* Action Cards */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCardWrapper}
          activeOpacity={0.8}
          onPress={handleCreateMeeting}
        >
          <GlassCard style={styles.actionCard} variant="bordered">
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(2, 132, 199, 0.2)' }]}>
              <Plus color={Colors.accent} size={28} />
            </View>
            <Text style={styles.actionTitle}>New Meeting</Text>
            <Text style={styles.actionDescription}>Instantly create a LiveKit video room</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCardWrapper}
          activeOpacity={0.8}
          onPress={() => setIsJoinModalOpen(true)}
        >
          <GlassCard style={styles.actionCard}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <LogIn color={Colors.accent} size={28} />
            </View>
            <Text style={styles.actionTitle}>Join with Code</Text>
            <Text style={styles.actionDescription}>Enter an existing room name or token</Text>
          </GlassCard>
        </TouchableOpacity>
      </View>

      {/* Quick Join Section */}
      <GlassCard style={styles.quickJoinCard} variant="dark">
        <View style={styles.quickJoinHeader}>
          <Sparkles color={Colors.accent} size={18} />
          <Text style={styles.quickJoinTitle}>Quick Join Meeting</Text>
        </View>

        <CustomInput
          label="Your Name"
          placeholder="e.g. Jordan Lee"
          value={displayName}
          onChangeText={setDisplayName}
          leftIcon={<Users color={Colors.text.muted} size={18} />}
        />

        <CustomInput
          label="Room Name"
          placeholder="e.g. sprint-standup"
          value={roomName}
          onChangeText={setRoomName}
          autoCapitalize="none"
          leftIcon={<Hash color={Colors.text.muted} size={18} />}
        />

        <GradientButton
          title="Connect to Room"
          loading={loading}
          onPress={() => handleJoinMeeting()}
          style={styles.joinButton}
        />
      </GlassCard>

      {/* Join Modal Sheet */}
      <SignInSheet
        visible={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onConfirm={(name, code) => handleJoinMeeting(name, code)}
        initialRoomCode={roomName}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardDark,
    borderColor: Colors.glass.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionCardWrapper: {
    flex: 1,
  },
  actionCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    minHeight: 150,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionTitle: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  actionDescription: {
    color: Colors.text.secondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  quickJoinCard: {
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  quickJoinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  quickJoinTitle: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  joinButton: {
    marginTop: Spacing.sm,
  },
});

export default HomeScreen;

