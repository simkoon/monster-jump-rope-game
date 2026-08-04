import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { exportContent, importContent } from '../lib/io';
import ConfirmDialog from './ConfirmDialog';
import PowerJumpingLogo from './PowerJumpingLogo';

type Theme = 'light' | 'dark';
const THEME_KEY = 'powerjumping_theme';

function storedTheme(): Theme | null {
  const v = localStorage.getItem(THEME_KEY);
  return v === 'light' || v === 'dark' ? v : null;
}

interface HeaderProps {
  context?: string;
  subtitle?: string;
}

export default function Header({
  context = '콘텐츠 편집기',
  subtitle = '줄넘기 미션과 이벤트 칸을 자유롭게 만들어요',
}: HeaderProps) {
  const [theme, setTheme] = useState<Theme | null>(() => storedTheme());
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Holds the confirmed-import callback while the overwrite ConfirmDialog is open.
  const [pendingProceed, setPendingProceed] = useState<(() => void) | null>(null);

  // Apply a stored choice to <html> on mount / change. When null we leave the
  // OS preference (prefers-color-scheme) in charge via CSS.
  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = () => {
    const cur: Theme =
      theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next: Theme = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  };

  const glyph = theme === 'dark' ? '☀️' : '🌙';

  // DATA-02: export the current library slice as a JSON file.
  const onExport = () => {
    const { version, categories, missions, events } = useStore.getState();
    exportContent({ version, categories, missions, events });
  };

  // DATA-03/04: read the selected file through the validate-before-commit guard.
  // On validation success it asks for confirmation via the accessible dialog
  // (NOT native confirm); the file input is cleared so re-selecting the same
  // file re-triggers a change event.
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    importContent(file, {
      onNeedConfirm: (proceed) => setPendingProceed(() => proceed),
    });
  };

  return (
    <header className="top">
      <div className="logo">
        <PowerJumpingLogo
          as="h1"
          variant="compact"
          context={context}
          subtitle={subtitle}
        />
      </div>
      <div className="spacer" />
      <button className="iconbtn" type="button" onClick={onExport} title="내보내기">
        ⬇️ 내보내기
      </button>
      <button
        className="iconbtn"
        type="button"
        onClick={() => fileInputRef.current?.click()}
        title="가져오기"
      >
        ⬆️ 가져오기
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="콘텐츠 파일 가져오기"
        onChange={onFileChange}
      />
      <button
        className="iconbtn ghost"
        type="button"
        onClick={toggle}
        title="테마 전환"
        aria-label="테마 전환"
      >
        {glyph}
      </button>

      <ConfirmDialog
        open={pendingProceed !== null}
        message="가져오면 지금 데이터를 이 파일 내용으로 바꿔요. 계속할까요?"
        confirmLabel="가져오기"
        cancelLabel="취소"
        onConfirm={() => {
          pendingProceed?.();
          setPendingProceed(null);
        }}
        onCancel={() => setPendingProceed(null)}
      />
    </header>
  );
}
