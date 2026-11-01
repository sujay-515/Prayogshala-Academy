import React, { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseModalOptions {
  isOpen: boolean;
  onClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  onEscape?: () => void;
}

export function useModalA11y({
  isOpen,
  onClose,
  initialFocusRef,
  closeOnEscape = true,
  onEscape,
}: UseModalOptions) {
  const modalRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Callers almost always pass inline callbacks (`onClose={() => setOpen(false)}`),
  // so these props get a brand-new identity on every parent render. Keep the
  // latest values in a ref and register the open/close effect with `isOpen`
  // only: otherwise it tears down and re-runs on every keystroke inside the
  // dialog, and its cleanup restores focus to the opener element, which yanks
  // the caret out of the field being typed into.
  const latestRef = useRef({ onClose, onEscape, closeOnEscape, initialFocusRef });

  useEffect(() => {
    latestRef.current = { onClose, onEscape, closeOnEscape, initialFocusRef };
  });

  useEffect(() => {
    if (!isOpen) return;

    // 1. Remember the element that had focus when modal opened
    openerRef.current = document.activeElement as HTMLElement | null;

    // 2. Lock background body scroll
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    // 3. Move focus into dialog
    const focusTimer = setTimeout(() => {
      if (!modalRef.current) return;
      const preferredTarget = latestRef.current.initialFocusRef?.current;
      if (preferredTarget && modalRef.current.contains(preferredTarget)) {
        preferredTarget.focus();
        return;
      }
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const firstFocusable = Array.from(focusableElements).find(
        (el) => el.offsetParent !== null
      );
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        modalRef.current.focus();
      }
    }, 50);

    // 4. Handle Tab trap & Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        const { onEscape: onEscapeLatest, closeOnEscape: closeOnEscapeLatest } = latestRef.current;
        if (onEscapeLatest) {
          onEscapeLatest();
        } else if (closeOnEscapeLatest) {
          latestRef.current.onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === modalRef.current) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);

      // Restore scroll
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;

      // Restore focus to opener element, but only when focus is not already
      // somewhere meaningful (another dialog, a freshly focused control, etc.).
      const opener = openerRef.current;
      const active = document.activeElement;
      const focusIsLoose = !active || active === document.body || active === document.documentElement;
      if (opener && opener.isConnected && typeof opener.focus === 'function' && focusIsLoose) {
        opener.focus();
      }
    };
  }, [isOpen]);

  return { modalRef };
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId?: string;
  ariaLabel?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  onEscape?: () => void;
  closeOnBackdropClick?: boolean;
  maxWidth?: string;
  className?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  titleId,
  ariaLabel,
  initialFocusRef,
  closeOnEscape = true,
  onEscape,
  closeOnBackdropClick = true,
  maxWidth = 'max-w-md',
  className = '',
  children,
}) => {
  const { modalRef } = useModalA11y({
    isOpen,
    onClose,
    initialFocusRef,
    closeOnEscape,
    onEscape,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-md"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          if (onEscape) {
            onEscape();
          } else {
            onClose();
          }
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={!titleId ? ariaLabel : undefined}
        tabIndex={-1}
        className={`w-full ${maxWidth} focus:outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
