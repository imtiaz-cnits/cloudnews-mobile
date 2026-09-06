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

