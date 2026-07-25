import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import App from './App';
import { useStore } from './store';
import { seedContent } from './seed';
import type { Mission } from './schema';

function resetToSeed() {
  localStorage.clear();
  const s = seedContent();
  useStore.setState({ version: s.version, categories: s.categories, missions: s.missions, events: s.events });
}

function clickEventTab() {
  fireEvent.click(screen.getByRole('tab', { name: /이벤트/ }));
}

describe('App shell (two-tab read-only viewer)', () => {
  beforeEach(resetToSeed);

  it('renders all 6 seed mission names and a count pill of 6', () => {
    render(<App />);
    for (const name of ['양발 모아뛰기', '번갈아뛰기', '엇걸어풀기 (X자)', '뒤로뛰기', '이중뛰기', '십자뛰기']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    const missionTab = screen.getByRole('tab', { name: /미션/ });
    expect(within(missionTab).getByText('6')).toBeInTheDocument();
  });

  it('switches to the 이벤트 tab, showing the 4 seed events and a pill of 4', () => {
    render(<App />);
    clickEventTab();
    for (const name of ['슈퍼 점프!', '발이 꼬였어요', '한 번 더 도전!', '한 칸 전진']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    const eventTab = screen.getByRole('tab', { name: /이벤트/ });
    expect(within(eventTab).getByText('4')).toBeInTheDocument();
  });

  it('shows a probability percent and weight on event cards', () => {
    render(<App />);
    clickEventTab();
    expect(screen.getAllByText(/가중치/).length).toBeGreaterThan(0);
    // 발생 확률 label present + at least one % rendered
    expect(screen.getAllByText('발생 확률').length).toBe(4);
    expect(screen.getAllByText(/%/).length).toBeGreaterThan(0);
  });
});

describe('XSS safety — user text renders escaped', () => {
  beforeEach(() => {
    localStorage.clear();
    const xss: Mission = {
      id: 'xss',
      name: '<img src=x onerror=alert(1)>',
      desc: '',
      diff: 'easy',
      cats: [],
    };
    useStore.setState({ version: 1, categories: [], missions: [xss], events: [] });
  });

  it('renders angle-bracket markup as literal text, not injected DOM', () => {
    const { container } = render(<App />);
    // The literal string appears as text content...
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    // ...and no real <img> element was injected.
    expect(container.querySelector('img')).toBeNull();
  });
});
