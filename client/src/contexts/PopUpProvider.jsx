import React, { createContext, useContext, useState, useEffect } from 'react';

const PopUpContext = createContext();


export const PopUpProvider = ({ children }) => {
    
    const [showSearchUsers, setShowSearchUsers] = useState(false);  
 
    return (
        <PopUpContext.Provider value={{ showSearchUsers, setShowSearchUsers }}>
            {children}
        </PopUpContext.Provider>
    );
};
export const usePopUp = () => useContext(PopUpContext);
