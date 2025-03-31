import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);         // Store user info
  const [loading, setLoading] = useState(true);   // Loading state
  const [error, setError] = useState(null);       // Error handling
  const [userExistence, setUserExistence] = useState(false);

  // Verify user based on HTTP-only cookie
  const verifyUserFromCookie = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/auth/verify-user`, {
        withCredentials: true,   // Include cookies
      });

      if (response.status === 200) {
        console.log('User Verified:', response.data);
        setUser(response.data.user);    
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

  // Manual Login with email & password
  const manualLogin = async (data) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        data,
        { withCredentials: true }  // Store JWT in HTTP-only cookie
      );

      if (response.status === 200) {
        setUser(response.data.user);    // Store user data
        setLoading(false);
        setError(null);
      }
    } catch (error) {
      console.error('Login failed:', error);
      showNotification('error', error.response?.data?.message ?? 'Internal Server Error');
      setError('Invalid credentials');
      setUser(null);
    }
  };

  // Google Authentication function
  const handleGoogleLogin = async () => {
    try {
      window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;  // Redirect to Google OAuth
    } catch (error) {
      console.error('Google Auth Error:', error);
      setError('Failed to authenticate with Google');
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`, {}, {
        withCredentials: true,
      });

      setUser(null);
      setLoading(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  //  On component mount, verify the user from cookies
  useEffect(() => {
    verifyUserFromCookie();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      manualLogin, 
      handleGoogleLogin, 
      logout, 
      userExistence 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Custom hook to use AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};
