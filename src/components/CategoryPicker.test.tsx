import { describe, it, expect, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryPicker from './CategoryPicker';
import { useStore } from '../store';

function resetStore(cats: string[]) {
  localStorage.clear();
  useStore.setState({ version: 1, categories: cats, missions: [], events: [] });
}

// Controlled harness so we can observe the selection the picker lifts up.
function Harness({ initial = [] as string[] }) {
  const [sel, setSel] = useState<string[]>(initial);
  return (
    <>
      <span data-testid="sel">{sel.join(',')}</span>
      <CategoryPicker selected={sel} onChange={setSel} />
    </>
  );
}

describe('CategoryPicker (D-02: add / rename / confirmed cascade-delete)', () => {
  beforeEach(() => resetStore(['기초', '응용']));

  it('adding a new category via the inline input calls addCategory and auto-selects it', () => {
    render(<Harness />);
    const input = screen.getByLabelText('새 카테고리 추가');
    fireEvent.change(input, { target: { value: '점프' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useStore.getState().categories).toContain('점프');
    // Auto-selected: the toggle chip reflects aria-pressed and the harness selection.
    expect(screen.getByRole('button', { name: '점프' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('sel').textContent).toContain('점프');
  });

  it('deleting a category asks for confirmation, then cascades (D-02)', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '기초 삭제' }));

    // ConfirmDialog names the category and warns about the cascade.
    expect(
      screen.getByText(/"기초" 카테고리를 삭제할까요\? 이 카테고리를 쓰는 미션에서도 함께 빠져요\./),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    expect(useStore.getState().categories).not.toContain('기초');
    expect(screen.queryByRole('button', { name: '기초 삭제' })).toBeNull();
  });

  it('cancelling a delete leaves the category intact (confirmation required)', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '응용 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(useStore.getState().categories).toContain('응용');
    expect(screen.getByRole('button', { name: '응용' })).toBeInTheDocument();
  });

  it('renaming a category via the ✎ control calls renameCategory and updates the label', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '기초 이름 바꾸기' }));

    const editInput = screen.getByLabelText('기초 이름 바꾸기');
    fireEvent.change(editInput, { target: { value: '기본기' } });
    fireEvent.keyDown(editInput, { key: 'Enter' });

    expect(useStore.getState().categories).toContain('기본기');
    expect(useStore.getState().categories).not.toContain('기초');
    expect(screen.getByRole('button', { name: '기본기' })).toBeInTheDocument();
  });

  it('shows the empty hint when there are no categories', () => {
    resetStore([]);
    render(<Harness />);
    expect(screen.getByText('아직 카테고리가 없어요. 아래에서 추가하세요.')).toBeInTheDocument();
  });
});
