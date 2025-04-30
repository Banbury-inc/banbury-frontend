import React, { createContext, useContext, useState, useEffect } from 'react';
import defaultTheme from '../themes/theme';
import spotifyTheme from '../themes/theme_spotify';
import materialUITheme from '../themes/theme_materialui';
import theme2 from '../themes/theme2';
import theme3 from '../themes/theme3';
import theme4 from '../themes/theme4';

export type ThemeName = 'default' | 'spotify' | 'materialui' | 'theme2' | 'theme3' | 'theme4';

interface ThemeContextType {
  themeName: ThemeName;
  theme: typeof defaultTheme;
  setTheme: (name: ThemeName) => void;
}

const themeMap = {
  default: defaultTheme,
  spotify: spotifyTheme,
  materialui: materialUITheme,
  theme2: theme2,
  theme3: theme3,
  theme4: theme4,
};

const LOCAL_STORAGE_KEY = 'banbury-theme';

const ThemeContext = createContext<ThemeContextType>({
  themeName: 'default',
  theme: defaultTheme,
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    // Try to get the theme from localStorage
    const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEY);
    return (savedTheme as ThemeName) || 'default';
  });

  // Get the actual theme object based on the theme name
  const theme = themeMap[themeName] || defaultTheme;

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, themeName);
  }, [themeName]);

  const setTheme = (name: ThemeName) => {
    setThemeName(name);
  };

  return (
    <ThemeContext.Provider value={{ themeName, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 