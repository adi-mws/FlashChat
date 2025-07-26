import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();


export const ThemeProvider = ({ children }) => {
    
    const [theme, setTheme] = useState('light');  
   

    useEffect(() => {
        setTheme('dark');
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
