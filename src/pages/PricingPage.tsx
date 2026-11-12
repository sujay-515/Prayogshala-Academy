import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Check, ShieldCheck, Loader2 } from 'lucide-react';
import type { UserAccount } from '../types';

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  priceNpr: number;
  currency: string;
}

interface Subscription {
  id: string;
  planId: string | null;
  status: string;
  source: string;
  startsAt: string;
  expiresAt: string;
}

interface PricingPageProps {
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('prayogshala_auth_token_v1');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Auto-submits a gateway form (eSewa ePay v2) as a full-page POST. */
function submitGatewayForm(action: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export const PricingPage: React.FC<PricingPageProps> = ({ currentUser, onOpenAuthModal }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gateways, setGateways] = useState<{ esewa: boolean; khalti: boolean; simulate: boolean }>({
    esewa: false,
    khalti: false,
    simulate: false,
  });
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [fullAccess, setFullAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingCheckout, setPendingCheckout] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/billing/plans').then((r) => r.json()).catch(() => null),
      fetch('/api/billing/status', { headers: authHeaders() }).then((r) => r.json()).catch(() => null),
    ]).then(([plansData, statusData]) => {
      if (cancelled) return;
      if (plansData?.success) {
        setPlans(plansData.plans || []);
        setGateways(plansData.gateways || { esewa: false, khalti: false, simulate: false });
      }
      if (statusData?.success) {
        setFullAccess(Boolean(statusData.fullAccess));
        setSubscription(statusData.subscription || null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const handleCheckout = async (planId: string, gateway: 'esewa' | 'khalti') => {
    setError('');
    setPendingCheckout(`${planId}:${gateway}`);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ planId, gateway }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        onOpenAuthModal();
        return;
      }
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Could not start the checkout. Please try again.');
        return;
      }
      if (data.simulated) {
        setSubscription(data.subscription || null);
        setFullAccess(true);
        return;
      }
      if (data.checkout?.method === 'form') {
        submitGatewayForm(data.checkout.action, data.checkout.fields);
        return;
      }
      if (data.checkout?.method === 'redirect' && data.checkout.url) {
        window.location.href = data.checkout.url;
        return;
      }
      setError('Unexpected checkout response from the server.');
    } catch {
      setError('Network error starting checkout. Please check your connection.');
    } finally {
      setPendingCheckout(null);
    }
  };

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      <title>Pricing &amp; Full Access | Prayogshala Academy</title>
      <meta
        name="description"
        content="Unlock the full 10,000+ laboratory medicine question bank, unlimited mock exams, and Grand Tests with a Prayogshala Academy subscription."
      />

      <header className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-semibold text-amber-800">
          <Crown className="w-3.5 h-3.5" />
          Full Access Plans
        </div>
        <h1 className="text-3xl font-bold text-slate-900">One payment. The whole question bank.</h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Free accounts include 20 practice questions per unit and one full mock exam. Upgrade once to
          unlock every question, unlimited timed mocks, and every weekly Grand Test for the plan duration.
        </p>
      </header>

      {fullAccess && subscription && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Your full access is active</p>
              <p className="text-xs text-emerald-800">
                Valid until {new Date(subscription.expiresAt).toLocaleDateString()} · source: {subscription.source}
              </p>
            </div>
          </div>
          <Link
            to="/practice"
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition"
          >
            Continue Practicing
          </Link>
        </div>
      )}

      {isStaff && (
        <p className="text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          Staff accounts always have full access and cannot purchase subscriptions.
        </p>
      )}

      {error && (
        <p role="alert" className="text-center text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading plans...
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan, idx) => {
            const perMonth = Math.round(plan.priceNpr / Math.max(1, plan.durationDays / 30));
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col gap-4 bg-white shadow-sm ${
                  idx === 1 ? 'border-cyan-400 ring-1 ring-cyan-300' : 'border-slate-200'
                }`}
              >
                {idx === 1 && (
                  <span className="self-start text-[10px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200 rounded-full px-2.5 py-1">
                    Most popular
                  </span>
                )}
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2">
                    NPR {plan.priceNpr.toLocaleString()}
                    <span className="text-sm font-medium text-slate-500"> / {plan.durationDays} days</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">≈ NPR {perMonth.toLocaleString()} per month</p>
                </div>

                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li className="flex gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Entire question bank, all units</li>
                  <li className="flex gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Unlimited timed mock exams</li>
                  <li className="flex gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Every weekly Grand Test</li>
                  <li className="flex gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Full analytics &amp; mistakes tracker</li>
                </ul>

                {currentUser ? (
                  isStaff || (fullAccess && subscription) ? null : (
                    <div className="mt-auto space-y-2">
                      <button
                        type="button"
                        disabled={pendingCheckout !== null}
                        onClick={() => handleCheckout(plan.id, 'esewa')}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold transition cursor-pointer"
                      >
                        {pendingCheckout === `${plan.id}:esewa` ? 'Redirecting...' : 'Pay with eSewa'}
                      </button>
                      <button
                        type="button"
                        disabled={pendingCheckout !== null}
                        onClick={() => handleCheckout(plan.id, 'khalti')}
                        className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-sm font-semibold transition cursor-pointer"
                      >
                        {pendingCheckout === `${plan.id}:khalti` ? 'Redirecting...' : 'Pay with Khalti'}
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={onOpenAuthModal}
                    className="mt-auto w-full py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-semibold transition cursor-pointer"
                  >
                    Sign in to purchase
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] text-slate-500 leading-relaxed">
        Payments are processed securely by eSewa and Khalti; Prayogshala Academy never sees your wallet
        credentials. Activation is instant after gateway confirmation. Manual activation via bank
        transfer is available on request — <Link to="/contact" className="underline text-cyan-700">contact us</Link>.
      </p>
    </div>
  );
};
