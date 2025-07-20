import React, { createContext, useContext, useEffect, useState } from 'react';
import { NetworkStatusBar } from '../components/NetworkStatusBar';
const NetworkContext = createContext();

export function useNetwork() {
    return useContext(NetworkContext);
}

export function NetworkProvider({ children }) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline }}>
            {children}
            <NetworkStatusBar isOnline={isOnline} />
        </NetworkContext.Provider>
    );
}
