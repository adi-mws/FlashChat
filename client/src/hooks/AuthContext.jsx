import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { initializeUserKeys } from '../utils/crypto';

const AuthContext = createContext();



export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);         // Store user info
  const [loading, setLoading] = useState(true);   // Loading state
  const [error, setError] = useState(null);       // Error handling

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
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    verifyUserFromCookie();
  }, []);

  useEffect(() => {
    const initE2EE = async () => {
      if (user) {
        const localPrivateKeyName = `e2ee_private_key_${user.username}`;
        const hasLocalKey = localStorage.getItem(localPrivateKeyName);
        if (!user.publicKey || !hasLocalKey) {
          try {
            if (!hasLocalKey) {
              localStorage.removeItem(`e2ee_public_key_${user.username}`);
            }
            const pubKey = await initializeUserKeys(user.username);
            await axios.put(
              `${import.meta.env.VITE_API_URL}/user/public-key`,
              { publicKey: pubKey },
              { withCredentials: true }
            );
            setUser(prev => prev ? { ...prev, publicKey: pubKey } : null);
            console.log("E2EE Key pair initialized and registered.");
          } catch (error) {
            console.error("Failed to initialize E2EE keys:", error);
          }
        }
      }
    };
    initE2EE();
  }, [user]);


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
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ustom hook to use AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
