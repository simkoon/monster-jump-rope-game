import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const THEME_KEY = 'powerjumping_theme';

function storedTheme(): Theme | null {
  const v = localStorage.getItem(THEME_KEY);
  return v === 'light' || v === 'dark' ? v : null;
}

export default function Header() {
  const [theme, setTheme] = useState<Theme | null>(() => storedTheme());

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

  return (
    <header className="top">
      <div className="logo">
        <div className="mark" aria-hidden="true">
          🤸
        </div>
        <div>
          <h1>파워점핑 · 콘텐츠 편집기</h1>
          <p>줄넘기 미션과 이벤트 칸을 자유롭게 만들어요</p>
        </div>
      </div>
      <div className="spacer" />
      {/* Export/import are wired in plan 01-03 — rendered inert (disabled) here. */}
      <button className="iconbtn" type="button" disabled title="내보내기 (곧 지원)">
        ⬇️ 내보내기
      </button>
      <button className="iconbtn" type="button" disabled title="가져오기 (곧 지원)">
        ⬆️ 가져오기
      </button>
      <button
        className="iconbtn ghost"
        type="button"
        onClick={toggle}
        title="테마 전환"
        aria-label="테마 전환"
      >
        {glyph}
      </button>
    </header>
  );
}
