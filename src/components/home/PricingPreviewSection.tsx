import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Crown, Lock, UserPlus } from 'lucide-react';
import type { UserAccount } from '../../types';
import {
  DEFAULT_BILLING_PLANS,
  FREE_TIER_LIMITS,
  type BillingPlanPreview,
} from './homeMockData';
import { useScrollReveal } from './homeMotion';

interface PricingPreviewSectionProps {
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onStartPractice: () => void;
}

const PAID_PLAN_FEATURES = [
  'Entire question bank, all units',
  'Unlimited timed mock exams',
  'Every weekly Grand Test',
  'Full analytics & mistakes tracker',
] as const;

export const PricingPreviewSection: React.FC<PricingPreviewSectionProps> = ({
  currentUser,
  onOpenAuthModal,
  onStartPractice,
}) => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>(0.08);
  const [plans, setPlans] = useState<BillingPlanPreview[]>(DEFAULT_BILLING_PLANS);
  const isGuest = !currentUser;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/plans')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.success && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(data.plans);
        }
      })
      .catch(() => {
        // Keep seeded fallback plans if offline or API unavailable
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openGuestSignup = () => {
    if (onOpenAuthModal) {
      onOpenAuthModal('register');
    } else {
      onStartPractice();
    }
  };

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="py-14 sm:py-20 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      <div
        ref={ref}
        className={`hp-reveal ${isVisible ? 'is-visible' : ''} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
              <Crown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>04 · Free vs Full Access</span>
            </div>
            <h2
              id="pricing-heading"
              className="font-serif-heading text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance"
            >
              One Payment. Whole Question Bank.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 line-clamp-2">
              Free accounts start with unit previews. Upgrade via eSewa or Khalti for full access.
            </p>
          </div>

          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 min-h-[44px] text-xs sm:text-sm font-bold text-cyan-700 dark:text-cyan-400 hover:underline shrink-0"
          >
            <span>Compare full pricing &amp; checkout</span>
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>

        {/* Free Account vs 3 Paid Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Free Account Card */}
          <article className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between gap-5 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-cyan-500">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-2.5 py-0.5">
                  Free Account
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 pt-1">
                  Starter Access
                </h3>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                  NPR 0
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400"> / always free</span>
                </p>
              </div>

              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2" role="list">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{FREE_TIER_LIMITS.practicePerUnit} practice questions per unit</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{FREE_TIER_LIMITS.freeMockExams} full mock exam included</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Saved progress on sign-up</span>
                </li>
              </ul>
            </div>

            {isGuest ? (
              <button
                type="button"
                onClick={openGuestSignup}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-bold transition-[border-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
              >
                <UserPlus className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                <span>Create Free Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartPractice}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-bold transition-[border-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
              >
                <span>Continue Practice</span>
                <ArrowRight className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
              </button>
            )}
          </article>

          {/* Mirrored Paid Full-Access Plans */}
          {plans.map((plan, idx) => {
            const isPopular = idx === 1;
            const perMonth = Math.round(plan.priceNpr / Math.max(1, plan.durationDays / 30));

            return (
              <article
                key={plan.id}
                className={`rounded-2xl bg-slate-50 dark:bg-slate-950 border p-5 sm:p-6 flex flex-col justify-between gap-5 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 ${
                  isPopular
                    ? 'border-cyan-500 ring-1 ring-cyan-400/50'
                    : 'border-slate-200 dark:border-slate-800 hover:border-cyan-500'
                }`}
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    {isPopular ? (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 bg-cyan-50 border border-cyan-200 rounded-full px-2.5 py-0.5">
                        Most popular
                      </span>
                    ) : (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                        Full Access
                      </span>
                    )}

                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 pt-1">
                      {plan.name}
                    </h3>
                    <div className="space-y-0.5">
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                        {plan.currency} {plan.priceNpr.toLocaleString()}
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {' '}
                          / {plan.durationDays} days
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        ≈ {plan.currency} {perMonth.toLocaleString()} per month
                      </p>
                    </div>
                  </div>

                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2" role="list">
                    {PAID_PLAN_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check
                          className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isGuest ? (
                  <button
                    type="button"
                    onClick={openGuestSignup}
                    className={`inline-flex items-center justify-center gap-1.5 w-full py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation ${
                      isPopular
                        ? 'bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d]'
                        : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Sign up to unlock</span>
                  </button>
                ) : (
                  <Link
                    to="/pricing"
                    className={`inline-flex items-center justify-center gap-1.5 w-full py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] ${
                      isPopular
                        ? 'bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d]'
                        : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <span>View Checkout</span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </Link>
                )}
              </article>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          Instant activation via eSewa &amp; Khalti.{' '}
          <Link to="/pricing" className="underline font-semibold text-cyan-700 dark:text-cyan-400">
            See full payment details on /pricing
          </Link>
          .
        </p>
      </div>
    </section>
  );
};
