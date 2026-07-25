import { useEffect, useState } from 'react';
import { create } from 'zustand';

export type ToastKind = 'neutral' | 'ok' | 'err';

interface ToastState {
  msg: string;
  kind: ToastKind;
  seq: number; // bumped on every show() so repeat messages re-trigger
  show: (msg: string, kind?: ToastKind) => void;
}

// Tiny standalone store so any later plan can fire a toast via showToast(...).
export const useToastStore = create<ToastState>((set) => ({
  msg: '',
  kind: 'neutral',
  seq: 0,
  show: (msg, kind = 'neutral') => set((s) => ({ msg, kind, seq: s.seq + 1 })),
}));

export const showToast = (msg: string, kind?: ToastKind) =>
  useToastStore.getState().show(msg, kind);

export default function Toast() {
  const { msg, kind, seq } = useToastStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (seq === 0) return; // nothing shown yet
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, [seq]);

  const cls = 'toast' + (visible ? ' show' : '') + (kind === 'neutral' ? '' : ' ' + kind);
  return (
    <div className={cls} role="status" aria-live={kind === 'err' ? 'assertive' : 'polite'}>
      {msg}
    </div>
  );
}
