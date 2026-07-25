// src/harness/SetupScreen.tsx — throwaway plain-DOM setup form (SETUP-01..06).
// Deliberately minimal and disposable: Phase 3 replaces this with the real
// child-friendly 3D UI (D-09). Big-button/child polish is NOT in scope here.
// All user-entered text renders through JSX (escaped by default).
import { useState } from 'react';
import { useStore } from '../store';
import { useGameStore } from './useGameStore';
import SegmentedControl from '../components/SegmentedControl';
import {
  buildParticipants,
  boardLengthFor,
  canStart,
  DEFAULT_TIME_LIMIT_MS,
  DEFAULT_PARTICIPANT_COUNT,
  MAX_PARTICIPANTS,
  type BoardPreset,
} from '../engine/setup';
import type { GameConfig } from '../engine/types';

type Mode = 'solo' | 'team';
type Character = 'boy' | 'girl';

function setAt<T>(arr: T[], i: number, v: T): T[] {
  const out = arr.slice();
  out[i] = v;
  return out;
}

export default function SetupScreen() {
  // Live empty-list check (MISSION-07 / D-08): drives the 시작 gate + guidance text.
  const missions = useStore((s) => s.missions);
  const gate = canStart(missions);

  const [mode, setMode] = useState<Mode>('solo'); // SETUP-02 / D-01
  const [count, setCount] = useState<number>(DEFAULT_PARTICIPANT_COUNT); // SETUP-03 (default 2)
  const [names, setNames] = useState<string[]>([]); // SETUP-04, sparse by index
  const [characters, setCharacters] = useState<Character[]>([]); // SETUP-05, sparse by index
  const [members, setMembers] = useState<string[]>([]); // D-01: raw comma text per team
  const [preset, setPreset] = useState<BoardPreset>('short'); // D-02 default 짧게
  const [timeLimitOn, setTimeLimitOn] = useState(true); // D-04 default on (20분)

  // Clamp to the engine bound [1, MAX_PARTICIPANTS] (T-02-05) before rendering rows.
  const clampedCount = Math.min(MAX_PARTICIPANTS, Math.max(1, Number.isFinite(count) ? count : 1));
  const rows = Array.from({ length: clampedCount }, (_, i) => i);

  const isTeam = mode === 'team';
  const rowLabel = isTeam ? '팀' : '플레이어';

  function handleStart() {
    // Team mode (D-01): parse comma-separated member names per team; solo ignores.
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
      boardLength: boardLengthFor(preset), // D-02
      timeLimitMs: timeLimitOn ? DEFAULT_TIME_LIMIT_MS : null, // D-04
    };
    useGameStore.getState().startGame(config); // SETUP-06 (+ MISSION-07 gate inside)
  }

  return (
    <div className="setup">
      {/* SETUP-01: placeholder text logo — the real original logo is Phase 4 (ART-05). */}
      <h1 className="setup-logo">파워점핑</h1>
      <p className="note">신나는 줄넘기 미션 — 게임을 설정하고 시작하세요.</p>

      {/* SETUP-02 / D-01: 개인전 / 팀전 */}
      <label className="setup-field">
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

      {/* SETUP-03: participant/team count, clamped [1, MAX_PARTICIPANTS] */}
      <label className="setup-field">
        <span>{isTeam ? '팀 수' : '인원 수'}</span>
        <span className="count-ctl">
          <button
            type="button"
            aria-label="줄이기"
            onClick={() => setCount((c) => Math.max(1, clampedCount - 1))}
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
            onClick={() => setCount(() => Math.min(MAX_PARTICIPANTS, clampedCount + 1))}
          >
            +
          </button>
        </span>
      </label>

      {/* SETUP-04/05 (+ D-01 member list): one row per participant/team */}
      <ul className="setup-rows">
        {rows.map((i) => (
          <li key={i} className="setup-row">
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

      {/* D-02: board preset 짧게(기본) / 보통 */}
      <label className="setup-field">
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

      {/* D-04: time limit toggle, default on at 20분 */}
      <label className="setup-field">
        <input
          type="checkbox"
          checked={timeLimitOn}
          onChange={(e) => setTimeLimitOn(e.target.checked)}
        />
        <span>시간 제한 20분</span>
      </label>

      {/* MISSION-07 / D-08: block start with guidance when the library is empty. */}
      {!gate.ok && <p className="setup-guard">{gate.reason}</p>}

      {/* SETUP-06: 시작 */}
      <button
        type="button"
        className="setup-start"
        disabled={!gate.ok}
        onClick={handleStart}
      >
        시작
      </button>
    </div>
  );
}
