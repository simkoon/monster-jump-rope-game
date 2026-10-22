// src/game/hud/RingStrip.tsx — temporary tile strip (D-26, BOARD-04). Phase 6's 3D board replaces it.
// Props-only: tiles in ring order 0→L−1 (0 = start, always first). Tile numbers appear only in
// the accessible name, never as on-screen text.
import type { AnimalId } from '../../engine/animals';
import type { Tile } from '../../engine/board';
import { ANIMAL_EMOJI, tileAriaLabel, tileGlyph } from '../labels';

export interface RingToken {
  id: string;
  animal: AnimalId;
  position: number;
}

interface RingStripProps {
  tiles: readonly Tile[];
  tokens: readonly RingToken[];
  currentId: string;
}

function tileModifier(tile: Tile): string {
  return tile.kind === 'quest' ? tile.diff : tile.kind;
}

export default function RingStrip({ tiles, tokens, currentId }: RingStripProps) {
  const current = tokens.find((t) => t.id === currentId);
  return (
    <ol className="ring-strip" aria-label="보드 칸">
      {tiles.map((tile, i) => {
        const here = tokens.filter((t) => t.position === i);
        const cls = `ring-tile ring-tile--${tileModifier(tile)}${current?.position === i ? ' is-current' : ''}`;
        return (
          <li
            key={i}
            className={cls}
            aria-label={tileAriaLabel(
              i,
              tile,
              here.map((t) => t.animal),
            )}
          >
            <span className="glyph">{tileGlyph(tile)}</span>
            <span className="tokens">{here.map((t) => ANIMAL_EMOJI[t.animal]).join('')}</span>
          </li>
        );
      })}
    </ol>
  );
}
