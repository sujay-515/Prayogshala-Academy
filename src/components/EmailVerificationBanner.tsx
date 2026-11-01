import React, { useState } from 'react';
import { MailWarning } from 'lucide-react';

interface EmailVerificationBannerProps {
  authToken: string | null;
  email: string;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ authToken, email }) => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const resend = async () => {
    if (!authToken) return;
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.delivered === false) {
        setStatus('error');
        setMessage(data.message || 'Email delivery failed in this environment.');
      } else if (res.ok && data?.success) {
        setStatus('sent');
        setMessage(data.message || 'Verification email sent. Check your inbox.');
      } else {
        setStatus('error');
        setMessage(data?.error || 'Could not send the verification email.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error while requesting a verification email.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-3">
      <div
        role="status"
        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-start gap-2">
          <MailWarning className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed">
            <strong>Verify your email.</strong> Grand Test attempts are not ranked until{' '}
            <strong>{email}</strong> is confirmed. Check your inbox, or request another link.
          </p>
        </div>
        <button
          type="button"
          onClick={resend}
          disabled={status === 'sending' || !authToken || status === 'sent'}
          className="px-3 py-1.5 rounded-md bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-medium shrink-0 cursor-pointer transition-colors"
        >
          {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Email sent' : 'Resend verification email'}
        </button>
      </div>
      {message && (
        <p
          role={status === 'error' ? 'alert' : 'status'}
          className={`mt-1.5 text-[11px] ${status === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}
        >
          {message}
        </p>
      )}
    </div>
  );
};
