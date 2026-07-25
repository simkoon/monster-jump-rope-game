import { useEffect } from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Effect, EventLabel, type Event } from '../schema';
import { uid } from '../seed';
import { useStore } from '../store';
import { showToast } from './Toast';
import Modal from './Modal';
import SegmentedControl, { type SegOption } from './SegmentedControl';

// Form values = an event without its id. EventSchema itself carries the D-08
// `extra ⇒ steps 0` refine (a ZodEffects, so it cannot be .omit()'d); the form
// re-declares the same fields as a plain object. steps/weight are validated only
// as numbers here — the extra→0 rule and the 1-20 / 0-999 clamps are applied in
// onValid (mirroring the prototype's eSave), keeping RHF + zodResolver generics
// consistent (no input/output divergence) and never rejecting an out-of-range
// number the UI can simply clamp.
const FormSchema = z.object({
  name: z.string().min(1).max(40),
  eff: Effect,
  steps: z.preprocess((v) => (Number.isFinite(v as number) ? v : 1), z.number()),
  weight: z.preprocess((v) => (Number.isFinite(v as number) ? v : 0), z.number()),
  label: EventLabel,
});
// The steps/weight preprocess makes the schema's INPUT type (unknown, from an
// empty number field → NaN → fallback) differ from its OUTPUT type (number).
// RHF's three-generic form <Input, Context, Output> keeps that split explicit so
// the resolver and handleSubmit stay type-consistent (no FieldValues fallback).
type EventFormInput = z.input<typeof FormSchema>;
type EventFormValues = z.output<typeof FormSchema>;

const EFF_OPTS: SegOption<Event['eff']>[] = [
  { value: 'forward', label: '➡️ 앞으로', color: 'forward' },
  { value: 'backward', label: '⬅️ 뒤로', color: 'backward' },
  { value: 'extra', label: '🔁 한 번 더', color: 'extra' },
];

const LABEL_OPTS: SegOption<Event['label']>[] = [
  { value: '보너스', label: '🎁 보너스' },
  { value: '함정', label: '🕳️ 함정' },
  { value: '', label: '없음' },
];

const EMPTY: EventFormInput = { name: '', eff: 'forward', steps: 1, weight: 1, label: '' };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

interface EventModalProps {
  open: boolean;
  event: Event | null; // null = add mode
  onClose: () => void;
}

// Add/edit event form (EVENT-01/02/05). react-hook-form validates via
// zodResolver before any store write (T-01-04); all user text flows through
// controlled inputs / JSX so React auto-escapes it (T-01-07). Effect drives the
// steps field: extra hides 몇 칸? and stores steps 0 (D-08); label stores the
// literal 보너스 | 함정 | '' display string (D-07).
export default function EventModal({ open, event, onClose }: EventModalProps) {
  const addEvent = useStore((s) => s.addEvent);
  const updateEvent = useStore((s) => s.updateEvent);

  const { register, handleSubmit, reset, control, watch, setFocus } = useForm<
    EventFormInput,
    unknown,
    EventFormValues
  >({
    resolver: zodResolver(FormSchema),
    defaultValues: EMPTY,
  });

  const eff = watch('eff');

  // On open, seed the form (edit → prefill, add → empty) and autofocus the name.
  useEffect(() => {
    if (!open) return;
    reset(
      event
        ? { name: event.name, eff: event.eff, steps: event.steps || 1, weight: event.weight, label: event.label }
        : EMPTY,
    );
    const t = setTimeout(() => setFocus('name'), 30);
    return () => clearTimeout(t);
  }, [open, event, reset, setFocus]);

  const onValid = (values: EventFormValues) => {
    const steps = values.eff === 'extra' ? 0 : clamp(Math.round(values.steps), 1, 20);
    const weight = clamp(Math.round(values.weight), 0, 999);
    const clean = { name: values.name.trim(), eff: values.eff, steps, weight, label: values.label };
    if (event) {
      updateEvent(event.id, clean);
      showToast('이벤트를 수정했어요', 'ok');
    } else {
      addEvent({ ...clean, id: uid() });
      showToast('이벤트를 추가했어요', 'ok');
    }
    onClose();
  };

  const onInvalid = (errors: FieldErrors<EventFormInput>) => {
    if (errors.name) showToast('이벤트 이름을 입력해요', 'err');
  };

  return (
    <Modal open={open} onClose={onClose} title={event ? '이벤트 수정' : '새 이벤트'}>
      <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
        <div className="field">
          <label htmlFor="e-name">이벤트 이름</label>
          <input
            id="e-name"
            type="text"
            maxLength={40}
            placeholder="예: 슈퍼 점프!"
            {...register('name')}
          />
        </div>

        <div className="field">
          <label>효과</label>
          <Controller
            control={control}
            name="eff"
            render={({ field }) => (
              <SegmentedControl
                options={EFF_OPTS}
                value={field.value}
                onChange={field.onChange}
                ariaLabel="효과"
              />
            )}
          />
        </div>

        <div className="row2">
          {eff !== 'extra' && (
            <div className="field">
              <label htmlFor="e-steps">몇 칸?</label>
              <input
                id="e-steps"
                type="number"
                min={1}
                max={20}
                {...register('steps', { valueAsNumber: true })}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="e-weight">가중치 (자주 나올수록 크게)</label>
            <input
              id="e-weight"
              type="number"
              min={0}
              max={999}
              {...register('weight', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="field">
          <label>
            표시 이름표 <span style={{ fontWeight: 500 }}>(선택)</span>
          </label>
          <Controller
            control={control}
            name="label"
            render={({ field }) => (
              <SegmentedControl
                options={LABEL_OPTS}
                value={field.value}
                onChange={field.onChange}
                ariaLabel="표시 이름표"
              />
            )}
          />
          <p className="hint">
            ‘보너스·함정’은 게임 규칙이 아니라 아이들에게 보여줄 이름·색상 표시예요.
          </p>
        </div>

        <div className="foot">
          <button type="button" className="btn-cancel" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn-primary">
            저장
          </button>
        </div>
      </form>
    </Modal>
  );
}
