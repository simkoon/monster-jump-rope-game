// 편집기용 −/숫자/+ 스텝퍼 (UI-SPEC S1). 숫자는 편집 불가 <output> — 아이패드 키보드 회피.
// onChange에는 이미 [min, max]로 클램프된 값이 넘어간다. 끝값에서는 해당 버튼이 disabled.
interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  unit: string;
  labelDecrease: string;
  labelIncrease: string;
  valueLabel: string;
  className?: string;
}

export default function Stepper({
  value,
  min,
  max,
  onChange,
  unit,
  labelDecrease,
  labelIncrease,
  valueLabel,
  className,
}: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className={'stepper' + (className ? ' ' + className : '')} role="group" aria-label={valueLabel}>
      <button
        type="button"
        aria-label={labelDecrease}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        −
      </button>
      <output aria-live="polite" aria-label={valueLabel}>
        {value}
      </output>
      <span className="unit">{unit}</span>
      <button
        type="button"
        aria-label={labelIncrease}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        +
      </button>
    </div>
  );
}
