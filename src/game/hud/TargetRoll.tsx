import { useEffect, useRef, useState } from 'react';
import { rollDie, systemRng } from '../../engine/rng';

export const TARGET_ROLL_MS = 720;

interface TargetRollProps {
  value: number | null;
  onDecide: (value: number) => void;
}

// Separate from board movement: one roll decides the same jump count for the whole game.
export default function TargetRoll({ value, onDecide }: TargetRollProps) {
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(1);
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
    const result = rollDie(systemRng());
    setRolling(true);
    ticker.current = setInterval(() => setFace((n) => (n % 6) + 1), 80);
    timer.current = setTimeout(() => {
      if (ticker.current !== null) clearInterval(ticker.current);
      ticker.current = null;
      timer.current = null;
      setFace(result);
      setRolling(false);
      onDecide(result);
    }, TARGET_ROLL_MS);
  }

  return (
    <section className="target-roll" aria-label="오늘의 넘기 횟수 정하기">
      <div>
        <h2>오늘은 몇 번 넘을까요?</h2>
        <p>게임을 시작하기 전에 주사위를 한 번 돌려요. 나온 숫자만큼 모든 기술을 넘어요.</p>
      </div>
      <div className={rolling ? 'target-die is-rolling' : 'target-die'} aria-hidden="true">
        {value ?? (rolling ? face : '?')}
      </div>
      <p className="target-roll-result" role="status">
        {value !== null ? `오늘은 ${value}번 넘기!` : rolling ? '횟수를 정하고 있어요…' : '1~6 중 나온 숫자로 정해요.'}
      </p>
      <button type="button" className="game-btn" disabled={value !== null || rolling} onClick={decide}>
        {value !== null ? '이 게임의 횟수 확정' : rolling ? '주사위 굴리는 중…' : '오늘의 횟수 주사위 굴리기'}
      </button>
      <p className="target-roll-hint">한 번 정하면 이 게임이 끝날 때까지 바꿀 수 없어요. 이동 주사위와는 별개예요.</p>
    </section>
  );
}
