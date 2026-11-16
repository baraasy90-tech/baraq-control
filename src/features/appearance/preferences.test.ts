import { describe, expect, it } from 'vitest';
import { parseInterfacePreferences } from './preferences';

describe('interface preference validation', () => {
  it('falls back safely for corrupt browser storage', () => {
    for (const value of [null, '{', 'null', '[]', 'false']) expect(parseInterfacePreferences(value)).toEqual({ mode: 'light', accent: 'orange' });
  });
  it('accepts a saved dark palette', () => {
    expect(parseInterfacePreferences('{"mode":"dark","accent":"teal"}')).toEqual({ mode: 'dark', accent: 'teal' });
  });
  it('does not accept arbitrary CSS values from storage', () => {
    expect(parseInterfacePreferences('{"mode":"url(example)","accent":"#123456"}')).toEqual({ mode: 'light', accent: 'orange' });
  });
});
