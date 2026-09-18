import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import storage, { StorageKeys } from '../services/storage';
import {
  updateProfile as apiUpdateProfile,
  login as apiLogin,
  logout as apiLogout,
  getStoredAuth,
  ApiResponse,
  AuthResponse,
} from '../services/api';

export interface UserProfile {
  id?: number | string;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string;
  avatar_url?: string;
  role?: string;
  is_guest?: boolean;
  is_host?: boolean;
}

interface UserContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<ApiResponse<AuthResponse>>;
  logout: () => Promise<void>;
  updateUser: (fields: Partial<UserProfile>) => Promise<void>;
  reloadUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const auth = await getStoredAuth();
      setToken(auth.token);
      setIsAuthenticated(auth.isAuthenticated);
      if (auth.user) {
        setUser(auth.user as UserProfile);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.warn('[UserContext] Error loading user:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const loginUser = useCallback(async (loginIdentifier: string, password: string) => {
    const res = await apiLogin(loginIdentifier, password);
    if (res.success && res.data) {
      setToken(res.data.token);
      setIsAuthenticated(true);
      if (res.data.user) {
        setUser(res.data.user as UserProfile);
      }
    }
    return res;
  }, []);

  const logoutUser = useCallback(async () => {
    await apiLogout();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const updateUser = useCallback(async (fields: Partial<UserProfile>) => {
    try {
      const currentData = await storage.getItem(StorageKeys.USER_DATA);
      let merged: UserProfile = currentData ? JSON.parse(currentData) : {};

      // Merge new fields
      merged = {
        ...merged,
        ...fields,
      };

      // Keep avatar & avatar_url in sync
      if (fields.avatar && !fields.avatar_url) {
        merged.avatar_url = fields.avatar;
      } else if (fields.avatar_url && !fields.avatar) {
        merged.avatar = fields.avatar_url;
      }

      // 1. Immediately update context state for fast UI response
      setUser(merged);

      // 2. Persist to storage
      await storage.setItem(StorageKeys.USER_DATA, JSON.stringify(merged));

      // 3. Sync to API if token exists
      try {
        await apiUpdateProfile({
          name: merged.name,
          avatar_url: merged.avatar || merged.avatar_url,
        });
      } catch (apiErr) {
        console.log('[UserContext] Backend API sync note:', apiErr);
      }
    } catch (err) {
      console.error('[UserContext] Failed to update user:', err);
      throw err;
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login: loginUser,
        logout: logoutUser,
        updateUser,
        reloadUser: loadUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
