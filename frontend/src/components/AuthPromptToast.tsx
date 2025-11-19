import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WalletMinimal } from 'lucide-react';
import { useAuthToast } from '../contexts/AuthToastContext';
import { useAuth } from '../contexts/AuthContext';

function AuthPromptToast() {
  const { isOpen, message, hideAuthToast } = useAuthToast();
  const { login, isAuthenticating } = useAuth();

  // Auto-close after 5 seconds
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      hideAuthToast();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isOpen, hideAuthToast]);

  const handleAuthenticate = async () => {
    await login();
    // LikeButton will handle retry logic via its useEffect
  };

  if (!isOpen) return null;

  // Render to document.body using portal
  return createPortal(
    <div className="auth-toast-overlay" onClick={hideAuthToast}>
      <div className="auth-toast" onClick={(e) => e.stopPropagation()}>
        <div className="auth-toast__content">
          <p className="auth-toast__message">{message}</p>
          <button
            className="wallet-connect-button wallet-connect-button--disconnected"
            type="button"
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
          >
            <WalletMinimal
              size={16}
              strokeWidth={2.4}
              className="wallet-connect-button--disconnected__icon"
              aria-hidden="true"
            />
            <span className="wallet-connect-button__text wallet-connect-button--disconnected__label">
              {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AuthPromptToast;
