export type AppTheme = {
  colors: {
    primary: string;
    background: string;
    text: string;
    card: string;
    border: string;
    accent: string;
    danger: string;
    /** Soccer pitch surface colour */
    fieldSurface: string;
    /** Soccer pitch line colour */
    fieldLines: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: string };
    h2: { fontSize: number; fontWeight: string };
    body: { fontSize: number };
  };
};

export const defaultTheme: AppTheme = {
  colors: {
    primary: '#007BFF',
    background: '#F0F4F8',
    text: '#212529',
    card: '#FFFFFF',
    border: '#CED4DA',
    accent: '#FFC107',
    danger: '#DC3545',
    fieldSurface: '#4CAF50',
    fieldLines: '#FFFFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: 'bold' },
    body: { fontSize: 16 },
  },
};

/**
 * High-contrast variant — off-white background, pure-black text, field rendered
 * in parchment with black lines for maximum outdoor / sunlight legibility.
 */
export const highContrastTheme: AppTheme = {
  colors: {
    primary: '#0044BB',
    background: '#F8F8F4',
    text: '#000000',
    card: '#FFFFFF',
    border: '#222222',
    accent: '#E65C00',
    danger: '#C00000',
    fieldSurface: '#E8E8DC',
    fieldLines: '#000000',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: 'bold' },
    body: { fontSize: 16 },
  },
};

// Backward-compatible export — code that does `import { theme }` still works.
export const theme = defaultTheme;
