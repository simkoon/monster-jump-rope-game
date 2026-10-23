import SegmentedControl, { type SegOption } from './SegmentedControl';
import Stepper from './Stepper';
import {
  useSettings,
  ROUNDS_MIN,
  ROUNDS_MAX,
  type FailRule,
  type StartBonusValue,
  type BoardSizeValue,
} from '../settings';
import { useGameStore } from '../harness/useGameStore';
import { SOUND_OPTIONS, SOUND_SETTING_HINTS, SOUND_SETTING_LABEL } from '../game/labels';

// 편집기 ⚙️ 설정 탭 (UI-SPEC S1, D-23, CFG-01~04, DATA-07).
// 값을 바꾸는 즉시 별도 키(powerjumping_settings_v1)에 자동 저장된다 — 저장 버튼·토스트·
// "기본값으로 되돌리기" 버튼 없음. 설정은 내보내기 파일에 들어가지 않는다.
// 효과음(Phase 8 D-20)만은 진행 중인 판에도 바로 적용된다 — sfx 모듈은 여기서 부르지 않는다
// (편집기에는 게임 화면이 없고, AudioContext는 다음 게임 탭에서 잠금 해제된다).

const SOUND_SEG_OPTIONS: SegOption<string>[] = SOUND_OPTIONS.map((o) => ({ ...o }));

const FAIL_RULE_OPTIONS: SegOption<FailRule>[] = [
  { value: 'retrySame', label: '같은 미션 한 번 더' },
  { value: 'retryNew', label: '다른 미션으로 한 번 더' },
  { value: 'noStar', label: '별 없이 다음 차례' },
];

const FAIL_RULE_HINTS: Record<FailRule, string> = {
  retrySame: '같은 미션에 한 번 더 도전해요. 또 실패하면 별 없이 다음 차례예요. (기본)',
  retryNew: '같은 난이도의 다른 미션으로 한 번 더 도전해요. 또 실패하면 별 없이 다음 차례예요.',
  noStar: '바로 다음 차례로 넘어가요. 모은 별은 줄지 않아요.',
};

// SegmentedControl은 문자열 값만 받는다(RESEARCH Pitfall 6) — 숫자 설정은 문자열 옵션으로 두고
// 각 onChange 한 곳에서 Number()로 변환한다.
const START_BONUS_OPTIONS: SegOption<string>[] = [
  { value: '0', label: '끔' },
  { value: '1', label: '⭐ +1' },
  { value: '2', label: '⭐ +2' },
];

const BOARD_SIZE_OPTIONS: SegOption<string>[] = [
  { value: '16', label: '16칸' },
  { value: '20', label: '20칸' },
  { value: '24', label: '24칸' },
];

export default function SettingsTab() {
  const failRule = useSettings((s) => s.failRule);
  const defaultRounds = useSettings((s) => s.defaultRounds);
  const startBonus = useSettings((s) => s.startBonus);
  const boardSize = useSettings((s) => s.boardSize);
  const setFailRule = useSettings((s) => s.setFailRule);
  const setDefaultRounds = useSettings((s) => s.setDefaultRounds);
  const setStartBonus = useSettings((s) => s.setStartBonus);
  const setBoardSize = useSettings((s) => s.setBoardSize);
  const soundOn = useSettings((s) => s.soundOn);
  const setSoundOn = useSettings((s) => s.setSoundOn);
  const activeGame = useGameStore((s) => s.game);

  return (
    <div className="settings-tab">
      <div className="settings-head">
        <h2 className="settings-title">⚙️ 게임 설정</h2>
        <p className="settings-sub">여기서 정한 규칙은 다음 게임부터 적용돼요.</p>
      </div>

      {activeGame !== null && (
        <div className="settings-banner" role="status">
          지금 하고 있는 게임에는 적용되지 않아요. 다음 판부터 바뀌어요.
        </div>
      )}

      <div className="field settings-group">
        <label>미션에 실패하면</label>
        <div className="settings-failrule">
          <SegmentedControl<FailRule>
            options={FAIL_RULE_OPTIONS}
            value={failRule}
            onChange={setFailRule}
            ariaLabel="실패 규칙"
          />
        </div>
        <p className="hint">{FAIL_RULE_HINTS[failRule]}</p>
      </div>

      <div className="field settings-group">
        <label>기본 라운드 수</label>
        <Stepper
          value={defaultRounds}
          min={ROUNDS_MIN}
          max={ROUNDS_MAX}
          onChange={setDefaultRounds}
          unit="라운드"
          labelDecrease="라운드 줄이기"
          labelIncrease="라운드 늘리기"
          valueLabel="기본 라운드 수"
        />
        <p className="hint">1~20라운드. 시작 화면에서 판마다 바꿀 수 있어요. (기본 5)</p>
      </div>

      <div className="field settings-group">
        <label>출발 칸 보너스</label>
        <SegmentedControl<string>
          options={START_BONUS_OPTIONS}
          value={String(startBonus)}
          onChange={(v) => setStartBonus(Number(v) as StartBonusValue)}
          ariaLabel="출발 칸 보너스"
        />
        <p className="hint">출발 칸을 앞으로 지나가거나 멈추면 받는 별이에요. (기본 +1)</p>
      </div>

      <div className="field settings-group">
        <label>보드 크기</label>
        <SegmentedControl<string>
          options={BOARD_SIZE_OPTIONS}
          value={String(boardSize)}
          onChange={(v) => setBoardSize(Number(v) as BoardSizeValue)}
          ariaLabel="보드 크기"
        />
        <p className="hint">칸이 많을수록 한 바퀴가 길어요. (기본 20칸)</p>
      </div>

      <div className="field settings-group">
        <label>{SOUND_SETTING_LABEL}</label>
        <SegmentedControl<string>
          options={SOUND_SEG_OPTIONS}
          value={soundOn ? 'on' : 'off'}
          onChange={(v) => setSoundOn(v === 'on')}
          ariaLabel={SOUND_SETTING_LABEL}
        />
        {SOUND_SETTING_HINTS.map((h) => (
          <p key={h} className="hint">
            {h}
          </p>
        ))}
      </div>

      <p className="settings-note">
        바꾸면 바로 저장돼요. 설정은 이 기기에만 저장되고, 내보내기 파일에는 들어가지 않아요.
      </p>
    </div>
  );
}
