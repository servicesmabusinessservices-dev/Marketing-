import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Enforce dark theme globally for consistent contrast across all screens.
    setIsDark(true);
    localStorage.setItem('theme', 'dark');
  }, []);

  const toggleTheme = () => {
    // Keep dark mode locked to avoid low-contrast light variants.
    setIsDark(true);
    localStorage.setItem('theme', 'dark');
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className={isDark ? 'dark-theme' : 'light-theme'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
