import React, { createContext, useContext, useState } from 'react';
import { AppTheme, defaultTheme, highContrastTheme } from '../theme';

export type ThemeMode = 'default' | 'high-contrast';

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode;
  toggleTheme: () => void;
  isHighContrast: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  mode: 'default',
  toggleTheme: () => {},
  isHighContrast: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('default');

  const activeTheme = mode === 'high-contrast' ? highContrastTheme : defaultTheme;

  const toggleTheme = () =>
    setMode(prev => (prev === 'default' ? 'high-contrast' : 'default'));

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme,
        mode,
        toggleTheme,
        isHighContrast: mode === 'high-contrast',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
