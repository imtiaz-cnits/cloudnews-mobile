export interface ThemeColorPalette {
  primary: string;
  accent: string;
  background: string;
  card: string;
  cardSecondary: string;
  cardSubtle: string;
  border: string;
  borderSubtle: string;
  borderActive: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  inputBg: string;
  inputBorder: string;
  searchBg: string;
  iconBoxBg: string;
  modalBg: string;
  modalOverlay: string;
  divider: string;
  headerBg: string;
  statusBar: 'light-content' | 'dark-content';
  statusBarStyle: 'light' | 'dark';
}

export const DarkThemeColors: ThemeColorPalette = {
  primary: '#00A8FF',
  accent: '#38BDF8',
  background: '#050B14',
  card: '#0B1728',
  cardSecondary: 'rgba(15, 27, 48, 0.6)',
  cardSubtle: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderActive: 'rgba(0, 168, 255, 0.35)',
  text: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  inputBg: '#050B14',
  inputBorder: 'rgba(255, 255, 255, 0.12)',
  searchBg: 'rgba(255, 255, 255, 0.07)',
  iconBoxBg: 'rgba(255, 255, 255, 0.06)',
  modalBg: '#0B1728',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  divider: 'rgba(255, 255, 255, 0.06)',
  headerBg: '#050B14',
  statusBar: 'light-content',
  statusBarStyle: 'light',
};

export const LightThemeColors: ThemeColorPalette = {
  primary: '#008CD0',
  accent: '#00A8FF',
  background: '#F4F6F9',
  card: '#FFFFFF',
  cardSecondary: '#FFFFFF',
  cardSubtle: '#F1F5F9',
  border: '#E2E8F0',
  borderSubtle: '#EDF2F7',
  borderActive: '#008CD0',
  text: '#0F172A',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  searchBg: '#E2E8F0',
  iconBoxBg: 'rgba(0, 140, 208, 0.08)',
  modalBg: '#FFFFFF',
  modalOverlay: 'rgba(15, 23, 42, 0.5)',
  divider: '#E2E8F0',
  headerBg: '#F4F6F9',
  statusBar: 'dark-content',
  statusBarStyle: 'dark',
};

export const Colors = {
  // Brand Tokens
  primary: '#0284C7',
  accent: '#38BDF8',
  backgroundDark: '#040912',
  cardDark: '#0B1728',

  // Gradients
  gradients: {
    primary: ['#0F2D54', '#1E4E8C'] as const,
    accent: ['#0284C7', '#38BDF8'] as const,
    dark: ['#040912', '#0B1728'] as const,
    danger: ['#DC2626', '#991B1B'] as const,
  },

  // Glassmorphic tokens
  glass: {
    background: 'rgba(11, 23, 40, 0.75)',
    backgroundLight: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(56, 189, 248, 0.25)',
    borderLight: 'rgba(255, 255, 255, 0.15)',
  },

  // Typography & UI
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: '#040912',
  },

  // Status & Feedback
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
  },

  // Controls & Translucent Overlays
  controlOverlay: 'rgba(15, 23, 42, 0.85)',
  activeIndicator: '#22C55E',
  inactiveIndicator: '#64748B',
};

export default Colors;
