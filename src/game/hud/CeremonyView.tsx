// src/game/hud/CeremonyView.tsx — the award ceremony DOM (Phase 8 END-01 ~ END-03, D-12 ~ D-16,
// UI-SPEC F7). Replaces the temporary Phase 5 result screen; GameStage shows these parts in its
// ceremony mode around the same canvas cell (the 3D podium).
//
//   CeremonyHead  — 게임 끝! and the end reason (stage slot 1, where the turn bar sits in play).
//   CeremonyPanel — the winner line (role=status), the 모두의 별 star cards with their praise badges,
//                   then the 🔁 다시 하기 / 처음으로 row (stage slot 3, a fragment = two grid items).
//
// D-12 / D-13 no last-place emphasis: every participant / team gets the same card shape, sorted by
// stars (ties keep the participant order). Only the winners get the 🏆 mark and the gold card; no
// rank number is printed and no card is dimmed, shrunk or recolored by its place.
// D-14 everybody is praised: 1–2 badge chips per card from the awards module (decided ids) and the
// labels module (emoji / name / title copy).
// D-16 the buttons are live from the first frame, also during the intro, and carry the skip-ignore
// attribute, so a tap on them never runs the intro's skip path.
// Both buttons go through the input lock (CR-01 / Pitfall 4 for the ceremony): a tap that skips the
// win beat shows these buttons under the finger, and the lock's shared skip window drops the child's
// second tap. 🔁 다시 하기 also takes the shared lock for INPUT_LOCK_MS, because the new game's 🎲
// appears in the same render and a double tap must not roll it (rolling closes the undo window).
// Names render as JSX text only (T-05-15 → T-08-23 lineage): React escapes them, no HTML strings.
import type { CSSProperties } from 'react';
import { useGameStore } from '../../harness/useGameStore';
import type { GameState, Participant } from '../../engine/state';
import { awardBadges, displayBadges } from '../awards';
import {
  ANIMAL_EMOJI,
  BADGE_COPY,
  CEREMONY_LIST_LABEL,
  CEREMONY_TITLE,
  ceremonyCardAria,
  endReasonCopy,
  winnerLine,
} from '../labels';
import { ANIMAL_COLOR } from '../palette';
import { INPUT_LOCK_MS, lockInputFor, useInputLock } from '../useInputLock';

export function CeremonyHead({ game }: { game: GameState }) {
  return (
    <div className="ceremony-head">
      <h1 className="ceremony-title">{CEREMONY_TITLE}</h1>
      {game.endReason && <p className="ceremony-reason">{game.config.rules.nomination ? '모은 별로 우승을 정했어요!' : endReasonCopy(game.endReason, game.config.rules.rounds)}</p>}
    </div>
  );
}

// Stars descending; Array.prototype.sort is stable, so ties keep the participant order.
function byStars(ps: readonly Participant[]): Participant[] {
  return [...ps].sort((a, b) => b.stars - a.stars);
}

export function CeremonyPanel({ game, introActive }: { game: GameState; introActive: boolean }) {
  const participants = game.config.participants;
  const winners = new Set(game.winners);
  const line = winnerLine(participants.filter((p) => winners.has(p.id)));
  const badges = awardBadges(game.stats, participants);
  const guard = useInputLock();

  return (
    <>
      <div className={introActive ? 'ceremony-panel is-intro' : 'ceremony-panel'}>
        {line && (
          <p className="ceremony-winner" role="status">
            {line}
          </p>
        )}
        <ol className="ceremony-list" aria-label={CEREMONY_LIST_LABEL}>
          {byStars(participants).map((p, i) => {
            const isWinner = winners.has(p.id);
            const ids = displayBadges(badges[p.id] ?? []);
            const style = { '--pc': ANIMAL_COLOR[p.animal], '--i': String(i) } as CSSProperties;
            return (
              <li
                key={p.id}
                className={isWinner ? 'ceremony-card is-winner' : 'ceremony-card'}
                style={style}
                aria-label={ceremonyCardAria(
                  p.animal,
                  p.name,
                  p.stars,
                  ids.map((id) => BADGE_COPY[id].name),
                  isWinner,
                )}
              >
                <span className="ceremony-card-top">
                  <span className="ceremony-avatar" aria-hidden="true">
                    {ANIMAL_EMOJI[p.animal]}
                    {isWinner && <span className="ceremony-trophy">🏆</span>}
                  </span>
                  <span className="ceremony-name">{p.name}</span>
                  <span className="ceremony-stars">{`⭐${p.stars}`}</span>
                </span>
                <span className="ceremony-badges" aria-hidden="true">
                  {ids.map((id) => (
                    <span key={id} className="ceremony-badge" title={BADGE_COPY[id].title}>
                      {`${BADGE_COPY[id].emoji} ${BADGE_COPY[id].name}`}
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="ceremony-actions">
        <button
          type="button"
          className="game-btn ceremony-restart"
          data-skip-ignore
          onClick={() =>
            guard(() => {
              lockInputFor(INPUT_LOCK_MS);
              useGameStore.getState().restart();
            })
          }
        >
          🔁 다시 하기
        </button>
        <button
          type="button"
          className="game-btn--sm ceremony-home"
          data-skip-ignore
          onClick={() => guard(() => useGameStore.getState().reset())}
        >
          처음으로
        </button>
      </div>
    </>
  );
}
