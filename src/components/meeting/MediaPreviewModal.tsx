import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Share,
  Linking,
  StatusBar,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import LinearGradient from 'react-native-linear-gradient';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Film,
  Headphones,
  FileText,
  Play,
  AlertCircle,
  RefreshCw,
  Eye,
  File,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface MediaPreviewItem {
  uri?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  fileName?: string;
  fileSize?: string;
  sender?: string;
  time?: string;
  duration?: string;
  text?: string;
}

interface MediaPreviewModalProps {
  visible: boolean;
  media: MediaPreviewItem | null;
  onClose: () => void;
}

/**
 * Sanitizes media URLs by stripping out internal/development port :8000
 * so requests hit standard HTTPS on port 443 which Nginx serves directly.
 */
export const sanitizeMediaUrl = (url?: string): string => {
  if (!url) return '';
  let clean = url.trim();
  // Strip :8000 or :8080 from public domain URLs
  clean = clean.replace(/(https?:\/\/[^\/:]+):8000(\/.*)?$/, '$1$2');
  clean = clean.replace(/(https?:\/\/[^\/:]+):8080(\/.*)?$/, '$1$2');
  return clean;
};

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  visible,
  media,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const lastTapRef = useRef<number>(0);
  const isZoomedRef = useRef<boolean>(false);

  const resolvedUri = sanitizeMediaUrl(media?.uri);
  const isImage = media?.type === 'image';
  const isVideo = media?.type === 'video';
  const isAudio = media?.type === 'audio';
  const isDocument = media?.type === 'document';

  useEffect(() => {
    if (visible) {
      setImageLoading(true);
      setImageError(false);
      setCopied(false);
      setToastMessage(null);
    }
  }, [visible, resolvedUri]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastMessage(null);
    });
  }, [toastAnim]);

  const handleCopyLink = useCallback(async () => {
    if (!resolvedUri) return;
    try {
      await Clipboard.setStringAsync(resolvedUri);
      setCopied(true);
      showToast('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert('Copy', 'Could not copy link to clipboard.');
    }
  }, [resolvedUri, showToast]);

  const handleShare = useCallback(async () => {
    if (!resolvedUri) return;
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { url: resolvedUri, title: media?.fileName || 'Cloud News Media' }
          : { message: resolvedUri, title: media?.fileName || 'Cloud News Media' }
      );
    } catch {
      // User dismissed or share failed
    }
  }, [resolvedUri, media?.fileName]);

  const handleOpenExternally = useCallback(async () => {
    if (!resolvedUri) return;

    if (resolvedUri.startsWith('http://') || resolvedUri.startsWith('https://')) {
      try {
        const supported = await Linking.canOpenURL(resolvedUri);
        if (supported) {
          await Linking.openURL(resolvedUri);
          return;
        }
      } catch {
        // Fallback to share
      }
    }

    // For file:// or if browser cannot open directly, open via system share chooser
    try {
      await Share.share({
        url: resolvedUri,
        message: resolvedUri,
        title: media?.fileName || 'Media File',
      });
    } catch {
      Alert.alert('Unable to open', 'No suitable application found to open this file.');
    }
  }, [resolvedUri, media?.fileName]);

  const handleDoubleTapZoom = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (scrollViewRef.current) {
        if (isZoomedRef.current) {
          scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
          isZoomedRef.current = false;
        } else {
          scrollViewRef.current.scrollTo({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 4, animated: true });
          isZoomedRef.current = true;
        }
      }
    }
    lastTapRef.current = now;
  }, []);

  if (!visible || !media) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <X color="#FFFFFF" size={20} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              {isImage && (
                <View style={[styles.categoryBadge, { backgroundColor: 'rgba(0, 168, 255, 0.18)', borderColor: 'rgba(0, 168, 255, 0.4)' }]}>
                  <ImageIcon color="#00A8FF" size={12} style={{ marginRight: 4 }} />
                  <Text style={[styles.categoryText, { color: '#00A8FF' }]}>IMAGE</Text>
                </View>
              )}
              {isVideo && (
                <View style={[styles.categoryBadge, { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: 'rgba(16, 185, 129, 0.4)' }]}>
                  <Film color="#10B981" size={12} style={{ marginRight: 4 }} />
                  <Text style={[styles.categoryText, { color: '#10B981' }]}>VIDEO</Text>
                </View>
              )}
              {isAudio && (
                <View style={[styles.categoryBadge, { backgroundColor: 'rgba(245, 158, 11, 0.18)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
                  <Headphones color="#F59E0B" size={12} style={{ marginRight: 4 }} />
                  <Text style={[styles.categoryText, { color: '#F59E0B' }]}>AUDIO</Text>
                </View>
              )}
              {isDocument && (
                <View style={[styles.categoryBadge, { backgroundColor: 'rgba(139, 92, 246, 0.18)', borderColor: 'rgba(139, 92, 246, 0.4)' }]}>
                  <FileText color="#8B5CF6" size={12} style={{ marginRight: 4 }} />
                  <Text style={[styles.categoryText, { color: '#8B5CF6' }]}>DOC</Text>
                </View>
              )}
              <Text style={styles.headerTitle} numberOfLines={1}>
                {media.fileName || media.text || 'Media File'}
              </Text>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {media.sender ? `Sent by ${media.sender}` : 'In-Meeting Chat'}
              {media.time ? ` • ${media.time}` : ''}
              {media.fileSize ? ` • ${media.fileSize}` : ''}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {Boolean(resolvedUri) && (
              <>
                <TouchableOpacity
                  style={styles.circleBtn}
                  onPress={handleCopyLink}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {copied ? <Check color="#10B981" size={18} /> : <Copy color="#E2E8F0" size={18} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.circleBtn}
                  onPress={handleShare}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Share2 color="#E2E8F0" size={18} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.circleBtn}
                  onPress={handleOpenExternally}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ExternalLink color="#E2E8F0" size={18} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Content Viewer Body */}
        <View style={styles.body}>
          {/* --- IMAGE VIEWER --- */}
          {isImage && (
            <ScrollView
              ref={scrollViewRef}
              style={styles.imageScrollView}
              contentContainerStyle={styles.imageScrollContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleDoubleTapZoom}
                style={styles.imageWrapper}
              >
                {Boolean(resolvedUri) && !imageError ? (
                  <Image
                    source={{ uri: resolvedUri }}
                    style={styles.fullImage}
                    resizeMode="contain"
                    onLoadStart={() => setImageLoading(true)}
                    onLoadEnd={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                ) : (
                  <View style={styles.errorCard}>
                    <AlertCircle color="#EF4444" size={44} />
                    <Text style={styles.errorTitle}>Unable to display preview</Text>
                    <Text style={styles.errorSubtitle}>
                      The image file link could not be loaded directly.
                    </Text>
                    <View style={styles.errorActions}>
                      <TouchableOpacity style={styles.errorRetryBtn} onPress={handleOpenExternally}>
                        <ExternalLink color="#FFFFFF" size={15} style={{ marginRight: 6 }} />
                        <Text style={styles.errorRetryText}>Open Externally</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.errorCopyBtn} onPress={handleCopyLink}>
                        <Copy color="#94A3B8" size={15} style={{ marginRight: 6 }} />
                        <Text style={styles.errorCopyText}>Copy Link</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {imageLoading && !imageError && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#00A8FF" />
                    <Text style={styles.loadingText}>Loading image...</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* --- VIDEO VIEWER CARD --- */}
          {isVideo && (
            <View style={styles.videoCardContainer}>
              <View style={styles.videoCardBox}>
                <LinearGradient
                  colors={['#0F172A', '#1E293B']}
                  style={styles.videoCardInner}
                >
                  <View style={styles.videoCenterIcon}>
                    <TouchableOpacity
                      style={styles.playGlowBtn}
                      onPress={handleOpenExternally}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#00A8FF', '#0066CC']}
                        style={styles.playGlowGradient}
                      >
                        <Play color="#FFFFFF" size={36} fill="#FFFFFF" style={{ marginLeft: 4 }} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.videoCardFooter}>
                    <View style={styles.videoInfoRow}>
                      <Film color="#10B981" size={18} style={{ marginRight: 8 }} />
                      <Text style={styles.videoCardName} numberOfLines={1}>
                        {media.fileName || media.text || 'Video File'}
                      </Text>
                    </View>
                    <View style={styles.videoMetaRow}>
                      <View style={styles.videoBadge}>
                        <Text style={styles.videoBadgeText}>{media.duration || '01:20'}</Text>
                      </View>
                      {Boolean(media.fileSize) && (
                        <Text style={styles.videoMetaText}>{media.fileSize}</Text>
                      )}
                      <Text style={styles.videoMetaText}>• MP4 High Definition</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Primary Action Button */}
              <TouchableOpacity
                style={styles.playPrimaryBtn}
                onPress={handleOpenExternally}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#00A8FF', '#0055B3']}
                  style={styles.playPrimaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Play color="#FFFFFF" size={20} fill="#FFFFFF" style={{ marginRight: 10 }} />
                  <Text style={styles.playPrimaryBtnText}>Play Video with System Player</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleShare}>
                  <Share2 color="#00A8FF" size={16} style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryActionText}>Share Video</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleCopyLink}>
                  <Copy color="#00A8FF" size={16} style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryActionText}>Copy Link</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* --- AUDIO VIEWER CARD --- */}
          {isAudio && (
            <View style={styles.audioCardContainer}>
              <View style={styles.audioCardBox}>
                <LinearGradient
                  colors={['#1E293B', '#0F172A']}
                  style={styles.audioCardInner}
                >
                  <View style={styles.audioWaveformRow}>
                    {[40, 65, 25, 80, 50, 95, 70, 30, 85, 60, 45, 75].map((h, i) => (
                      <View
                        key={i}
                        style={[
                          styles.audioWaveBar,
                          { height: h, backgroundColor: i % 2 === 0 ? '#F59E0B' : '#FBBF24' },
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.audioMetaInfo}>
                    <Text style={styles.audioFileName} numberOfLines={1}>
                      {media.fileName || media.text || 'Audio Note'}
                    </Text>
                    <Text style={styles.audioDuration}>{media.duration || '0:35'} • Voice Note</Text>
                  </View>
                </LinearGradient>
              </View>

              <TouchableOpacity
                style={styles.playPrimaryBtn}
                onPress={handleOpenExternally}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  style={styles.playPrimaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Play color="#FFFFFF" size={20} fill="#FFFFFF" style={{ marginRight: 10 }} />
                  <Text style={styles.playPrimaryBtnText}>Play Audio</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleShare}>
                  <Share2 color="#F59E0B" size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryActionText, { color: '#F59E0B' }]}>Share Audio</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleCopyLink}>
                  <Copy color="#F59E0B" size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryActionText, { color: '#F59E0B' }]}>Copy Link</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* --- DOCUMENT VIEWER CARD --- */}
          {isDocument && (
            <View style={styles.docCardContainer}>
              <View style={styles.docCardBox}>
                <LinearGradient
                  colors={['#1E293B', '#0F172A']}
                  style={styles.docCardInner}
                >
                  <View style={styles.docLargeIcon}>
                    <FileText color="#8B5CF6" size={54} />
                  </View>
                  <Text style={styles.docTitle} numberOfLines={2}>
                    {media.fileName || media.text || 'Document'}
                  </Text>
                  <Text style={styles.docMeta}>
                    {media.fileSize || 'Document File'} • Ready to view
                  </Text>
                </LinearGradient>
              </View>

              <TouchableOpacity
                style={styles.playPrimaryBtn}
                onPress={handleOpenExternally}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6D28D9']}
                  style={styles.playPrimaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <ExternalLink color="#FFFFFF" size={19} style={{ marginRight: 10 }} />
                  <Text style={styles.playPrimaryBtnText}>Open Document</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleShare}>
                  <Share2 color="#8B5CF6" size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryActionText, { color: '#8B5CF6' }]}>Share File</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleCopyLink}>
                  <Copy color="#8B5CF6" size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryActionText, { color: '#8B5CF6' }]}>Copy Link</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Bottom Caption Pill (if any accompanying text exists) */}
        {Boolean(media.text && media.text !== media.fileName) && (
          <View style={[styles.captionPill, { marginBottom: insets.bottom + 16 }]}>
            <Text style={styles.captionText}>{media.text}</Text>
          </View>
        )}

        {/* Floating Toast Notification */}
        {Boolean(toastMessage) && (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: toastAnim,
                transform: [
                  {
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
                bottom: insets.bottom + 32,
              },
            ]}
          >
            <Check color="#10B981" size={16} style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        )}

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.97)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Image Styles
  imageScrollView: {
    flex: 1,
    width: '100%',
  },
  imageScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 10, 20, 0.5)',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '500',
  },

  // Error Card Styles
  errorCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    maxWidth: SCREEN_WIDTH - 48,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  errorSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  errorActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A8FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorRetryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  errorCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorCopyText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },

  // Video Styles
  videoCardContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  videoCardBox: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 168, 255, 0.35)',
    elevation: 8,
  },
  videoCardInner: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  videoCenterIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlowBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  playGlowGradient: {
    flex: 1,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCardFooter: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 12,
    padding: 10,
  },
  videoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoCardName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  videoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  videoBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  videoMetaText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  playPrimaryBtn: {
    width: '100%',
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 6,
  },
  playPrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  playPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 16,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryActionText: {
    color: '#00A8FF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Audio Styles
  audioCardContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  audioCardBox: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  audioCardInner: {
    padding: 24,
    alignItems: 'center',
  },
  audioWaveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    gap: 8,
  },
  audioWaveBar: {
    width: 6,
    borderRadius: 3,
  },
  audioMetaInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  audioFileName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  audioDuration: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  // Document Styles
  docCardContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  docCardBox: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  docCardInner: {
    padding: 28,
    alignItems: 'center',
  },
  docLargeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  docTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  docMeta: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },

  // Caption Pill
  captionPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: SCREEN_WIDTH - 48,
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Toast
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default MediaPreviewModal;
