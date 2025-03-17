import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios'; // Assuming you're using axios for API requests

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);      // Store admin in state (not localStorage)
  const [loading, setLoading] = useState(true); // For showing a loading state while checking authentication
  const [error, setError] = useState(null);     // Error handling
  const [adminExistence, setAdminExistence] = useState(false);
  // Verify token and fetch admin details from the server
  const verifyTokenAndFetchUser = async (token) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/verify-admin`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        // Successful fetch
        console.log(response.data)
        setAdmin(response.data);
        setError(null);
        setLoading(false);
      } else {
        console.error('Error fetching admin data: ', err);
      }

      // Clear any errors
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to authenticate admin.');
      showNotification('error', 'Failed to authenticate admin')
      setAdmin(null);           // Clear the admin data on failure
      logout();                // Clear token if authentication fails
    }
  };



//   const logVisitorsAndCheckAdmin = async () => {

//     // logging vistors (To add = Check Admin function (later developement))

//     try {
//       const url = '/api/visitors/register-visitors';
//       const response = await axios.get(url);
//       if (response.status === 200) {
//         // console.log(response.data)

//         setAdminExistence(response.data?.adminExists)
//       }
//     }
//     catch (error) {
//       console.error(error);
//     }
//   }



  // On app load, check for token and fetch admin if token is valid
  useEffect(() => {
    const token = localStorage.getItem('jwtToken'); // Only store token in localStorage
    if (token) {
      // console.log(token)
      verifyTokenAndFetchUser(token); // Verify token and fetch admin details
    } else {
    //   logVisitorsAndCheckAdmin();
      setLoading(true); // No token means no admin, stop loading
    }


  }, []);

  // Login function to store token and fetch admin data
  const login = async (token, admin) => {
    localStorage.setItem('jwtToken', token); // Store token securely in localStorage
    // await verifyTokenAndFetchUser(token); // Fetch admin data with the token
    setLoading(false);
    setAdmin(admin);
  };

  // Logout function to clear the token and reset admin
  const logout = () => {
    setAdmin(null);                        // Clear admin data from state
    localStorage.removeItem('jwtToken');     // Clear token from localStorage
    setLoading(false);                    // Stop any loading state
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading, error, adminExistence }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use AuthContext in components
export const useAuth = () => {
  return useContext(AuthContext);

};
