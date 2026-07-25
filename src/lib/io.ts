// src/lib/io.ts — whole-library JSON backup (DATA-02/03/04).
// exportContent serializes the persisted slice to a downloadable file;
// importContent is the validate-before-commit guard: a malformed / wrong-version
// / oversized file can NEVER overwrite existing data — store.replaceAll is
// reachable ONLY from the validated + explicitly-confirmed branch (T-01-05).
import { ContentSchema, type Content } from '../schema';
import { useStore } from '../store';
import { showToast } from '../components/Toast';

// T-01-06 DoS guard: a class device should never freeze on a giant file.
const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // ~5MB
const EXPORT_FILENAME = '파워점핑-콘텐츠.json';

// DATA-02: serialize the current library to a pretty JSON Blob and trigger a
// browser download, then release the object URL. Fires a success toast.
export function exportContent(content: Content): void {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = EXPORT_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('파일로 내보냈어요 📁', 'ok');
}

export interface ImportHandlers {
  // Called ONLY after JSON.parse AND ContentSchema.safeParse both succeed. The
  // caller shows an accessible confirm dialog and invokes proceed() on confirm;
  // the actual store.replaceAll happens inside proceed(). No confirm = no write.
  onNeedConfirm: (proceed: () => void) => void;
  // Optional hook fired after a confirmed import (e.g. to clear search/filter UI).
  onDone?: () => void;
}

// DATA-03/04: the three-step non-destructive import guard.
// size → JSON.parse → ContentSchema.safeParse → explicit confirm → replaceAll.
// Any failure BEFORE the confirmed branch fires an error toast and returns
// WITHOUT touching state (the cardinal DATA-04 guarantee).
export function importContent(file: File, handlers: ImportHandlers): void {
  // Reject an oversized file before reading a single byte.
  if (file.size > MAX_IMPORT_BYTES) {
    showToast('파일이 너무 커요. 5MB 이하의 파일만 가져올 수 있어요.', 'err');
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => showToast('파일을 읽을 수 없어요. 올바른 JSON이 아니에요.', 'err');
  reader.onload = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(reader.result));
    } catch {
      // Bad JSON → error toast, existing data untouched (DATA-04).
      showToast('파일을 읽을 수 없어요. 올바른 JSON이 아니에요.', 'err');
      return;
    }
    // Schema + version-literal guard: version:2 (or any foreign shape) is
    // cleanly rejected because ContentSchema.version is z.literal(1).
    const result = ContentSchema.safeParse(parsed);
    if (!result.success) {
      showToast('형식/버전이 맞지 않아요. 기존 데이터는 그대로 둘게요.', 'err');
      return;
    }
    // Validated. Ask for explicit confirmation; replaceAll ONLY runs on confirm.
    handlers.onNeedConfirm(() => {
      useStore.getState().replaceAll(result.data);
      handlers.onDone?.();
      showToast('가져오기 완료! 🎉', 'ok');
    });
  };
  reader.readAsText(file);
}
