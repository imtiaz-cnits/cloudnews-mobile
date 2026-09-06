import {
    LiveKitRoom,
    TrackReference,
    useLocalParticipant,
    useParticipants,
    useTracks,
} from '@livekit/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Track } from 'livekit-client';
import { Radio, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import ControlsBar from '../components/meeting/ControlsBar';
import VideoTile from '../components/meeting/VideoTile';
import { Colors } from '../constants/colors';
import { BorderRadius, Spacing, Typography } from '../constants/theme';
import { RootStackNavigationProp, RootStackRouteProp } from '../navigation/types';
import { formatDuration } from '../utils/helpers';

const MeetingRoomContent: React.FC<{
  roomName: string;
  onLeave: () => void;
}> = ({ roomName, onLeave }) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });

  // Increment call timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleMic = async () => {
    if (localParticipant) {
      const nextMuted = !isMicMuted;
      await localParticipant.setMicrophoneEnabled(!nextMuted);
      setIsMicMuted(nextMuted);
    }
  };

  const handleToggleCamera = async () => {
    if (localParticipant) {
      const nextOff = !isCameraOff;
      await localParticipant.setCameraEnabled(!nextOff);
      setIsCameraOff(nextOff);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Meeting Header */}
      <View style={styles.header}>
        <View style={styles.roomInfo}>
          <View style={styles.liveIndicator}>
            <Radio color={Colors.status.danger} size={16} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.roomNameText} numberOfLines={1}>
            {roomName}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.timerText}>{formatDuration(callDuration)}</Text>
          <View style={styles.participantCountBadge}>
            <Users color={Colors.text.primary} size={14} />
            <Text style={styles.participantCountText}>
              {participants.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Video Grid */}
      <View style={styles.gridContainer}>
        {tracks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={Typography.bodyLarge}>Connecting media tracks...</Text>
            <Text style={styles.waitingText}>
              Waiting for video streams to synchronize
            </Text>
          </View>
        ) : (
          <FlatList
            data={tracks}
            keyExtractor={item =>
              `${item.participant.identity}-${item.source}`
            }
            numColumns={tracks.length > 1 ? 2 : 1}
            key={tracks.length > 1 ? 'grid-2' : 'grid-1'}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isLocal =
                item.participant.identity === localParticipant?.identity;
              return (
                <View
                  style={
                    tracks.length > 1
                      ? styles.gridTileWrapper
                      : styles.singleTileWrapper
                  }
                >
                  <VideoTile
                    trackRef={item as TrackReference}
                    participantName={
                      item.participant.name || item.participant.identity
                    }
                    isSpeaking={item.participant.isSpeaking}
                    isMuted={!item.participant.isMicrophoneEnabled}
                    isLocal={isLocal}
                    style={styles.fullTile}
                  />
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Bottom Controls Bar */}
      <View style={styles.footerControls}>
        <ControlsBar
          isMicMuted={isMicMuted}
          isCameraOff={isCameraOff}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onLeave={onLeave}
        />
      </View>
    </SafeAreaView>
  );
};

export const MeetingRoomScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'MeetingRoom'>>();
  const route = useRoute<RootStackRouteProp<'MeetingRoom'>>();
  const { roomName, token, serverUrl } = route.params;

  const handleLeave = () => {
    navigation.replace('Home');
  };

  return (
    <View style={styles.container}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={handleLeave}
      >
        <MeetingRoomContent roomName={roomName} onLeave={handleLeave} />
      </LiveKitRoom>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.glass.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.border,
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  liveText: {
    color: Colors.status.danger,
    fontSize: 10,
    fontWeight: '700',
  },
  roomNameText: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timerText: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  participantCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.cardDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  participantCountText: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    flex: 1,
    padding: Spacing.sm,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  singleTileWrapper: {
    flex: 1,
    height: 480,
    padding: Spacing.xs,
  },
  gridTileWrapper: {
    flex: 0.5,
    height: 220,
    padding: Spacing.xs,
  },
  fullTile: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    color: Colors.text.secondary,
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  footerControls: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});

export default MeetingRoomScreen;

