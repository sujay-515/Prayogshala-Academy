import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type ResultState = 'loading' | 'success' | 'failure';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('medlab_qbank_auth_token_v1');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Landing page after a hosted gateway redirect.
 * - eSewa: activation already happened server-side in /api/billing/esewa/callback;
 *   we only render ?status=success|failure.
 * - Khalti: the gateway appends ?pidx=...; we confirm server-side before claiming success.
 */
export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const gateway = searchParams.get('gateway') || '';
  const initialStatus = searchParams.get('status') || '';
  const pidx = searchParams.get('pidx') || '';

  const [state, setState] = useState<ResultState>(() => {
    if (gateway === 'khalti' && pidx) return 'loading';
    return initialStatus === 'success' ? 'success' : initialStatus === 'failure' ? 'failure' : 'loading';
  });
  const [message, setMessage] = useState('');
  const verifyStarted = useRef(false);

  useEffect(() => {
    if (gateway !== 'khalti' || !pidx || verifyStarted.current) return;
    verifyStarted.current = true;

    fetch('/api/billing/khalti/verify', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ pidx }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setState('success');
        } else {
          setMessage(data?.error || 'The payment could not be confirmed.');
          setState('failure');
        }
      })
      .catch(() => {
        setMessage('Network error while confirming the payment.');
        setState('failure');
      });
  }, [gateway, pidx]);

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-5">
      <title>Payment Result | MedLab QBank</title>
      <meta name="robots" content="noindex,nofollow" />

      {state === 'loading' && (
        <>
          <Loader2 className="w-10 h-10 text-cyan-700 animate-spin mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Confirming your payment...</h1>
          <p className="text-sm text-slate-600">Please wait while we verify the transaction with {gateway || 'the gateway'}.</p>
        </>
      )}

      {state === 'success' && (
        <>
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Payment successful</h1>
          <p className="text-sm text-slate-600">
            Your full access is now active — the entire question bank and unlimited mock exams are unlocked.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/practice"
              className="px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-semibold transition"
            >
              Start Practicing
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
            >
              View Dashboard
            </Link>
          </div>
        </>
      )}

      {state === 'failure' && (
        <>
          <XCircle className="w-12 h-12 text-rose-600 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Payment not completed</h1>
          <p className="text-sm text-slate-600">
            {message || 'The transaction was cancelled or could not be verified. You have not been charged.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/pricing"
              className="px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-semibold transition"
            >
              Try Again
            </Link>
            <Link
              to="/contact"
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
            >
              Contact Support
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
