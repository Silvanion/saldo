/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { SettingsAppearanceSection } from './SettingsAppearanceSection';

describe('SettingsAppearanceSection', () => {
  const originalElectronAPI = window.electronAPI;

  beforeEach(() => {
    delete (window as any).electronAPI;
  });

  afterEach(() => {
    cleanup();
    (window as any).electronAPI = originalElectronAPI;
  });

  it('renders theme options without desktop card when electronAPI is not present', () => {
    render(<SettingsAppearanceSection theme="light" onThemeChange={vi.fn()} />);

    expect(screen.getByText('Motyw i wygląd aplikacji')).toBeDefined();
    expect(screen.getByText('Jasny motyw')).toBeDefined();
    expect(screen.queryByText('Aplikacja Desktopowa')).toBeNull();
  });

  it('renders desktop card and toggles autostart when electronAPI is present', async () => {
    const getLoginItemMock = vi.fn().mockResolvedValue(false);
    const setLoginItemMock = vi.fn().mockResolvedValue(true);

    (window as any).electronAPI = {
      getLoginItem: getLoginItemMock,
      setLoginItem: setLoginItemMock
    };

    render(<SettingsAppearanceSection theme="light" onThemeChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Aplikacja Desktopowa')).toBeDefined();
    });

    expect(getLoginItemMock).toHaveBeenCalled();
    const toggle = screen.getByRole('checkbox', { hidden: true });
    expect(toggle).toBeDefined();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(setLoginItemMock).toHaveBeenCalledWith(true);
    });
  });
});
