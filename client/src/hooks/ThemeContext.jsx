import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();


export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('dark');  

    useEffect(() => {
        const root = window.document.documentElement; 
        root.classList.remove('light');
        root.classList.add('dark');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme: () => {} }}>
            {children}
        </ThemeContext.Provider>
    );
};
export const useTheme = () => useContext(ThemeContext);
