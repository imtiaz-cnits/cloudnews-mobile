/**
 * File size validation utility
 * Enforces 5MB upper limit across Meeting Chat and Host Messaging
 */

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FILE_SIZE_MB = 5.0;

export const parseFileSizeInBytes = (sizeStr: string): number => {
  if (!sizeStr) return 0;
  const clean = sizeStr.trim();
  const match = clean.match(/^([\d.]+)\s*(GB|MB|KB|B)?$/i);
  if (!match) return 0;

  const val = parseFloat(match[1]);
  if (isNaN(val)) return 0;

  const unit = (match[2] || 'MB').toUpperCase();
  switch (unit) {
    case 'GB':
      return val * 1024 * 1024 * 1024;
    case 'MB':
      return val * 1024 * 1024;
    case 'KB':
      return val * 1024;
    case 'B':
    default:
      return val;
  }
};

export const formatBytes = (bytes: number): string => {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const validateFileSize = (
  fileSizeBytesOrString: number | string
): { isValid: boolean; sizeBytes: number; sizeFormatted: string; exceedsMessage: string } => {
  let sizeBytes = 0;
  if (typeof fileSizeBytesOrString === 'number') {
    sizeBytes = fileSizeBytesOrString;
  } else {
    sizeBytes = parseFileSizeInBytes(fileSizeBytesOrString);
  }

  const isValid = sizeBytes <= MAX_FILE_SIZE_BYTES;
  const sizeFormatted = formatBytes(sizeBytes);
  const exceedsMessage = `Selected file is ${sizeFormatted}, which exceeds the 5MB maximum limit.`;

  return {
    isValid,
    sizeBytes,
    sizeFormatted,
    exceedsMessage,
  };
};
