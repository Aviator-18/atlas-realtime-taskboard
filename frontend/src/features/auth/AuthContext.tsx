import React, { useEffect, useState } from 'react';
import type { LoginRequest, RegisterRequest, User } from '../../api/types';
import { authApi, getAuthToken, setAuthToken } from '../../api/client';
import { AuthContext } from './authContextDef';

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const existingToken = getAuthToken();
    if (!existingToken) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    authApi
      .me()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
          setTokenState(existingToken);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthToken(null);
          setTokenState(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: LoginRequest): Promise<User> => {
    const response = await authApi.login(credentials);
    setAuthToken(response.token);
    setTokenState(response.token);
    setUser(response.user);
    return response.user;
  };

  const register = async (data: RegisterRequest): Promise<User> => {
    const response = await authApi.register(data);
    setAuthToken(response.token);
    setTokenState(response.token);
    setUser(response.user);
    return response.user;
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
