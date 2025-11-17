// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

// Keys for localStorage (only user now)
const USER_KEY = "user-data";
const USER_TOKEN_KEY = "user-token";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);   // logged-in QE user
  const [token, setToken] = useState(null); // JWT token
  const [loading, setLoading] = useState(true);

  // Load saved data from storage
  useEffect(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    const savedToken = localStorage.getItem(USER_TOKEN_KEY);

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedToken) {
      setToken(savedToken);
    }

    setLoading(false);
  }, []);

  // Generic login helper
  const setLoginData = (userData) => {
    if (!userData) return;

    setUser(userData);
    setToken(userData?.token || null);

    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    if (userData.token) {
      localStorage.setItem(USER_TOKEN_KEY, userData.token);
    }
  };

  // LOGOUT
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_TOKEN_KEY);
  };

  const isLoggedIn = Boolean(user && token);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoggedIn,
        setLoginData,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
