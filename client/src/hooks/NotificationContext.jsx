import React, { createContext, useContext, useState, useEffect } from 'react';
import './contexts.css';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = (type, message) => {
        const id = new Date().getTime();
        setNotifications((prev) => [...prev, { id, type, message }]);
    };

    const removeNotification = (id) => {
        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    };

    useEffect(() => {
        if (notifications.length > 0) {
            const timer = setTimeout(() => {
                setNotifications((prev) => prev.slice(1)); // Remove the oldest notification
            }, 5000); // Remove after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [notifications]);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="notification-table-container z-[2000]">
                <table className="notification-table">
                    <tbody>
                        {notifications.map((notification) => (
                            <tr key={notification.id} className={`notification-${notification.type}`}>
                                <td>{notification.message}</td>
                                <td>
                                    <button
                                        className="close-button"
                                        onClick={() => removeNotification(notification.id)}
                                    >
                                        <i className='fa-solid fa-xmark'></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </NotificationContext.Provider>
    );
};
