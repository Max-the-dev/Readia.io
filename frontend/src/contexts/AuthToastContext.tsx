import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AuthToastContextType {
  isOpen: boolean;
  message: string;
  showAuthToast: (message: string) => void;
  hideAuthToast: () => void;
}

const AuthToastContext = createContext<AuthToastContextType | undefined>(undefined);

export function AuthToastProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const showAuthToast = useCallback((msg: string) => {
    setMessage(msg);
    setIsOpen(true);
  }, []);

  const hideAuthToast = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthToastContext.Provider value={{ isOpen, message, showAuthToast, hideAuthToast }}>
      {children}
    </AuthToastContext.Provider>
  );
}

export function useAuthToast() {
  const context = useContext(AuthToastContext);
  if (!context) {
    throw new Error('useAuthToast must be used within AuthToastProvider');
  }
  return context;
}
