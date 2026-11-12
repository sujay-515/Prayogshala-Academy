import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, MailCheck } from 'lucide-react';

type VerifyState = 'checking' | 'success' | 'error';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState<VerifyState>('checking');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is missing its token. Open the link from your email again.');
      return;
    }

    let cancelled = false;
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.success) {
          setState('success');
          setMessage(data.message || 'Email verified successfully.');
          try {
            const saved = localStorage.getItem('prayogshala_current_user_v1');
            if (saved) {
              const user = JSON.parse(saved);
              user.emailVerified = true;
              localStorage.setItem('prayogshala_current_user_v1', JSON.stringify(user));
            }
          } catch {
            // Ignore storage errors; the next bootstrap refresh will update the flag.
          }
        } else {
          setState('error');
          setMessage(data?.error || 'We could not verify this link.');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
        setMessage('Network error while verifying your email. Please try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <title>Verify Email | Prayogshala Academy</title>
      <meta name="robots" content="noindex,nofollow" />
      <div className="glass-panel rounded-2xl p-8 text-center space-y-4">
        {state === 'checking' && (
          <>
            <Loader2 className="w-9 h-9 text-cyan-700 mx-auto animate-spin" />
            <h1 className="text-lg font-semibold text-slate-900">Verifying your email</h1>
            <p className="text-xs text-slate-600">{message}</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h1 className="text-lg font-semibold text-slate-900">Email verified</h1>
            <p className="text-xs text-slate-600">{message}</p>
            <p className="text-xs text-slate-500">
              Your Grand Test attempts will now appear on the weekly leaderboard.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-medium"
            >
              <MailCheck className="w-3.5 h-3.5" />
              Go to dashboard
            </a>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h1 className="text-lg font-semibold text-slate-900">Verification failed</h1>
            <p className="text-xs text-slate-600">{message}</p>
            <p className="text-xs text-slate-500">
              Sign in and use “Resend verification email” from the dashboard banner to get a fresh link.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
            >
              Return home
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
