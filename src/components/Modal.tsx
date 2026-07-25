import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // When provided, focus lands on this element on open; otherwise the first
  // focusable descendant (falling back to the dialog itself).
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// NOTE: jsdom reports offsetParent === null for everything (no layout), so we do
// NOT filter by visibility here — the selector alone is what the focus-trap uses.
function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
}

// Accessible, focus-trapped modal shell (UI-SPEC §Component Inventory Modal,
// §Accessibility). role=dialog + aria-modal, Esc + backdrop close, focus moved
// into the dialog on open and restored to the trigger on close. Reused by the
// mission/event editors and by ConfirmDialog.
export default function Modal({ open, onClose, title, children, initialFocusRef }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = 'modal-title-' + useId();

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const target =
      initialFocusRef?.current ?? (dialog ? (focusables(dialog)[0] ?? dialog) : null);
    target?.focus();
    return () => {
      // Restore focus to whatever was focused before the modal opened.
      restoreRef.current?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const items = focusables(dialogRef.current);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className="overlay show"
      data-testid="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
