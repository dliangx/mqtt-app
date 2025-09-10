import type { ReactNode } from 'react';

import { useState, useEffect, useContext, createContext } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode = 'light' }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Try to get from localStorage first
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
      return savedMode;
    }

    // Fallback to system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }

    return defaultMode;
  });

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('theme-mode', mode);

    // Update data attribute for CSS variables
    document.documentElement.setAttribute('data-color-scheme', mode);
  }, [mode]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const value: ThemeContextType = {
    mode,
    toggleMode,
    setMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
