import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => Promise<void>;
  onError: (error: string) => void;
  isLoading: boolean;
  theme?: 'light' | 'dark';
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let gsiScriptLoadingPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiScriptLoadingPromise) return gsiScriptLoadingPromise;

  gsiScriptLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('GIS script failed')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiScriptLoadingPromise = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.body.appendChild(script);
  });

  return gsiScriptLoadingPromise;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  isLoading,
  theme = 'light',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(() => Boolean(typeof window !== 'undefined' && window.google?.accounts?.id));
  const [loadError, setLoadError] = useState<boolean>(false);

  // Keep fresh callback references to avoid stale closures
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const clientId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) || '';

  useEffect(() => {
    if (!clientId) return;

    let isMounted = true;
    loadGsiScript()
      .then(() => {
        if (isMounted) setScriptLoaded(true);
      })
      .catch(() => {
        if (isMounted) setLoadError(true);
      });

    return () => {
      isMounted = false;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {}
    };
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !scriptLoaded || loadError || !containerRef.current || !window.google?.accounts?.id) {
      return;
    }

    const container = containerRef.current;
    container.innerHTML = '';

    const handleCredentialResponse = async (response: any) => {
      if (!response?.credential) {
        onErrorRef.current('Google authentication did not provide credentials.');
        return;
      }
      try {
        await onSuccessRef.current(response.credential);
      } catch (err: any) {
        onErrorRef.current(err.message || 'Google sign-in failed.');
      }
    };

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Compute pixel width clamped between 220 and 360
    const containerWidth = container.offsetWidth || 300;
    const pixelWidth = Math.max(220, Math.min(360, Math.floor(containerWidth)));

    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      shape: 'rectangular',
      theme: theme === 'dark' ? 'filled_black' : 'outline',
      text: 'continue_with',
      size: 'large',
      logo_alignment: 'left',
      width: pixelWidth,
    });
  }, [clientId, scriptLoaded, loadError, theme]);

  if (!clientId || loadError) {
    return null;
  }

  return (
    <div className="relative w-full flex flex-col items-center justify-center my-2">
      <div
        ref={containerRef}
        className={`w-full flex justify-center min-h-[44px] transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
        aria-busy={isLoading}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 rounded-lg">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <svg className="animate-spin h-4 w-4 text-cyan-700 dark:text-cyan-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Connecting to MedLab QBank...</span>
          </div>
        </div>
      )}
    </div>
  );
};
