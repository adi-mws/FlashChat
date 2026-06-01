import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from './NotificationContext';

const AuthContext = createContext();



export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);         // Store user info
  const [loading, setLoading] = useState(true);   // Loading state
  const [error, setError] = useState(null);       // Error handling
  const [userExistence, setUserExistence] = useState(false);
  const { showNotification } = useNotification();
  // Verify user based on HTTP-only cookie
  const verifyUserFromCookie = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/auth/verify-user`, {
        withCredentials: true,   // Include cookies
      });

      if (response.status === 200) {
        setUser(response.data);
        setError(null);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {

      verifyUserFromCookie();
   
  }, []);


  // Logout function
  const logout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`, {}, {
        withCredentials: true,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loading,
      error,
      setLoading,
      logout,
      userExistence
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ustom hook to use AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};
