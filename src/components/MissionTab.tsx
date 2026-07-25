import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Mission } from '../schema';
import { showToast } from './Toast';
import MissionCard from './MissionCard';
import MissionModal from './MissionModal';
import FilterRow from './FilterRow';
import ConfirmDialog from './ConfirmDialog';

type Diff = Mission['diff'];

// The 미션 view: toolbar (live name search + ＋ 새 미션), difficulty/category
// filter row, and the responsive card grid. Owns the add/edit modal and the
// delete confirmation. Satisfies MISSION-01..06.
export default function MissionTab() {
  const missions = useStore((s) => s.missions);
  const categories = useStore((s) => s.categories);
  const deleteMission = useStore((s) => s.deleteMission);

  const [search, setSearch] = useState('');
  const [activeDiff, setActiveDiff] = useState<Diff[]>([]);
  const [activeCats, setActiveCats] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Mission | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Mission | null>(null);

  // D-02 cascade: when a category is deleted from the shared list, drop it from
  // the active filter so a stale selection can never strand the list at zero.
  useEffect(() => {
    setActiveCats((prev) => prev.filter((c) => categories.includes(c)));
  }, [categories]);

  const toggleDiff = (d: Diff) =>
    setActiveDiff((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const toggleCat = (c: string) =>
    setActiveCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  // Derived visible list (never stored): name search + difficulty(OR) + category(AND).
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Guard against a just-deleted category still sitting in the active set.
    const cats = activeCats.filter((c) => categories.includes(c));
    return missions.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (activeDiff.length && !activeDiff.includes(m.diff)) return false;
      if (cats.length && !cats.every((c) => m.cats.includes(c))) return false;
      return true;
    });
  }, [missions, search, activeDiff, activeCats, categories]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (m: Mission) => {
    setEditing(m);
    setModalOpen(true);
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMission(pendingDelete.id);
    showToast('미션을 삭제했어요');
    setPendingDelete(null);
  };

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <span aria-hidden="true">🔎</span>
          <input
            type="text"
            placeholder="미션 이름으로 찾기…"
            aria-label="미션 이름으로 찾기"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="add" type="button" onClick={openAdd}>
          ＋ 새 미션
        </button>
      </div>

      <FilterRow
        categories={categories}
        activeDiff={activeDiff}
        activeCats={activeCats}
        onToggleDiff={toggleDiff}
        onToggleCat={toggleCat}
      />

      {missions.length === 0 ? (
        <div className="empty">
          <div className="big" aria-hidden="true">
            🎴
          </div>
          <h3>아직 미션이 없어요</h3>
          <p>‘＋ 새 미션’으로 첫 미션을 만들어요!</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <div className="big" aria-hidden="true">
            🎴
          </div>
          <h3>조건에 맞는 미션이 없어요</h3>
          <p>검색·필터를 바꿔보세요.</p>
        </div>
      ) : (
        <div className="grid">
          {visible.map((m) => (
            <MissionCard key={m.id} mission={m} onEdit={openEdit} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      <MissionModal open={modalOpen} mission={editing} onClose={() => setModalOpen(false)} />
      <ConfirmDialog
        open={pendingDelete !== null}
        message={pendingDelete ? `"${pendingDelete.name}" 미션을 삭제할까요?` : ''}
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
