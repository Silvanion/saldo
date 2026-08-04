/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsView } from './SettingsView';
import React from 'react';

const mockState = {
  profiles: [],
  activeProfileId: 'p1',
  aiMode: 'none'
};

const mockProfiles = [
  { id: 'p1', name: 'Test Profile', kind: 'personal', avatar: '👤', currency: 'PLN', accounts: [] }
];

describe('SettingsView Diagnostic Loop', () => {
  it('should not throw on saving forms', () => {
    const saveState = vi.fn();
    const onUpdateProfile = vi.fn();
    const onSaveRecurringRules = vi.fn();
    const onSaveTransactionRules = vi.fn();
    const onSaveAccounts = vi.fn();

    const { container } = render(
      <SettingsView
        state={mockState as any}
        saveState={saveState}
        profiles={mockProfiles as any}
        activeProfileId="p1"
        onSelectProfile={vi.fn()}
        onUpdateProfile={onUpdateProfile}
        onDeleteProfile={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onOpenPinModal={vi.fn()}
        onExportData={vi.fn()}
        onResetData={vi.fn()}
        googleUser={null}
        isGoogleLoading={false}
        isDriveActionLoading={false}
        gdriveFileId={null}
        gdriveLastSynced={null}
        isDriveAutoSyncEnabled={false}
        onConnectGoogle={vi.fn()}
        onDisconnectGoogle={vi.fn()}
        onSyncToDrive={vi.fn()}
        onLoadFromDrive={vi.fn()}
        onToggleDriveAutoSync={vi.fn()}
        onImportLocalData={vi.fn()}
        theme="light"
        onThemeChange={vi.fn()}
        recurringRules={[]}
        onSaveRecurringRules={onSaveRecurringRules}
        transactionRules={[]}
        onSaveTransactionRules={onSaveTransactionRules}
        onSaveAccounts={onSaveAccounts}
      />
    );

    // 1. Try editing the profile
    const editBtns = screen.getAllByTitle('Edytuj profil');
    if (editBtns.length > 0) {
      fireEvent.click(editBtns[0]);
      const saveProfileBtn = screen.getByText('Zapisz zmiany profilu', { exact: false });
      const nameInput = screen.getAllByDisplayValue('Test Profile')[0];
      fireEvent.change(nameInput, { target: { value: 'Test Profile changed' } });
      fireEvent.click(saveProfileBtn);
    }

    // 2. Try adding a bank account
    const addAccountBtn = screen.getByText('+ Dodaj konto');
    const accNameInput = screen.getByPlaceholderText('np. Konto bieżące, Gotówka');
    fireEvent.change(accNameInput, { target: { value: 'Nowe konto test' } });
    fireEvent.click(addAccountBtn);

    // 3. Try adding a transaction rule
    const addRuleBtn = screen.getByText('＋ Zapisz dopasowanie');
    const rulePatternInput = screen.getByPlaceholderText('np. biedronka, netflix, orlen');
    fireEvent.change(rulePatternInput, { target: { value: 'testrule' } });
    fireEvent.click(addRuleBtn);

    // 4. Try adding a recurring rule
    const addRecRuleBtn = screen.getByText('＋ Dodaj harmonogram płatności');
    const recNameInput = screen.getByPlaceholderText('np. Abonament Netflix, Pensja');
    fireEvent.change(recNameInput, { target: { value: 'Nowa platnosc' } });
    const recAmountInput = screen.getByPlaceholderText('np. 43.99');
    fireEvent.change(recAmountInput, { target: { value: '123' } });
    const dateInput = container.querySelector('input[type="date"]');
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: '2026-10-10' } });
    }
    fireEvent.click(addRecRuleBtn);
  });
});
