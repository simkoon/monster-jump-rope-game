import '@testing-library/jest-dom';

// jsdom has no ResizeObserver; R3F's <Canvas> throws without one (RESEARCH Pitfall 3).
// The no-op stub leaves the canvas at size 0, so R3F renders nothing and stays quiet.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
