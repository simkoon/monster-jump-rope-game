import { useEffect, useRef, useState } from 'react';
import { rollDie, rollTargetDice, systemRng, TARGET_JUMPS_MAX, TARGET_JUMPS_MIN } from '../../engine/rng';

export const TARGET_ROLL_MS = 720;

interface TargetRollProps {
  value: number | null;
  onDecide: (value: number) => void;
}

// Separate from board movement: one two-dice roll decides the same jump count for the whole game.
export default function TargetRoll({ value, onDecide }: TargetRollProps) {
  const [rolling, setRolling] = useState(false);
  const [faces, setFaces] = useState<[number, number] | null>(null);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
    if (ticker.current !== null) clearInterval(ticker.current);
  }, []);

  function decide() {
    if (value !== null || locked.current) return;
    locked.current = true;
    const rng = systemRng();
    const result = rollTargetDice(rng);
    setRolling(true);
    ticker.current = setInterval(() => setFaces([rollDie(rng), rollDie(rng)]), 80);
    timer.current = setTimeout(() => {
      if (ticker.current !== null) clearInterval(ticker.current);
      ticker.current = null;
      timer.current = null;
      setFaces(result);
      setRolling(false);
      onDecide(result[0] + result[1]);
    }, TARGET_ROLL_MS);
  }

  // A restored count has no remembered faces; show only the total then.
  const shown = faces;
  const dieClass = rolling ? 'target-die is-rolling' : 'target-die';

  return (
    <section className="target-roll" aria-label="오늘의 넘기 횟수 정하기">
      <div>
        <h2>오늘은 몇 번 넘을까요?</h2>
        <p>게임을 시작하기 전에 주사위 두 개를 한 번 돌려요. 두 숫자를 더한 만큼 모든 기술을 넘어요.</p>
      </div>
      <div className="target-dice" aria-hidden="true">
        {value !== null && !shown ? (
          <div className="target-die">{value}</div>
        ) : (
          <>
            <div className={dieClass}>{shown ? shown[0] : '?'}</div>
            <span className="target-dice-plus">+</span>
            <div className={dieClass}>{shown ? shown[1] : '?'}</div>
          </>
        )}
      </div>
      <p className="target-roll-result" role="status">
        {value !== null
          ? `오늘은 ${value}번 넘기!`
          : rolling ? '횟수를 정하고 있어요…' : `${TARGET_JUMPS_MIN}~${TARGET_JUMPS_MAX} 중 두 주사위의 합으로 정해요.`}
      </p>
      <button type="button" className="game-btn" disabled={value !== null || rolling} onClick={decide}>
        {value !== null ? '이 게임의 횟수 확정' : rolling ? '주사위 굴리는 중…' : '오늘의 횟수 주사위 굴리기'}
      </button>
      <p className="target-roll-hint">한 번 정하면 이 게임이 끝날 때까지 바꿀 수 없어요. 이동 주사위와는 별개예요.</p>
    </section>
  );
}
