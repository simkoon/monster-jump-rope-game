import { useState } from 'react';
import { useStore } from '../store';
import ConfirmDialog from './ConfirmDialog';

interface CategoryPickerProps {
  // The mission's currently-selected categories (D-03 multi-category).
  selected: string[];
  onChange: (cats: string[]) => void;
}

// Multi-select category chips + inline add / ✎ rename / ✕ confirm-delete (D-02).
// Categories are a shared, freely add·edit·delete-able list stored in the store;
// deleting cascades (store.deleteCategory strips the tag from every mission).
// Every category label is rendered as escaped JSX text — never raw HTML.
export default function CategoryPicker({ selected, onChange }: CategoryPickerProps) {
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const renameCategory = useStore((s) => s.renameCategory);

  const [newCat, setNewCat] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const toggle = (c: string) => {
    onChange(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c]);
  };

  const commitAdd = () => {
    const v = newCat.trim();
    if (!v) return;
    if (!categories.includes(v)) addCategory(v);
    if (!selected.includes(v)) onChange([...selected, v]);
    setNewCat('');
  };

  const startEdit = (c: string) => {
    setEditing(c);
    setEditValue(c);
  };
  const commitEdit = (oldName: string) => {
    const next = editValue.trim();
    setEditing(null);
    if (!next || next === oldName) return; // empty / unchanged = no-op
    renameCategory(oldName, next);
    // Reflect the rename in this mission's live selection too.
    onChange(selected.map((c) => (c === oldName ? next : c)));
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const name = pendingDelete;
    deleteCategory(name); // cascades across the store
    onChange(selected.filter((c) => c !== name));
    setPendingDelete(null);
  };

  return (
    <>
      <div className="catpick">
        {categories.length === 0 ? (
          <span className="hint">아직 카테고리가 없어요. 아래에서 추가하세요.</span>
        ) : (
          categories.map((c) =>
            editing === c ? (
              <input
                key={c}
                className="cat-edit"
                autoFocus
                maxLength={16}
                value={editValue}
                aria-label={`${c} 이름 바꾸기`}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitEdit(c);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setEditing(null);
                  }
                }}
              />
            ) : (
              <span key={c} className={'chip cat catchip' + (selected.includes(c) ? ' on' : '')}>
                <button
                  type="button"
                  className="catchip-label"
                  aria-pressed={selected.includes(c)}
                  onClick={() => toggle(c)}
                >
                  {c}
                </button>
                <button
                  type="button"
                  className="cat-mini"
                  aria-label={`${c} 이름 바꾸기`}
                  title="이름 바꾸기"
                  onClick={() => startEdit(c)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="cat-mini del"
                  aria-label={`${c} 삭제`}
                  title="삭제"
                  onClick={() => setPendingDelete(c)}
                >
                  ✕
                </button>
              </span>
            ),
          )
        )}
      </div>

      <div className="catadd">
        <input
          type="text"
          placeholder="새 카테고리 추가…"
          maxLength={16}
          value={newCat}
          aria-label="새 카테고리 추가"
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitAdd();
            }
          }}
        />
        <button type="button" onClick={commitAdd}>
          추가
        </button>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        message={
          pendingDelete
            ? `"${pendingDelete}" 카테고리를 삭제할까요? 이 카테고리를 쓰는 미션에서도 함께 빠져요.`
            : ''
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
