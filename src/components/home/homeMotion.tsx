import React, { useCallback, useEffect, useRef, useState } from 'react';
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

/** Keyboard-accessible, pop-out scroll-snap carousel with focal-card elevation & dots. */
export const HorizontalSnapScroller: React.FC<HorizontalSnapScrollerProps> = ({
  ariaLabel,
  scrollHintText = 'Scroll or use arrow keys',
  children,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const prefersReduced = usePrefersReducedMotion();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [pageCount, setPageCount] = useState(1);
  const [activePage, setActivePage] = useState(0);

  const updateCarouselMetrics = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < maxScroll - 8);

    const pages = Math.max(1, Math.round(el.scrollWidth / Math.max(1, el.clientWidth)));
    setPageCount(pages);
    if (maxScroll > 0) {
      const ratio = el.scrollLeft / maxScroll;
      setActivePage(Math.min(pages - 1, Math.round(ratio * (pages - 1))));
    } else {
      setActivePage(0);
    }

    // Mark cards substantially inside the visible viewport so peripheral cards recess cleanly
    const containerRect = el.getBoundingClientRect();
    const cards = el.querySelectorAll<HTMLElement>('[data-scroller-card]');
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const visibleWidth =
        Math.min(rect.right, containerRect.right) - Math.max(rect.left, containerRect.left);
      const isFocal = rect.width > 0 && visibleWidth / rect.width >= 0.72;
      card.setAttribute('data-focal', isFocal ? 'true' : 'false');
    });
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(updateCarouselMetrics);
  }, [updateCarouselMetrics]);

  useEffect(() => {
    updateCarouselMetrics();
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [updateCarouselMetrics, scheduleUpdate]);

  const scrollByStep = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.68));
    el.scrollBy({
      left: direction * step,
      behavior: prefersReduced ? 'auto' : 'smooth',
    });
  };

  const scrollToPage = (pageIndex: number) => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const targetLeft = pageCount > 1 ? (pageIndex / (pageCount - 1)) * maxScroll : 0;
    el.scrollTo({
      left: targetLeft,
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

  const maskClass =
    canScrollLeft && canScrollRight
      ? 'hp-mask-both'
      : canScrollRight
      ? 'hp-mask-right'
      : canScrollLeft
      ? 'hp-mask-left'
      : '';

  return (
    <div className="space-y-3">
      {/* Controls & keyboard hint row */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          {scrollHintText}
        </span>

        <div className="flex items-center gap-3 shrink-0">
          {pageCount > 1 && (
            <div className="hidden sm:flex items-center gap-1.5" role="group" aria-label={`${ariaLabel} pages`}>
              {Array.from({ length: pageCount }).map((_, idx) => {
                const active = idx === activePage;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToPage(idx)}
                    aria-label={`Jump to ${ariaLabel} view ${idx + 1}`}
                    aria-current={active ? 'true' : undefined}
                    className={`h-2 rounded-full transition-[width,background-color] duration-200 cursor-pointer ${
                      active
                        ? 'w-5 bg-cyan-700 dark:bg-cyan-400'
                        : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-cyan-500'
                    }`}
                  />
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollByStep(-1)}
              disabled={!canScrollLeft}
              aria-label={`Scroll ${ariaLabel} left`}
              className="hp-card inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-700 dark:text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed transition-[opacity,transform,border-color] duration-150 active:scale-[0.95] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByStep(1)}
              disabled={!canScrollRight}
              aria-label={`Scroll ${ariaLabel} right`}
              className="hp-card inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-700 dark:text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed transition-[opacity,transform,border-color] duration-150 active:scale-[0.95] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable snap rail with generous vertical headroom so popped cards don't clip */}
      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={scheduleUpdate}
        onKeyDown={handleKeyDown}
        className={`hp-scroller ${maskClass} flex items-stretch gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory py-6 -my-3 px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 rounded-2xl`}
      >
        {children}
      </div>
    </div>
  );
};
