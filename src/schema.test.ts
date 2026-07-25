import { describe, it, expect } from 'vitest';
import { ContentSchema, EventSchema, MissionSchema } from './schema';
import { seedContent } from './seed';

describe('ContentSchema', () => {
  it('accepts a well-formed seed Content', () => {
    expect(ContentSchema.safeParse(seedContent()).success).toBe(true);
  });

  it('rejects a wrong-version payload (version: 2)', () => {
    const bad = { ...seedContent(), version: 2 };
    expect(ContentSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a payload missing missions', () => {
    const seed = seedContent();
    const bad: Record<string, unknown> = {
      version: seed.version,
      categories: seed.categories,
      events: seed.events,
    };
    expect(ContentSchema.safeParse(bad).success).toBe(false);
  });
});

describe('MissionSchema', () => {
  it('defaults desc and cats when omitted', () => {
    const parsed = MissionSchema.parse({ id: 'm1', name: '테스트', diff: 'easy' });
    expect(parsed.desc).toBe('');
    expect(parsed.cats).toEqual([]);
  });

  it('rejects an empty name', () => {
    expect(MissionSchema.safeParse({ id: 'm1', name: '', diff: 'easy' }).success).toBe(false);
  });
});

describe('EventSchema (D-08 cross-field refinement)', () => {
  it('rejects eff=extra with steps>0', () => {
    const bad = { id: 'e1', name: '한 번 더', eff: 'extra', steps: 3, weight: 1, label: '' };
    expect(EventSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts eff=extra with steps=0', () => {
    const ok = { id: 'e1', name: '한 번 더', eff: 'extra', steps: 0, weight: 1, label: '' };
    expect(EventSchema.safeParse(ok).success).toBe(true);
  });

  it('accepts forward with steps 1-20', () => {
    const ok = { id: 'e2', name: '전진', eff: 'forward', steps: 5, weight: 2, label: '보너스' };
    expect(EventSchema.safeParse(ok).success).toBe(true);
  });
});
