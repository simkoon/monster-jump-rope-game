// src/game/scene/gameCanvas.test.tsx — the real GameCanvas context-loss glue (D-27, STAB-02).
// jsdom has no WebGL, so R3F's <Canvas> is replaced by a plain <canvas> that calls onCreated with a
// minimal RootState ({ gl: { domElement, setClearColor, forceContextLoss } }); drei and the scene
// graph render nothing. That leaves GameCanvas's own code under test: onCreated → watchContextLoss
// on gl.domElement → onLost, onReady once, frameloop from `visible`, the DEV __loseContext hook and
// the unwatch on unmount. The last describe runs GameApp with this GameCanvas through the real lazy
// loader, so a DOM `webglcontextlost` event on the canvas reaches the 🔄 recovery overlay.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GameCanvas, { type GameCanvasProps } from './GameCanvas';
import GameApp from '../GameApp';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import { useGameStore } from '../../harness/useGameStore';
import { boardWith, makeGame } from '../../engine/testkit';
import { isValidElement, type ReactElement } from 'react';
import { ContactShadows } from '@react-three/drei';

const gl = vi.hoisted(() => ({ setClearColor: vi.fn(), forceContextLoss: vi.fn() }));
// The last children handed to the (fake) Canvas: the scene graph is inspected as React elements.
const canvasKids = vi.hoisted(() => ({ last: null as unknown }));

vi.mock('@react-three/fiber', async () => {
  const { useEffect, useRef } = await import('react');
  type Props = { onCreated?: (s: unknown) => void; frameloop?: string; children?: unknown };
  return {
    Canvas: ({ onCreated, frameloop, children }: Props) => {
      const ref = useRef<HTMLCanvasElement>(null);
      canvasKids.last = children;
      useEffect(() => {
        onCreated?.({ gl: { ...gl, domElement: ref.current } });
      }, []); // mount-only, like R3F's onCreated
      return <canvas ref={ref} data-testid="r3f-canvas" data-frameloop={frameloop} />;
    },
  };
});
vi.mock('@react-three/drei', () => ({ ContactShadows: () => null }));
vi.mock('./SceneContents', () => ({ SceneContents: () => null }));

const lose = () => fireEvent(screen.getByTestId('r3f-canvas'), new Event('webglcontextlost', { cancelable: true }));

function props(over: Partial<GameCanvasProps> = {}): GameCanvasProps {
  const g = makeGame();
  return {
    tiles: g.board,
    participants: g.config.participants,
    currentId: g.config.participants[0].id,
    restFace: null,
    visible: true,
    onReady: vi.fn(),
    onLost: vi.fn(),
    ...over,
  };
}

beforeEach(() => {
  gl.setClearColor.mockClear();
  gl.forceContextLoss.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('GameCanvas — context-loss glue (D-27, STAB-02)', () => {
  it('reports ready once and sets a transparent clear color on create', () => {
    const p = props();
    render(<GameCanvas {...p} />);
    expect(p.onReady).toHaveBeenCalledTimes(1);
    expect(gl.setClearColor).toHaveBeenCalledWith(0x000000, 0);
    expect(p.onLost).not.toHaveBeenCalled();
  });

  it('a webglcontextlost event on the WebGL canvas calls onLost and prevents default', () => {
    const p = props();
    render(<GameCanvas {...p} />);
    const ev = new Event('webglcontextlost', { cancelable: true });
    fireEvent(screen.getByTestId('r3f-canvas'), ev);
    expect(p.onLost).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('calls the latest onLost after a re-render without re-registering', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<GameCanvas {...props({ onLost: first })} />);
    rerender(<GameCanvas {...props({ onLost: latest })} />);
    lose();
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it('stops watching on unmount', () => {
    const p = props();
    const { unmount } = render(<GameCanvas {...p} />);
    const canvas = screen.getByTestId('r3f-canvas');
    unmount();
    fireEvent(canvas, new Event('webglcontextlost', { cancelable: true }));
    expect(p.onLost).not.toHaveBeenCalled();
  });

  it('runs the frameloop only while visible', () => {
    const { rerender } = render(<GameCanvas {...props({ visible: true })} />);
    expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('data-frameloop', 'always');
    rerender(<GameCanvas {...props({ visible: false })} />);
    expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('data-frameloop', 'never');
  });

  it('exposes the DEV __loseContext hook while mounted and removes it on unmount', () => {
    const { unmount } = render(<GameCanvas {...props()} />);
    expect(typeof window.__loseContext).toBe('function');
    window.__loseContext!();
    expect(gl.forceContextLoss).toHaveBeenCalledTimes(1);
    unmount();
    expect(window.__loseContext).toBeUndefined();
  });
});

// The props of the ContactShadows element inside the last Canvas children.
function shadowProps(): { frames?: number; scale?: number } | null {
  const walk = (n: unknown): { frames?: number; scale?: number } | null => {
    if (Array.isArray(n)) {
      for (const k of n) {
        const hit = walk(k);
        if (hit) return hit;
      }
      return null;
    }
    if (!isValidElement(n)) return null;
    const el = n as ReactElement<{ children?: unknown; frames?: number; scale?: number }>;
    if (el.type === ContactShadows) return el.props;
    return walk(el.props.children);
  };
  return walk(canvasKids.last);
}

describe('GameCanvas — ContactShadows follows a new board size without a remount (WR-02)', () => {
  it('frames goes up by one when tiles.length changes; same size keeps it; the canvas stays mounted', () => {
    const p = props({ tiles: boardWith(20) });
    const { rerender } = render(<GameCanvas {...p} />);
    const canvas = screen.getByTestId('r3f-canvas');
    expect(shadowProps()!.frames).toBe(1);
    const scale20 = shadowProps()!.scale;

    rerender(<GameCanvas {...p} tiles={boardWith(20)} />); // 🔁 다시 하기, same size: a new array only
    expect(shadowProps()!.frames).toBe(1);

    rerender(<GameCanvas {...p} tiles={boardWith(24)} />); // 🔁 다시 하기 after 보드 크기 → 24
    expect(shadowProps()!.frames).toBe(2);
    expect(shadowProps()!.scale).toBeGreaterThan(scale20!);
    rerender(<GameCanvas {...p} tiles={boardWith(16)} />);
    expect(shadowProps()!.frames).toBe(3);

    expect(screen.getByTestId('r3f-canvas')).toBe(canvas); // never remounted (one WebGL context)
    expect(p.onReady).toHaveBeenCalledTimes(1);
  });
});

describe('GameApp with the real GameCanvas — webglcontextlost → recovery (STAB-02)', () => {
  beforeEach(() => {
    useGameStore.setState({ game: makeGame(), startBlockedReason: null });
    usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  });

  afterEach(() => {
    cleanup();
    usePresentation.getState().reset(EMPTY_DISPLAYED, null);
    useGameStore.setState({ game: null, startBlockedReason: null });
  });

  it('a DOM context loss shows the overlay, hides the controls, and 🔄 remounts with the game unchanged', async () => {
    render(<GameApp />);
    await screen.findByRole('button', { name: /주사위 굴리기/ });
    const before = useGameStore.getState().game;
    const firstCanvas = screen.getByTestId('r3f-canvas');

    lose();

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('화면이 잠깐 꺼졌어요');
    expect(screen.queryByRole('button', { name: /주사위 굴리기/ })).toBeNull();
    expect(screen.getByRole('list', { name: '별 순위' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '🔄 화면 다시 그리기' }));

    await screen.findByRole('button', { name: /주사위 굴리기/ });
    await waitFor(() => expect(screen.getByTestId('r3f-canvas')).not.toBe(firstCanvas));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(useGameStore.getState().game).toBe(before);
  });
});
