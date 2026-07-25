import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';

describe('Modal (accessible focus-trapped shell)', () => {
  it('renders an open dialog with role=dialog and aria-modal', () => {
    render(
      <Modal open onClose={() => {}} title="테스트">
        <input aria-label="필드" />
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Labelled by its title.
    expect(dialog).toHaveAccessibleName('테스트');
  });

  it('does not render anything when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="숨김">
        <input aria-label="필드" />
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves focus into the dialog on open', () => {
    render(
      <Modal open onClose={() => {}} title="포커스">
        <input aria-label="첫 필드" />
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByLabelText('첫 필드')).toHaveFocus();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="esc">
        <input aria-label="필드" />
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="backdrop">
        <input aria-label="필드" />
      </Modal>,
    );
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when clicking inside the dialog', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="inside">
        <input aria-label="필드" />
      </Modal>,
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ConfirmDialog', () => {
  it('invokes onConfirm when the confirm button is activated', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        message="정말 삭제할까요?"
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('invokes onCancel on the cancel button and on Escape', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open message="정말?" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
