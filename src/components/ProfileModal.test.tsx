/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ProfileModal } from './ProfileModal';
import React from 'react';

describe('ProfileModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows error toast when saving a shared profile without partner name', () => {
    const showToast = vi.fn();
    const onSave = vi.fn();
    const onClose = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ProfileModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        showToast={showToast}
      />
    );

    // Set profile name
    const nameInput = screen.getByPlaceholderText('np. Budżet Seweryna, Domowy');
    fireEvent.change(nameInput, { target: { value: 'Budżet Domowy' } });

    // Change kind to shared
    const selectKind = screen.getByRole('combobox');
    fireEvent.change(selectKind, { target: { value: 'shared' } });

    // Leave partner name empty or whitespace
    const partnerInput = screen.getByPlaceholderText('np. Ania, Marta, Piotr');
    fireEvent.change(partnerInput, { target: { value: '   ' } });

    // Submit form
    const form = screen.getByRole('button', { name: /Utwórz profil/i }).closest('form')!;
    fireEvent.submit(form);

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      'Proszę podać imię partnera dla profilu wspólnego.',
      'error'
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('successfully saves valid personal profile without error toast', () => {
    const showToast = vi.fn();
    const onSave = vi.fn();
    const onClose = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ProfileModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        showToast={showToast}
      />
    );

    const nameInput = screen.getByPlaceholderText('np. Budżet Seweryna, Domowy');
    fireEvent.change(nameInput, { target: { value: 'Mój Budżet' } });

    const submitBtn = screen.getByRole('button', { name: /Utwórz profil/i });
    fireEvent.click(submitBtn);

    expect(showToast).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      name: 'Mój Budżet',
      kind: 'personal',
      partnerName: '',
      pin: '',
      avatar: 'wallet',
      color: 'brand'
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
