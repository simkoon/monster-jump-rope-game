// src/game/hud/TurnHud.tsx — turn bar v2 (HUD-02, ROUND-02, D-22, D-24, UI-SPEC S3).
// Left: the turn pill — participant color dot + `{animal emoji} {name} 차례` (+ the `🔁 한 번 더`
// badge on an extra turn, + the team member line, which stays inside the pill on every width).
// The pill content is keyed per turn so the 160 ms turn-change animation replays, while the
// aria-live pill itself stays mounted. Middle: the round block (label, R dots when R ≤ 10, `r/R`;
// `마지막 라운드` + is-final from the last round on). Then the next-turn block (`다음` + dot + name).
// Right: `지금 끝내기`, which always goes through the reused ConfirmDialog (cancel focused by
// default) so a stray tap never ends a game (T-05-18). No clock (D-01). Names render as JSX text only.
import { useState, type CSSProperties } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { AnimalId } from '../../engine/animals';
import { ANIMAL_EMOJI, ROUND_DOTS_MAX, nextUpText, roundAria, roundLabel, type NextUpView } from '../labels';
import { ANIMAL_COLOR } from '../palette';

interface TurnHudProps {
  animal: AnimalId;
  name: string;
  isTeam: boolean;
  activeMember: string;
  isExtra: boolean;
  round: number;
  totalRounds: number;
  next: NextUpView | null;
  onEndNow: () => void;
}

const dotStyle = (animal: AnimalId) => ({ '--pc': ANIMAL_COLOR[animal] }) as CSSProperties;

export default function TurnHud({
  animal,
  name,
  isTeam,
  activeMember,
  isExtra,
  round,
  totalRounds,
  next,
  onEndNow,
}: TurnHudProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isFinal = round >= totalRounds;
  const showDots = totalRounds <= ROUND_DOTS_MAX;

  return (
    <header className="game-topbar">
      {/* Turn change is announced to assistive tech. */}
      <div className="game-turn-pill" aria-live="polite">
        <span key={`${animal}-${name}-${round}-${isExtra}`} className="turn-pill-content">
          <span className="turn-dot" style={dotStyle(animal)} aria-hidden="true" />
          <span className="game-turn-name">
            {ANIMAL_EMOJI[animal]} {name}
            <span className="suffix"> 차례</span>
          </span>
          {isExtra && <span className="game-event-chip extra">🔁 한 번 더</span>}
          {isTeam && <span className="game-turn-member">이번엔 {activeMember} 님이 도전!</span>}
        </span>
      </div>

      <div
        className={isFinal ? 'game-round is-final' : 'game-round'}
        role="group"
        aria-label={roundAria(round, totalRounds)}
      >
        <span className="label">{roundLabel(round, totalRounds)}</span>
        {showDots && (
          <span className="round-dots" aria-hidden="true">
            {Array.from({ length: totalRounds }, (_, i) => {
              const n = i + 1;
              const cls = ['round-dot', n <= round && 'is-filled', n === round && 'is-now'].filter(Boolean).join(' ');
              return <span key={n} className={cls} />;
            })}
          </span>
        )}
        <span className="value">{`${round}/${totalRounds}`}</span>
      </div>

      <div className="turn-next">
        <span className="label">다음</span>
        <span className="turn-next-row">
          {next && <span className="turn-dot" style={dotStyle(next.animal)} aria-hidden="true" />}
          <span className="value">{nextUpText(next)}</span>
        </span>
      </div>

      <span className="spacer" />

      <button type="button" className="game-btn--sm" onClick={() => setConfirmOpen(true)}>
        지금 끝내기
      </button>

      <ConfirmDialog
        open={confirmOpen}
        message="지금 게임을 끝낼까요? 지금까지 모은 별로 우승을 정해요."
        confirmLabel="게임 끝내기"
        cancelLabel="계속하기"
        onConfirm={() => {
          setConfirmOpen(false);
          onEndNow();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </header>
  );
}
