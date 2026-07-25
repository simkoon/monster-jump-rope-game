import { useRef } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Accessible confirm dialog built on Modal — reused for destructive actions
// (delete mission, delete category cascade) and, later, import overwrite.
// Focus defaults to the CANCEL button (safe default for destructive actions);
// Esc / backdrop cancel. Caller supplies the exact copy.
export default function ConfirmDialog({
  open,
  message,
  confirmLabel = '삭제',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal open={open} onClose={onCancel} title={message} initialFocusRef={cancelRef}>
      <div className="foot">
        <button type="button" className="btn-cancel" ref={cancelRef} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="btn-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
