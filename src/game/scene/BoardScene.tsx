// src/game/scene/BoardScene.tsx — Phase 3.1 DOM/SVG 2D board (no Three/R3F).
// It keeps the PlayView ANIM_DONE contract: dice settles → destination preview → token hops
// → onTokenArrive. The engine remains the source of truth; this layer is presentation only.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Participant } from '../../engine/types';
import { rowColOf, rowCountFor, directionOf } from '../boardLayout';
import {
  buildDisplayMovePath,
  clampSquare,
  DICE_S,
  HOP_S,
  prefersReducedMotion,
  type MoveSpec,
} from '../animation';
import { planHighlight } from '../moveHighlight';

export interface BoardSceneProps {
  boardLength: number;
  participants: Participant[];
  activeIndex: number;
  move: MoveSpec | null;
  runToken: boolean;
  highlight: MoveSpec | null;
  rollId: number;
  face: number | null;
  onDiceSettled: () => void;
  onTokenArrive: () => void;
}

const TOKEN_COLORS = ['#22B0F2', '#FF5C7A', '#25D6A0', '#FFCB2E', '#9A7DFF', '#FF80B5'] as const;
const SPRITE_SRC: Record<Participant['character'], string> = {
  boy: '/assets/cc0/character-boy.svg',
  girl: '/assets/cc0/character-girl.svg',
};

function tokenColor(index: number): string {
  return TOKEN_COLORS[index % TOKEN_COLORS.length];
}

function arrowFor(index: number, boardLength: number): string {
  switch (directionOf(index, boardLength)) {
    case 'right':
      return '→';
    case 'left':
      return '←';
    case 'down':
      return '↓';
    case 'finish':
      return '🏁';
  }
}

function TokenSprite({ participant, index, active }: { participant: Participant; index: number; active: boolean }) {
  return (
    <span
      className={`board-token ${active ? 'is-active' : ''}`}
      style={{ '--token-color': tokenColor(index) } as CSSProperties}
      aria-label={`${participant.name} 말`}
      title={participant.name}
    >
      <img src={SPRITE_SRC[participant.character]} alt="" draggable={false} />
      <span className="board-token-name">{participant.name}</span>
    </span>
  );
}

export function SceneContents(props: BoardSceneProps) {
  const { boardLength, participants, activeIndex, move, runToken, highlight, rollId, face } = props;
  const rows = rowCountFor(boardLength);
  const displaySquares = useMemo(
    () => Array.from({ length: boardLength + 1 }, (_, square) => square),
    [boardLength],
  );
  const highlightPlan = useMemo(
    () => (highlight ? planHighlight(highlight, boardLength) : null),
    [highlight, boardLength],
  );

  const activeSquare = move
    ? clampSquare(runToken ? move.to : move.from, boardLength)
    : clampSquare(participants[activeIndex]?.position ?? 0, boardLength);

  return (
    <section
      className="board-2d"
      aria-label="진행 방향과 결승점이 보이는 2D 보드"
      style={{ '--board-cols': 6, '--board-rows': rows } as CSSProperties}
    >
      <div className="board-title-row" aria-hidden="true">
        <span>START</span>
        <span className="board-title-row__finish">FINISH 🏁</span>
      </div>
      <ol className="board-grid">
        {displaySquares.map((square) => {
          const rc = rowColOf(square);
          const isFinish = square === boardLength;
          const isStep = highlightPlan?.steps.includes(square) ?? false;
          const isDest = highlightPlan?.dest === square;
          const isFinal = highlightPlan?.final === square;
          const here = participants
            .map((p, i) => ({ p, i }))
            .filter(({ p, i }) => clampSquare(i === activeIndex ? activeSquare : p.position, boardLength) === square);
          return (
            <li
              key={square}
              className={`board-square ${isFinish ? 'is-finish' : ''} ${isStep ? 'is-step' : ''} ${isDest ? 'is-dest' : ''} ${isFinal ? `is-final is-${highlightPlan?.finalDir}` : ''}`}
              style={{ gridColumn: rc.x + 1, gridRow: rc.row + 1 } as CSSProperties}
              aria-label={`${square}번 칸${isFinish ? ', 결승' : ''}`}
            >
              <span className="board-square__num">{square}</span>
              <span className="board-square__arrow" aria-hidden="true">{arrowFor(square, boardLength)}</span>
              {isFinish && <span className="board-finish-landmark" aria-hidden="true">🏁</span>}
              {isDest && <span className="board-marker board-marker--dest" aria-hidden="true">도착</span>}
              {isFinal && <span className="board-marker board-marker--final" aria-hidden="true">이벤트</span>}
              <span className="board-token-stack">
                {here.map(({ p, i }) => <TokenSprite key={p.id} participant={p} index={i} active={i === activeIndex} />)}
              </span>
            </li>
          );
        })}
      </ol>
      <div className={`board-dice ${rollId > 0 ? 'has-rolled' : ''}`} aria-live="polite">
        <span className="board-dice__label">주사위</span>
        <strong className="board-dice__face">{face ?? '?'}</strong>
      </div>
    </section>
  );
}

export default function BoardScene(props: BoardSceneProps) {
  const { move, runToken, rollId, face, boardLength, onDiceSettled, onTokenArrive } = props;
  const [activeSquare, setActiveSquare] = useState<number | null>(null);
  const settledRollRef = useRef(0);
  const tokenMoveRef = useRef(0);

  useEffect(() => {
    if (!move) {
      setActiveSquare(null);
      return;
    }
    setActiveSquare(clampSquare(move.from, boardLength));
  }, [move?.id, move?.from, boardLength]);

  useEffect(() => {
    if (rollId <= 0 || face == null || settledRollRef.current === rollId) return;
    settledRollRef.current = rollId;
    if (prefersReducedMotion()) {
      onDiceSettled();
      return;
    }
    const id = setTimeout(onDiceSettled, DICE_S * 1000);
    return () => clearTimeout(id);
  }, [rollId, face, onDiceSettled]);

  useEffect(() => {
    if (!move || !runToken || tokenMoveRef.current === move.id) return;
    tokenMoveRef.current = move.id;
    const path = buildDisplayMovePath(move, boardLength);
    if (path.length === 0 || prefersReducedMotion()) {
      setActiveSquare(clampSquare(move.to, boardLength));
      onTokenArrive();
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      setActiveSquare(path[i]);
      i += 1;
      if (i >= path.length) {
        clearInterval(id);
        onTokenArrive();
      }
    }, HOP_S * 1000);
    return () => clearInterval(id);
  }, [move, runToken, boardLength, onTokenArrive]);

  const sceneProps = activeSquare == null || !move ? props : { ...props, participants: props.participants.map((p, i) => i === props.activeIndex ? { ...p, position: activeSquare } : p) };
  return <SceneContents {...sceneProps} />;
}
