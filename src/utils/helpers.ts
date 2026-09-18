import { Platform, TextStyle } from 'react-native';

/**
 * Utility helper functions for Cloud News mobile client.
 */

export function sanitizeRoomName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
}

export function generateParticipantIdentity(prefix = 'user'): string {
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${randomSuffix}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.substring(0, maxLength - 1)}…`;
}

/**
 * Regex matching CJK characters (Chinese Hanzi, Japanese Kana, Korean Hangul)
 */
export const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/;

/**
 * Check whether a string contains Chinese, Japanese, or Korean characters.
 */
export function hasCJK(str?: string): boolean {
  if (!str) return false;
  return CJK_REGEX.test(str);
}

/**
 * Robust initials extractor supporting both Latin names and CJK (Chinese / Japanese / Korean) names.
 * For Latin names: "Imtiaz Ahmed" -> "IA", "Antigravity" -> "AN"
 * For CJK names: "嘻嘻嘻嘻嘻" -> "嘻嘻", "王小明" -> "小明", "张伟" -> "张伟", "李" -> "李"
 */
export function getInitials(name?: string, fallback = '??'): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  if (hasCJK(trimmed)) {
    const chars = Array.from(trimmed.replace(/\s+/g, ''));
    if (chars.length <= 2) return chars.join('');
    // For 3+ char CJK names (e.g. 王小明, 嘻嘻嘻嘻嘻), use last 2 characters (standard Asian app convention)
    return chars.slice(-2).join('');
  }

  const parts = trimmed.split(' ').filter(p => p.length > 0);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

/**
 * Returns font style adjustments for CJK avatar text so it never renders blank
 * due to Latin-only custom font files (e.g. PlusJakartaSans-Bold).
 */
export function getAvatarTextStyle(nameOrInitials?: string, baseFontSize?: number): TextStyle {
  if (hasCJK(nameOrInitials)) {
    return {
      fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
      fontWeight: '700',
      includeFontPadding: false,
      ...(baseFontSize ? { fontSize: Math.round(baseFontSize * 0.8) } : {}),
    };
  }
  return {
    includeFontPadding: false,
  };
}

