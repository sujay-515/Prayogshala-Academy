import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Returns true when the user prefers reduced motion in OS/browser settings. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/** Observes an element once and sets `isVisible` true when it enters the viewport. */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.1
): { ref: React.RefObject<T | null>; isVisible: boolean } {
  const ref = useRef<T | null>(null);
  const prefersReduced = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin: '0px 0px -24px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced, threshold]);

  return { ref, isVisible };
}

/** Animates a positive integer from 0 to `target` using transform-free rAF text updates. */
export function useCountUp(target: number, isVisible: boolean, durationMs = 850): number {
  const prefersReduced = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(() =>
    prefersReduced || !isVisible ? Math.max(0, Math.round(target)) : 0
  );

  useEffect(() => {
    const safeTarget = Math.max(0, Math.round(target));
    if (safeTarget === 0) {
      setDisplayValue(0);
      return;
    }
    if (prefersReduced || !isVisible || typeof window === 'undefined') {
      setDisplayValue(safeTarget);
      return;
    }

    let frameId = 0;
    let startTs: number | null = null;

    const tick = (now: number) => {
      if (startTs === null) startTs = now;
      const elapsed = now - startTs;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(safeTarget * eased));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setDisplayValue(safeTarget);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [target, isVisible, durationMs, prefersReduced]);

  return displayValue;
}

interface HorizontalSnapScrollerProps {
  ariaLabel: string;
  scrollHintText?: string;
  fadeFromClass?: string;
  children: React.ReactNode;
}

/** Keyboard-accessible, scroll-snap horizontal card rail with edge fades and nav buttons. */
export const HorizontalSnapScroller: React.FC<HorizontalSnapScrollerProps> = ({
  ariaLabel,
  scrollHintText = 'Scroll or use arrow keys',
  fadeFromClass = 'from-slate-50 dark:from-[#081420]',
  children,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = usePrefersReducedMotion();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const syncScrollEdges = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    syncScrollEdges();
    window.addEventListener('resize', syncScrollEdges);
    return () => window.removeEventListener('resize', syncScrollEdges);
  }, []);

  const scrollByStep = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.72));
    el.scrollBy({
      left: direction * step,
      behavior: prefersReduced ? 'auto' : 'smooth',
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollByStep(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByStep(-1);
    }
  };

  return (
    <div className="space-y-3">
      {/* Controls & keyboard hint row */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          {scrollHintText}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollByStep(-1)}
            disabled={!canScrollLeft}
            aria-label={`Scroll ${ariaLabel} left`}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-700 dark:text-slate-200 hover:border-cyan-500 disabled:opacity-35 disabled:cursor-not-allowed transition-[opacity,transform,border-color] duration-150 active:scale-[0.96] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollByStep(1)}
            disabled={!canScrollRight}
            aria-label={`Scroll ${ariaLabel} right`}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-700 dark:text-slate-200 hover:border-cyan-500 disabled:opacity-35 disabled:cursor-not-allowed transition-[opacity,transform,border-color] duration-150 active:scale-[0.96] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Scrollable snap rail + subtle edge fade cues */}
      <div className="relative">
        <div
          ref={trackRef}
          role="region"
          aria-label={ariaLabel}
          tabIndex={0}
          onScroll={syncScrollEdges}
          onKeyDown={handleKeyDown}
          className="hp-scroller flex items-stretch gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory py-2 px-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 rounded-xl"
        >
          {children}
        </div>

        <div
          aria-hidden="true"
          className={`pointer-events-none hidden sm:block absolute inset-y-0 left-0 w-7 bg-gradient-to-r ${fadeFromClass} to-transparent transition-opacity duration-200 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none hidden sm:block absolute inset-y-0 right-0 w-10 bg-gradient-to-l ${fadeFromClass} to-transparent transition-opacity duration-200 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </div>
  );
};
