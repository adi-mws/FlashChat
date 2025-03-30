import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();


export const ThemeProvider = ({ children }) => {
    
    const [theme, setTheme] = useState('light');  
    const getCurrentTheme = () => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    useEffect(() => {
        setTheme(getCurrentTheme());
    }, [])
    useEffect(() => {
        const root = window.document.documentElement; 

        root.classList.remove('dark', 'light');
        root.classList.add(theme);

    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
export const useTheme = () => useContext(ThemeContext);
