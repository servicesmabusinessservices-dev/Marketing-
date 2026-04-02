import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Enforce dark theme globally for consistent contrast across all screens.
    setIsDark(true);
    localStorage.setItem('theme', 'dark');
    
    // Apply theme class directly to document element to avoid wrapper div issues
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.add('dark-theme');
  }, []);

  const toggleTheme = () => {
    // Keep dark mode locked to avoid low-contrast light variants.
    setIsDark(true);
    localStorage.setItem('theme', 'dark');
    
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.add('dark-theme');
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
