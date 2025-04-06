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
        console.log('User Verified:', response.data);
        setUser(response.data);
        setLoading(false);
        setError(null);
      } else {
        console.error('Verification failed:', response);
        setUser(null);
      }
    } catch (err) {
      console.error('Error verifying user:', err);
      setError('Failed to authenticate user');
      setUser(null);
      logout();
    }
  };


  useEffect(() => {
    verifyUserFromCookie();
  }, []);


  // Logout function
  const logout = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`, {}, {
        withCredentials: true,
      });

      // if (response.status === 403) // invalid or forbidden token
      //   setUser(null);

      setUser(null);
      setLoading(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }


    //  On component mount, verify the user from cookies
    
  }

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
