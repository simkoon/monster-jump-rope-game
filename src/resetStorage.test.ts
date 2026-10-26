import { describe, it, expect, beforeEach } from 'vitest';
import { resetStorageOnce, RESET_ID, RESET_KEY } from './resetStorage';

describe('resetStorageOnce', () => {
  beforeEach(() => localStorage.clear());

  it('wipes every powerjumping key once, keeps other sites keys, then never again', () => {
    localStorage.setItem('powerjumping_content_v1', '{"old":true}');
    localStorage.setItem('powerjumping_settings_v1', '{}');
    localStorage.setItem('powerjumping_theme', 'dark');
    localStorage.setItem('other_app', 'keep');

    expect(resetStorageOnce()).toBe(true);
    expect(localStorage.getItem('powerjumping_content_v1')).toBeNull();
    expect(localStorage.getItem('powerjumping_settings_v1')).toBeNull();
    expect(localStorage.getItem('powerjumping_theme')).toBeNull();
    expect(localStorage.getItem('other_app')).toBe('keep');
    expect(localStorage.getItem(RESET_KEY)).toBe(RESET_ID);

    localStorage.setItem('powerjumping_content_v1', '{"new":true}');
    expect(resetStorageOnce()).toBe(false);
    expect(localStorage.getItem('powerjumping_content_v1')).toBe('{"new":true}');
  });
});
