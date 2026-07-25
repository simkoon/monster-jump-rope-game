// src/schema.ts — the Phase 2 engine contract.
// Ports 01-PROTOTYPE.html seed() + save/load shape into Zod 4.
// The store, forms, and JSON import all validate against these schemas.
import { z } from 'zod';

export const SCHEMA_VERSION = 1;

// D-01: fixed 3-level difficulty (not free text).
export const Difficulty = z.enum(['easy', 'normal', 'hard']);
// D-06: exactly 3 internal effects.
export const Effect = z.enum(['forward', 'backward', 'extra']);
// D-07: display-only label. Keep the Korean literals — the UI reads these strings directly.
export const EventLabel = z.enum(['보너스', '함정', '']);

export const MissionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(40),
  desc: z.string().max(120).default(''),
  diff: Difficulty,
  cats: z.array(z.string()).default([]), // D-03: multi-category
});

// D-08: eff==='extra' forces steps===0; forward/backward carry a fixed 1-20.
export const EventSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1).max(40),
    eff: Effect,
    steps: z.number().int().min(0).max(20),
    weight: z.number().int().min(0).max(999), // D-05: raw weight; % is derived, not stored
    label: EventLabel.default(''),
  })
  .refine((e) => (e.eff === 'extra' ? e.steps === 0 : true), {
    message: '‘한 번 더’ 효과는 이동 칸이 0이어야 해요.',
    path: ['steps'],
  });

// Top-level persisted/exported shape. `version` gates import + persist migrate.
export const ContentSchema = z.object({
  version: z.literal(SCHEMA_VERSION), // Pitfall 3: literal, not z.number — rejects other versions
  categories: z.array(z.string()),
  missions: z.array(MissionSchema),
  events: z.array(EventSchema),
});

export type Mission = z.infer<typeof MissionSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Content = z.infer<typeof ContentSchema>;
