/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AvatarPicker } from './AvatarPicker';
import React from 'react';

describe('AvatarPicker', () => {
  afterEach(() => cleanup());

  it('fires onChange with the clicked icon id and the current color', () => {
    const onChange = vi.fn();
    render(<AvatarPicker iconId="wallet" colorId="brand" onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Wybierz ikonę home'));

    expect(onChange).toHaveBeenCalledWith('home', 'brand');
  });

  it('fires onChange with the clicked color id and the current icon', () => {
    const onChange = vi.fn();
    render(<AvatarPicker iconId="wallet" colorId="brand" onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Wybierz kolor emerald'));

    expect(onChange).toHaveBeenCalledWith('wallet', 'emerald');
  });

  it('marks the currently selected icon as pressed', () => {
    render(<AvatarPicker iconId="rocket" colorId="brand" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Wybierz ikonę rocket').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Wybierz ikonę home').getAttribute('aria-pressed')).toBe('false');
  });
});
