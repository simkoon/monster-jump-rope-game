import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Event } from '../schema';
import { normalizedPercents } from '../lib/normalize';
import { showToast } from './Toast';
import EventCard from './EventCard';
import EventModal from './EventModal';
import ConfirmDialog from './ConfirmDialog';

// The 이벤트 view: toolbar (live name search + ＋ 새 이벤트), the probability
// hint banner, and the responsive card grid. Owns the add/edit modal and the
// delete confirmation. Probability % is DERIVED each render over the FULL event
// list (never stored) — adding/removing/editing weight re-derives every card
// with no rebalancing of other events' stored weights (D-05). Satisfies
// EVENT-01..05.
export default function EventTab() {
  const events = useStore((s) => s.events);
  const deleteEvent = useStore((s) => s.deleteEvent);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Event | null>(null);

  // % is normalized over the WHOLE list so a filtered card still shows its true
  // share of the full library (D-05).
  const pcts = useMemo(() => normalizedPercents(events), [events]);

  // Derived visible list (never stored): case-insensitive name substring search.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? events.filter((e) => e.name.toLowerCase().includes(q)) : events;
  }, [events, search]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (e: Event) => {
    setEditing(e);
    setModalOpen(true);
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteEvent(pendingDelete.id);
    showToast('이벤트를 삭제했어요');
    setPendingDelete(null);
  };

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <span aria-hidden="true">🔎</span>
          <input
            type="text"
            placeholder="이벤트 이름으로 찾기…"
            aria-label="이벤트 이름으로 찾기"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="add" type="button" onClick={openAdd}>
          ＋ 새 이벤트
        </button>
      </div>

      <p className="hint" style={{ margin: '-4px 2px 14px' }}>
        💡 발생 확률은 <b>가중치(숫자)</b>로 정해요. 합이 100이 아니어도 괜찮아요 — 아래 %는 자동으로
        계산됩니다.
      </p>

      {events.length === 0 ? (
        <div className="empty">
          <div className="big" aria-hidden="true">
            🎲
          </div>
          <h3>아직 이벤트가 없어요</h3>
          <p>‘＋ 새 이벤트’로 첫 이벤트를 만들어요!</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <div className="big" aria-hidden="true">
            🎲
          </div>
          <h3>찾는 이벤트가 없어요</h3>
          <p>검색어를 바꿔보세요.</p>
        </div>
      ) : (
        <div className="grid">
          {visible.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              pct={pcts.get(e.id) ?? 0}
              onEdit={openEdit}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      )}

      <EventModal open={modalOpen} event={editing} onClose={() => setModalOpen(false)} />
      <ConfirmDialog
        open={pendingDelete !== null}
        message={pendingDelete ? `"${pendingDelete.name}" 이벤트를 삭제할까요?` : ''}
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
