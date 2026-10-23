// webglcontextlost watcher (D-27, STAB-02). Plain DOM — jsdom can dispatch the events directly.
import { watchContextLoss } from './contextLoss';

describe('watchContextLoss', () => {
  it('calls onLost once per loss and prevents the default', () => {
    const canvas = document.createElement('canvas');
    const onLost = vi.fn();
    const stop = watchContextLoss(canvas, onLost);
    const ev = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(ev);
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
    stop();
  });

  it('calls onRestored on webglcontextrestored when given', () => {
    const canvas = document.createElement('canvas');
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const stop = watchContextLoss(canvas, onLost, onRestored);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(onRestored).toHaveBeenCalledTimes(1);
    expect(onLost).not.toHaveBeenCalled();
    stop();
  });

  it('a restored event without onRestored is harmless', () => {
    const canvas = document.createElement('canvas');
    const stop = watchContextLoss(canvas, vi.fn());
    expect(() => canvas.dispatchEvent(new Event('webglcontextrestored'))).not.toThrow();
    stop();
  });

  it('stops calling both callbacks after unsubscribe', () => {
    const canvas = document.createElement('canvas');
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const stop = watchContextLoss(canvas, onLost, onRestored);
    stop();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(onLost).not.toHaveBeenCalled();
    expect(onRestored).not.toHaveBeenCalled();
  });
});
