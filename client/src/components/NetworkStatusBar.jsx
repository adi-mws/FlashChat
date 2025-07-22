import React, { useEffect, useState } from 'react';

export function NetworkStatusBar({ isOnline }) {
    const [showBar, setShowBar] = useState(!isOnline);

    useEffect(() => {
        if (!isOnline) {
            setShowBar(true); 
        } else {
            setShowBar(true); 
            const timer = setTimeout(() => {
                setShowBar(false); 
            }, 3000);

            return () => clearTimeout(timer); 
        }
    }, [isOnline]);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                backgroundColor: isOnline ? '#4caf50' : '#f44336',
                color: 'white',
                textAlign: 'center',
                padding: '6px 0',
                display: 'none',
                fontSize: '14px',
                transition: 'transform 0.3s ease',
                transform: showBar ? 'translateY(0)' : 'translateY(-100%)',
            }}
        >
            {isOnline ? 'Back Online' : 'No Internet Connection'}
        </div>
    );
}
