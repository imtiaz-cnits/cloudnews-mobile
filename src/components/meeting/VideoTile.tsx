import { TrackReference, VideoTrack } from '@livekit/react-native';
import { MicOff, User } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/theme';

interface VideoTileProps {
  trackRef?: TrackReference;
  participantName?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isLocal?: boolean;
  style?: ViewStyle;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  trackRef,
  participantName = 'Participant',
  isSpeaking = false,
  isMuted = false,
  isLocal = false,
  style,
}) => {
  const hasVideo = Boolean(trackRef?.publication?.track && !trackRef.publication.isMuted);

  return (
    <View
      style={[
        styles.container,
        isSpeaking && styles.speakingBorder,
        style,
      ]}
    >
      {hasVideo && trackRef ? (
        <VideoTrack
          trackRef={trackRef}
          style={styles.video}
          objectFit="cover"
          mirror={isLocal}
        />
      ) : (
        <View style={styles.fallbackContainer}>
          <View style={styles.avatar}>
            <User color={Colors.accent} size={36} />
          </View>
          <Text style={styles.fallbackName}>{participantName}</Text>
        </View>
      )}

      {/* Overlay Badge */}
      <View style={styles.badgeOverlay}>
        <View style={styles.nameBadge}>
          <Text style={styles.nameText} numberOfLines={1}>
            {participantName} {isLocal ? '(You)' : ''}
          </Text>
        </View>

        {isMuted && (
          <View style={styles.muteBadge}>
            <MicOff color={Colors.status.danger} size={14} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardDark,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.glass.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  speakingBorder: {
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  fallbackName: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameBadge: {
    backgroundColor: Colors.controlOverlay,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    maxWidth: '80%',
  },
  nameText: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  muteBadge: {
    backgroundColor: Colors.controlOverlay,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
});

export default VideoTile;

