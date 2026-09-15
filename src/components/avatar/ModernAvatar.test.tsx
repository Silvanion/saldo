/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ModernAvatar } from './ModernAvatar';
import { resolveAvatarIcon, resolveAvatarColor } from '../../constants/avatars';
import React from 'react';

describe('resolveAvatarIcon', () => {
  it('maps a known legacy emoji to its icon id', () => {
    expect(resolveAvatarIcon('👤')).toBe('wallet');
    expect(resolveAvatarIcon('🏠')).toBe('home');
    expect(resolveAvatarIcon('💰')).toBe('coins');
  });

  it('passes through a valid icon id unchanged', () => {
    expect(resolveAvatarIcon('rocket')).toBe('rocket');
  });

  it('falls back to the default icon for unknown or missing values', () => {
    expect(resolveAvatarIcon(undefined)).toBe('wallet');
    expect(resolveAvatarIcon('')).toBe('wallet');
    expect(resolveAvatarIcon('🦄')).toBe('wallet');
  });
});

describe('resolveAvatarColor', () => {
  it('passes through a known color id', () => {
    expect(resolveAvatarColor('emerald')).toBe('emerald');
  });

  it('falls back to the default color for unknown or missing values', () => {
    expect(resolveAvatarColor(undefined)).toBe('brand');
    expect(resolveAvatarColor('not-a-color')).toBe('brand');
  });
});

describe('ModernAvatar', () => {
  afterEach(() => cleanup());

  it('renders an svg icon for a legacy emoji value', () => {
    const { container } = render(<ModernAvatar iconId="🏠" colorId="emerald" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders the default icon when nothing is provided', () => {
    const { container } = render(<ModernAvatar />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
