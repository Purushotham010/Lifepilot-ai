import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, setAuthToken as setLocalToken, removeAuthToken } from './api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let savedUser = null;
    try {
      savedUser = localStorage.getItem('user');
    } catch (e) {}
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        try {
          localStorage.removeItem('user');
        } catch (err) {}
      }
    }
    setIsReady(true);
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    setLocalToken(newToken);
    try { localStorage.setItem('user', JSON.stringify(newUser)); } catch (e) {}
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    removeAuthToken();
    try { localStorage.removeItem('user'); } catch (e) {}
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
