// src/game/hud/SetupView.tsx — the child-facing setup screen (D-09, ART-04). This is the
// re-skin of the throwaway src/harness/SetupScreen: ALL Phase 2 setup LOGIC is reused
// verbatim (mode, count, names, characters, team members, board preset, time limit,
// buildParticipants/boardLengthFor, the canStart empty-library guard → MISSION-07). Only
// the presentation changes: big --tap/--tap-sm controls + the reused SegmentedControl.
// Real logo/art is Phase 4 (ART-05); the placeholder text logo stands in for now.
import { useState } from 'react';
import { useStore } from '../../store';
import { useGameStore } from '../../harness/useGameStore';
import SegmentedControl from '../../components/SegmentedControl';
import {
  buildParticipants,
  boardLengthFor,
  canStart,
  DEFAULT_TIME_LIMIT_MS,
  DEFAULT_PARTICIPANT_COUNT,
  MAX_PARTICIPANTS,
  type BoardPreset,
} from '../../engine/setup';
import type { GameConfig } from '../../engine/types';

type Mode = 'solo' | 'team';
type Character = 'boy' | 'girl';

function setAt<T>(arr: T[], i: number, v: T): T[] {
  const out = arr.slice();
  out[i] = v;
  return out;
}

export default function SetupView() {
  // Live empty-list check (MISSION-07 / D-08): drives the 시작 gate + guidance text.
  const missions = useStore((s) => s.missions);
  const gate = canStart(missions);

  const [mode, setMode] = useState<Mode>('solo');
  const [count, setCount] = useState<number>(DEFAULT_PARTICIPANT_COUNT);
  const [names, setNames] = useState<string[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [preset, setPreset] = useState<BoardPreset>('short');
  const [timeLimitOn, setTimeLimitOn] = useState(true);

  const clampedCount = Math.min(MAX_PARTICIPANTS, Math.max(1, Number.isFinite(count) ? count : 1));
  const rows = Array.from({ length: clampedCount }, (_, i) => i);

  const isTeam = mode === 'team';
  const rowLabel = isTeam ? '팀' : '플레이어';

  function handleStart() {
    const memberNamesPerParticipant = isTeam
      ? rows.map((i) =>
          (members[i] ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        )
      : undefined;

    const participants = buildParticipants(
      mode,
      clampedCount,
      names,
      characters,
      memberNamesPerParticipant,
    );
    const config: GameConfig = {
      mode,
      participants,
      boardLength: boardLengthFor(preset),
      timeLimitMs: timeLimitOn ? DEFAULT_TIME_LIMIT_MS : null,
    };
    useGameStore.getState().startGame(config);
  }

  return (
    <div className="game-setup">
      {/* Placeholder text logo — the real original logo is Phase 4 (ART-05). */}
      <h1 className="game-setup-logo">파워점핑</h1>
      <p className="game-setup-sub">신나는 줄넘기 미션 — 게임을 설정하고 시작하세요.</p>

      <label className="game-setup-field">
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
      </label>

      <label className="game-setup-field">
        <span>{isTeam ? '팀 수' : '인원 수'}</span>
        <span className="game-count-ctl">
          <button
            type="button"
            aria-label="줄이기"
            onClick={() => setCount(Math.max(1, clampedCount - 1))}
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={MAX_PARTICIPANTS}
            value={clampedCount}
            aria-label={isTeam ? '팀 수' : '인원 수'}
            onChange={(e) => setCount(parseInt(e.target.value, 10))}
          />
          <button
            type="button"
            aria-label="늘리기"
            onClick={() => setCount(Math.min(MAX_PARTICIPANTS, clampedCount + 1))}
          >
            +
          </button>
        </span>
      </label>

      <ul className="game-setup-rows">
        {rows.map((i) => (
          <li key={i} className="game-setup-row">
            <input
              type="text"
              aria-label={`${rowLabel} ${i + 1} 이름`}
              placeholder={`${rowLabel} ${i + 1}`}
              value={names[i] ?? ''}
              onChange={(e) => setNames((ns) => setAt(ns, i, e.target.value))}
            />
            <SegmentedControl<Character>
              ariaLabel={`${rowLabel} ${i + 1} 캐릭터`}
              value={characters[i] ?? 'boy'}
              onChange={(v) => setCharacters((cs) => setAt(cs, i, v))}
              options={[
                { value: 'boy', label: '남' },
                { value: 'girl', label: '여' },
              ]}
            />
            {isTeam && (
              <input
                type="text"
                aria-label={`${rowLabel} ${i + 1} 멤버 이름`}
                placeholder="멤버 이름 (쉼표로 구분, 적은 순서대로 번갈아요)"
                value={members[i] ?? ''}
                onChange={(e) => setMembers((ms) => setAt(ms, i, e.target.value))}
              />
            )}
          </li>
        ))}
      </ul>

      <label className="game-setup-field">
        <span>보드 길이</span>
        <SegmentedControl<BoardPreset>
          ariaLabel="보드 길이"
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'short', label: '짧게' },
            { value: 'normal', label: '보통' },
          ]}
        />
      </label>

      <label className="game-setup-toggle">
        <input
          type="checkbox"
          checked={timeLimitOn}
          onChange={(e) => setTimeLimitOn(e.target.checked)}
        />
        <span>시간 제한 20분</span>
      </label>

      {/* MISSION-07 / D-08: block start with guidance when the library is empty. */}
      {!gate.ok && <p className="game-setup-guard">{gate.reason}</p>}

      <button
        type="button"
        className="game-btn game-setup-start"
        disabled={!gate.ok}
        onClick={handleStart}
      >
        시작
      </button>
    </div>
  );
}
