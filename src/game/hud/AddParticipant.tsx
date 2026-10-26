// src/game/hud/AddParticipant.tsx — "＋ 친구 추가" in the turn bar: a latecomer joins the running
// game at the start tile with 0 stars, at the end of the turn order (engine addParticipant).
// Hidden at gameOver and once MAX_PARTICIPANTS are playing. Names render as JSX text only.
import { useState } from 'react';
import Modal from '../../components/Modal';
import AnimalPicker from './AnimalPicker';
import { ANIMALS, leastUsedAnimal, perAnimalLimit, type AnimalId } from '../../engine/animals';
import { canAddParticipant } from '../../engine/game';
import { MAX_PARTICIPANTS } from '../../engine/setup';
import { useGameStore } from '../../harness/useGameStore';
import { ANIMAL_EMOJI } from '../labels';

function usageOf(animals: readonly AnimalId[]): Map<AnimalId, number> {
  const used = new Map<AnimalId, number>();
  for (const a of animals) used.set(a, (used.get(a) ?? 0) + 1);
  return used;
}

export default function AddParticipant() {
  const game = useGameStore((s) => s.game);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [members, setMembers] = useState('');
  const [animal, setAnimal] = useState<AnimalId | null>(null);

  if (!game || !canAddParticipant(game)) return null;

  const participants = game.config.participants;
  const isTeam = game.config.mode === 'team';
  const label = isTeam ? '팀' : '친구';
  const used = usageOf(participants.map((p) => p.animal));
  const limit = perAnimalLimit(participants.length + 1);
  const taken = ANIMALS.filter((a) => (used.get(a) ?? 0) >= limit);
  const chosen = animal && !taken.includes(animal) ? animal : leastUsedAnimal(used);
  const placeholder = `${isTeam ? '팀' : '플레이어'} ${participants.length + 1}`;

  function openDialog() {
    setName('');
    setMembers('');
    setAnimal(null);
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    useGameStore.getState().addParticipant({
      name: name.trim() || placeholder,
      animal: chosen,
      memberNames: isTeam ? members.split(',').map((m) => m.trim()).filter(Boolean) : undefined,
    });
    setOpen(false);
  }

  return (
    <>
      {/* data-skip-ignore: opening the dialog must not skip a celebration (Phase 8 D-07). */}
      <button type="button" className="game-btn--sm" data-skip-ignore onClick={openDialog}>
        ＋ {label} 추가
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${label} 추가하기`}>
        <form className="add-participant" onSubmit={submit}>
          <p className="add-participant-hint">
            출발 칸에서 별 0개로 시작하고, 차례는 맨 뒤에 들어가요. ({participants.length}/{MAX_PARTICIPANTS}명)
          </p>
          <div className="setup-participant-head game-setup-row">
            <span className="animal-avatar" aria-hidden="true">{ANIMAL_EMOJI[chosen]}</span>
            <input
              type="text"
              aria-label={`추가할 ${label} 이름`}
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <AnimalPicker groupLabel={`추가할 ${label} 동물`} value={chosen} taken={taken} onChange={setAnimal} />
          {isTeam && (
            <div className="game-setup-row">
              <input
                type="text"
                aria-label="추가할 팀 멤버 이름"
                placeholder="멤버 이름 (쉼표로 구분, 적은 순서대로 번갈아요)"
                value={members}
                onChange={(e) => setMembers(e.target.value)}
              />
            </div>
          )}
          <div className="foot">
            <button type="button" className="btn-cancel" onClick={() => setOpen(false)}>취소</button>
            <button type="submit" className="btn-primary">추가하기</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
