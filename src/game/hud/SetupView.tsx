// src/game/hud/SetupView.tsx — the start screen (UI-SPEC S2, D-24/D-25, SETUP-07/08/09).
// Kept from v1: logo, mode segment, participant count stepper, names, team member list parsing.
// New: a participant card per row with an animal avatar + 8-animal picker (always distinct),
// the per-game round stepper (initial value = settings defaultRounds, read once, never written
// back — D-19), the play-time estimate (D-20), the read-only rules summary, the 💡 missing-content
// notices (informational only — D-13) and the empty-library guard (the only start blocker).
// The form state lives in the useSetupDraft store, not in component state, so following the
// RULES_HINT to the 편집기 and back keeps everything typed in (WR-03).
import { useState } from 'react';
import { useStore } from '../../store';
import { useSettings, ROUNDS_MIN, ROUNDS_MAX } from '../../settings';
import { useGameStore } from '../../harness/useGameStore';
import SegmentedControl from '../../components/SegmentedControl';
import PowerJumpingLogo from '../../components/PowerJumpingLogo';
import AnimalPicker from './AnimalPicker';
import TargetRoll from './TargetRoll';
import { useSetupDraft, type SetupMode, type PlayOrder } from '../useSetupDraft';
import { analyzeContent, buildParticipants, estimateMinutes, MAX_PARTICIPANTS } from '../../engine/setup';
import { assignAnimals, type AnimalId } from '../../engine/animals';
import {
  ANIMAL_EMOJI,
  RULES_HINT,
  estimateLine,
  estimateBasis,
  missingNotices,
  rulesSummary,
} from '../labels';

type Mode = SetupMode;

function setAt<T>(arr: T[], i: number, v: T): T[] {
  const out = arr.slice();
  out[i] = v;
  return out;
}

function clampCount(n: number): number {
  return Math.min(MAX_PARTICIPANTS, Math.max(1, Number.isFinite(n) ? n : 1));
}

export default function SetupView() {
  // Live content + settings: drive the notices, the guard and the rules summary.
  const missions = useStore((s) => s.missions);
  const events = useStore((s) => s.events);
  const boardSize = useSettings((s) => s.boardSize);
  const startBonus = useSettings((s) => s.startBonus);
  const failRule = useSettings((s) => s.failRule);
  const analysis = analyzeContent(missions, events);
  const notices = missingNotices(analysis);

  const targetJumps = useSetupDraft((s) => s.targetJumps);
  const playOrder = useSetupDraft((s) => s.playOrder);
  const nomination = playOrder === 'nomination';
  const draftRounds = useSetupDraft((s) => s.rounds);
  const [defaultRounds] = useState(() => useSettings.getState().defaultRounds);
  const rounds = draftRounds ?? defaultRounds;
  const mode = useSetupDraft((s) => s.mode);
  const count = useSetupDraft((s) => s.count);
  const names = useSetupDraft((s) => s.names);
  const members = useSetupDraft((s) => s.members);
  const picks = useSetupDraft((s) => s.picks);
  const patch = useSetupDraft((s) => s.patch);
  const stepRounds = (delta: number) => patch((d) => ({
    rounds: Math.min(ROUNDS_MAX, Math.max(ROUNDS_MIN, (d.rounds ?? defaultRounds) + delta)),
  }));
  const setMode = (m: Mode) => patch({ mode: m });

  const clampedCount = clampCount(count);
  const rows = Array.from({ length: clampedCount }, (_, i) => i);
  // D-24: always distinct; rows without a pick get the first unused animal.
  const animals = assignAnimals(clampedCount, picks);

  const isTeam = mode === 'team';
  const rowLabel = isTeam ? '팀' : '플레이어';

  // Decreasing the count drops the removed rows' picks so they are not resurrected later.
  function changeCount(next: number) {
    patch((d) => (Number.isFinite(next) ? { count: next, picks: d.picks.slice(0, clampCount(next)) } : { count: next }));
  }

  // Freeze the currently shown animals so picking in one row never reshuffles another row.
  function pickAnimal(i: number, a: AnimalId) {
    patch({ picks: setAt<AnimalId | undefined>(animals, i, a) });
  }

  function handleStart() {
    if (targetJumps === null) return;
    const memberNamesPerParticipant = isTeam
      ? rows.map((i) =>
          (members[i] ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        )
      : undefined;
    const finalNames = rows.map((i) => (names[i] ?? '').trim() || `${rowLabel} ${i + 1}`);
    const participants = buildParticipants(mode, clampedCount, finalNames, animals, memberNamesPerParticipant);
    useGameStore.getState().startGame({ mode, participants, rounds: nomination ? 1 : rounds, nomination, targetJumps });
    // The draft is consumed once a game is running; 처음으로 then opens a fresh start screen.
    if (useGameStore.getState().game) useSetupDraft.getState().reset();
  }

  return (
    <div className="game-setup">
      <PowerJumpingLogo as="h1" variant="hero" subtitle="신나는 줄넘기 미션" className="game-setup-logo" />
      <p className="game-setup-sub">{nomination
        ? '수업을 잘 들은 친구를 선생님이 지목해 기회를 주세요.'
        : '등록한 순서대로 한 명씩 도전하고 별을 모아요.'}</p>

      <TargetRoll value={targetJumps} onDecide={(value) => patch({ targetJumps: value })} />

      <div className="game-setup-field">
        <span>진행 방식</span>
        <SegmentedControl<PlayOrder>
          ariaLabel="진행 방식"
          value={playOrder}
          onChange={(value) => patch({ playOrder: value })}
          options={[
            { value: 'nomination', label: '선생님 지목' },
            { value: 'sequential', label: '한 명씩 차례대로' },
          ]}
        />
      </div>

      {/* Plain containers, not label elements: a label wrapping buttons forwards a caption tap to its
          first button (− / 개인전) and would silently change the setting (WR-02). */}
      <div className="game-setup-field">
        <span>모드</span>
        <SegmentedControl<Mode>
          ariaLabel="게임 모드"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'solo', label: '개인전' },
            { value: 'team', label: '팀전' },
          ]}
        />
      </div>

      <div className="game-setup-field">
        <span>{isTeam ? '팀 수' : '인원 수'}</span>
        <span className="game-count-ctl">
          <button type="button" aria-label="줄이기" onClick={() => changeCount(Math.max(1, clampedCount - 1))}>
            −
          </button>
          <input
            type="number"
            min={1}
            max={MAX_PARTICIPANTS}
            value={clampedCount}
            aria-label={isTeam ? '팀 수' : '인원 수'}
            onChange={(e) => changeCount(parseInt(e.target.value, 10))}
          />
          <button
            type="button"
            aria-label="늘리기"
            onClick={() => changeCount(Math.min(MAX_PARTICIPANTS, clampedCount + 1))}
          >
            +
          </button>
        </span>
      </div>

      <ul className="game-setup-rows">
        {rows.map((i) => (
          <li key={i} className="setup-participant">
            <div className="setup-participant-head game-setup-row">
              <span className="animal-avatar" aria-hidden="true">
                {ANIMAL_EMOJI[animals[i]]}
              </span>
              <input
                type="text"
                aria-label={`${rowLabel} ${i + 1} 이름`}
                placeholder={`${rowLabel} ${i + 1}`}
                value={names[i] ?? ''}
                onChange={(e) => patch((d) => ({ names: setAt(d.names, i, e.target.value) }))}
              />
            </div>
            <AnimalPicker
              groupLabel={`${rowLabel} ${i + 1} 동물`}
              value={animals[i]}
              taken={animals.filter((_, j) => j !== i)}
              onChange={(a) => pickAnimal(i, a)}
            />
            {isTeam && (
              <div className="game-setup-row">
                <input
                  type="text"
                  aria-label={`${rowLabel} ${i + 1} 멤버 이름`}
                  placeholder="멤버 이름 (쉼표로 구분, 적은 순서대로 번갈아요)"
                  value={members[i] ?? ''}
                  onChange={(e) => patch((d) => ({ members: setAt(d.members, i, e.target.value) }))}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {nomination ? (
        <section className="nomination-panel" aria-label="진행 안내">
          <h2>선생님 지목 방식</h2>
          <p>지목한 친구만 주사위를 한 번 돌려요. 자동으로 차례가 넘어가지 않고, 같은 친구를 여러 번 지목할 수 있어요.</p>
          <p>라운드 제한 없이 별을 누적하고, 수업이 끝나면 별이 가장 많은 친구가 우승해요.</p>
        </section>
      ) : (
        <>
          <section className="nomination-panel" aria-label="진행 안내">
            <h2>한 명씩 차례대로 방식</h2>
            <p>등록한 순서대로 돌아가며 도전해요. 모두 한 번씩 진행하면 한 라운드가 끝나요.</p>
            <p>정한 라운드를 마치면 별이 가장 많은 친구가 우승해요. 이벤트로 추가 기회를 얻을 수도 있어요.</p>
          </section>
          <div className="game-setup-field">
            <span>라운드</span>
            <span className="game-count-ctl">
              <button type="button" aria-label="라운드 줄이기" disabled={rounds <= ROUNDS_MIN}
                onClick={() => stepRounds(-1)}>−</button>
              <output aria-label="라운드 수" aria-live="polite">{rounds}</output>
              <button type="button" aria-label="라운드 늘리기" disabled={rounds >= ROUNDS_MAX}
                onClick={() => stepRounds(1)}>+</button>
            </span>
          </div>
          <p className="setup-estimate" aria-live="polite">{estimateLine(estimateMinutes(clampedCount, rounds))}</p>
          <p className="setup-estimate-basis">{estimateBasis(mode, clampedCount, rounds)}</p>
        </>
      )}

      <p className="setup-rules">{rulesSummary({ boardSize, startBonus, failRule })}</p>
      <p className="setup-rules">{RULES_HINT}</p>

      {notices.length > 0 && (
        <div className="setup-notice">
          {notices.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      {/* Start requires both mission content and one decided target-count roll. */}
      {!analysis.ok && <p className="game-setup-guard">{analysis.reason}</p>}

      <button type="button" className="game-btn game-setup-start" disabled={!analysis.ok || targetJumps === null} onClick={handleStart}>
        게임 시작
      </button>
    </div>
  );
}
