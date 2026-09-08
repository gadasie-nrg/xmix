import { describe, expect, it } from 'vitest';
import { APP_IS_RTL, APP_LOCALE, t } from '@/lib/i18n';

describe('Hebrew app defaults', () => {
  it('uses Hebrew and RTL as the default app language', () => {
    expect(APP_LOCALE).toBe('he-IL');
    expect(APP_IS_RTL).toBe(true);
    expect(t('welcomeToXmix')).toContain('ברוכים');
  });
});