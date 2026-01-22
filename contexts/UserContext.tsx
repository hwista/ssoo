'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// 사용자 인터페이스
interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
}

// Context 인터페이스
interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
}

// Context 생성
const UserContext = createContext<UserContextType | null>(null);

// Provider 컴포넌트
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 로컬 스토리지에서 사용자 정보 복원
  useEffect(() => {
    const storedUser = localStorage.getItem('wiki_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('wiki_user');
      }
    }
    setIsLoading(false);
  }, []);

  // 로그인
  const login = useCallback(async (username: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username })
      });

      const data = await response.json();

      if (!response.ok) {
        // 사용자가 없으면 새로 생성
        if (response.status === 404) {
          const createResponse = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              displayName: username,
              role: 'editor'
            })
          });

          const createData = await createResponse.json();

          if (createResponse.ok) {
            setUser(createData.user);
            localStorage.setItem('wiki_user', JSON.stringify(createData.user));
            return true;
          }
        }

        throw new Error(data.error || '로그인 실패');
      }

      setUser(data.user);
      localStorage.setItem('wiki_user', JSON.stringify(data.user));
      return true;

    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 로그아웃
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('wiki_user');
  }, []);

  // 프로필 업데이트
  const updateProfile = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, ...updates })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '프로필 업데이트 실패');
      }

      setUser(data.user);
      localStorage.setItem('wiki_user', JSON.stringify(data.user));
      return true;

    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 업데이트 중 오류가 발생했습니다');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return (
    <UserContext.Provider value={{
      user,
      isLoading,
      error,
      login,
      logout,
      updateProfile
    }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
