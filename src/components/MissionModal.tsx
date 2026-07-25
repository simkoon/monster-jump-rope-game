import { useEffect } from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MissionSchema, type Mission } from '../schema';
import { uid } from '../seed';
import { useStore } from '../store';
import { showToast } from './Toast';
import Modal from './Modal';
import SegmentedControl, { type SegOption } from './SegmentedControl';
import CategoryPicker from './CategoryPicker';

// Form values = a mission without its id (id is assigned on add, kept on edit).
// desc/cats are re-declared without `.default()` so the schema's input and output
// types match — the form always supplies them, and this keeps RHF + zodResolver
// generics consistent (no optional/required divergence).
const FormSchema = MissionSchema.omit({ id: true }).extend({
  desc: z.string().max(120),
  cats: z.array(z.string()),
});
type MissionFormValues = z.infer<typeof FormSchema>;

const DIFF_OPTS: SegOption<Mission['diff']>[] = [
  { value: 'easy', label: '🟢 쉬움', color: 'easy' },
  { value: 'normal', label: '🟠 보통', color: 'normal' },
  { value: 'hard', label: '🔴 어려움', color: 'hard' },
];

const EMPTY: MissionFormValues = { name: '', desc: '', diff: 'easy', cats: [] };

interface MissionModalProps {
  open: boolean;
  mission: Mission | null; // null = add mode
  onClose: () => void;
}

// Add/edit mission form (MISSION-01/02/05/06). react-hook-form validates via
// zodResolver(MissionSchema) before any store write (T-01-04); all user text is
// bound through controlled inputs / JSX so React auto-escapes it (T-01-03).
export default function MissionModal({ open, mission, onClose }: MissionModalProps) {
  const addMission = useStore((s) => s.addMission);
  const updateMission = useStore((s) => s.updateMission);

  const { register, handleSubmit, reset, control, setFocus } = useForm<MissionFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: EMPTY,
  });

  // On open, seed the form (edit → prefill, add → empty) and autofocus the name.
  useEffect(() => {
    if (!open) return;
    reset(
      mission
        ? { name: mission.name, desc: mission.desc ?? '', diff: mission.diff, cats: mission.cats ?? [] }
        : EMPTY,
    );
    const t = setTimeout(() => setFocus('name'), 30);
    return () => clearTimeout(t);
  }, [open, mission, reset, setFocus]);

  const onValid = (values: MissionFormValues) => {
    const clean = {
      name: values.name.trim(),
      desc: (values.desc ?? '').trim(),
      diff: values.diff,
      cats: values.cats ?? [],
    };
    if (mission) {
      updateMission(mission.id, clean);
      showToast('미션을 수정했어요', 'ok');
    } else {
      addMission({ ...clean, id: uid() });
      showToast('미션을 추가했어요', 'ok');
    }
    onClose();
  };

  const onInvalid = (errors: FieldErrors<MissionFormValues>) => {
    if (errors.name) showToast('미션 이름을 입력해요', 'err');
  };

  return (
    <Modal open={open} onClose={onClose} title={mission ? '미션 수정' : '새 미션'}>
      <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
        <div className="field">
          <label htmlFor="m-name">미션 이름</label>
          <input
            id="m-name"
            type="text"
            maxLength={40}
            placeholder="예: 이중뛰기"
            {...register('name')}
          />
        </div>

        <div className="field">
          <label htmlFor="m-desc">
            설명 <span style={{ fontWeight: 500 }}>(선택)</span>
          </label>
          <textarea
            id="m-desc"
            maxLength={120}
            placeholder="예: 한 번 뛸 때 줄을 두 번 돌려요"
            {...register('desc')}
          />
        </div>

        <div className="field">
          <label>난이도</label>
          <Controller
            control={control}
            name="diff"
            render={({ field }) => (
              <SegmentedControl
                options={DIFF_OPTS}
                value={field.value}
                onChange={field.onChange}
                ariaLabel="난이도"
              />
            )}
          />
        </div>

        <div className="field">
          <label>
            카테고리 <span style={{ fontWeight: 500 }}>(여러 개 가능)</span>
          </label>
          <Controller
            control={control}
            name="cats"
            render={({ field }) => (
              <CategoryPicker selected={field.value ?? []} onChange={field.onChange} />
            )}
          />
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
