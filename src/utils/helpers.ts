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

