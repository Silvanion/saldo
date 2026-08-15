/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
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
  afterEach(() => {
    cleanup();
  });

  it('should not throw on saving forms', () => {
    const saveState = vi.fn();
    const onUpdateProfile = vi.fn();
    const onSaveRecurringRules = vi.fn();
    const onSaveTransactionRules = vi.fn();
    const onSaveAccounts = vi.fn();

    const { container } = render(
      <SettingsView
        showToast={vi.fn()}
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
      const saveProfileBtn = screen.getByText('Zapisz zmiany', { selector: 'button' });
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

  it('shows error toast when importing JSON without valid database structure', async () => {
    class MockFileReader {
      result = '';
      onload: ((e: any) => void) | null = null;
      readAsText(file: any) {
        const text = file._content !== undefined ? file._content : '';
        this.result = text;
        if (this.onload) {
          this.onload({ target: { result: text } });
        }
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    const showToast = vi.fn();
    render(
      <SettingsView
        state={mockState as any}
        saveState={vi.fn()}
        profiles={mockProfiles as any}
        activeProfileId="p1"
        onSelectProfile={vi.fn()}
        onUpdateProfile={vi.fn()}
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
        onSaveRecurringRules={vi.fn()}
        transactionRules={[]}
        onSaveTransactionRules={vi.fn()}
        onSaveAccounts={vi.fn()}
        showToast={showToast}
      />
    );

    const dropZone = screen.getAllByText('Wczytaj kopię z pliku JSON')[0].closest('div');
    expect(dropZone).toBeTruthy();

    const jsonStr = JSON.stringify({ notProfiles: [] });
    const invalidFile = new File([jsonStr], 'backup.json', { type: 'application/json' });
    Object.defineProperty(invalidFile, 'name', { value: 'backup.json' });
    (invalidFile as any)._content = jsonStr;

    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [invalidFile] }
    });

    expect(showToast).toHaveBeenCalledWith(
      'Plik JSON nie zawiera prawidłowej bazy danych aplikacji Saldo.',
      'error'
    );
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('shows error toast when importing corrupted JSON file', async () => {
    class MockFileReader {
      result = '';
      onload: ((e: any) => void) | null = null;
      readAsText(file: any) {
        const text = file._content !== undefined ? file._content : '';
        this.result = text;
        if (this.onload) {
          this.onload({ target: { result: text } });
        }
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    const showToast = vi.fn();
    render(
      <SettingsView
        state={mockState as any}
        saveState={vi.fn()}
        profiles={mockProfiles as any}
        activeProfileId="p1"
        onSelectProfile={vi.fn()}
        onUpdateProfile={vi.fn()}
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
        onSaveRecurringRules={vi.fn()}
        transactionRules={[]}
        onSaveTransactionRules={vi.fn()}
        onSaveAccounts={vi.fn()}
        showToast={showToast}
      />
    );

    const dropZone = screen.getAllByText('Wczytaj kopię z pliku JSON')[0].closest('div');
    expect(dropZone).toBeTruthy();

    const corruptedStr = '{ not valid json :';
    const corruptedFile = new File([corruptedStr], 'corrupted.json', { type: 'application/json' });
    Object.defineProperty(corruptedFile, 'name', { value: 'corrupted.json' });
    (corruptedFile as any)._content = corruptedStr;

    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [corruptedFile] }
    });

    expect(showToast).toHaveBeenCalledWith(
      'Błąd dekodowania pliku JSON. Upewnij się, że plik nie jest uszkodzony.',
      'error'
    );
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('opens ConfirmModal when clicking export plain JSON data, cancels on Anuluj without calling onExportData or window.confirm', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const onExportData = vi.fn();

    render(
      <SettingsView
        state={mockState as any}
        saveState={vi.fn()}
        profiles={mockProfiles as any}
        activeProfileId="p1"
        onSelectProfile={vi.fn()}
        onUpdateProfile={vi.fn()}
        onDeleteProfile={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onOpenPinModal={vi.fn()}
        onExportData={onExportData}
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
        onSaveRecurringRules={vi.fn()}
        transactionRules={[]}
        onSaveTransactionRules={vi.fn()}
        onSaveAccounts={vi.fn()}
        showToast={vi.fn()}
      />
    );

    const exportBtn = screen.getByText('🔓 Eksport czytelnych danych');
    fireEvent.click(exportBtn);

    // ConfirmModal should be open
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Potwierdź eksport danych')).toBeTruthy();
    expect(
      screen.getByText('Ten plik będzie zawierał czytelne dane finansowe. Zapisz go w bezpiecznym miejscu.')
    ).toBeTruthy();

    // Cancel modal
    const cancelBtn = screen.getByRole('button', { name: 'Anuluj' });
    fireEvent.click(cancelBtn);

    expect(onExportData).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('calls onExportData when confirmed in ConfirmModal without using window.confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const onExportData = vi.fn();

    // Mock URL.createObjectURL and revokeObjectURL for downloadFile in jsdom
    if (typeof URL.createObjectURL === 'undefined') {
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
    }

    render(
      <SettingsView
        state={mockState as any}
        saveState={vi.fn()}
        profiles={mockProfiles as any}
        activeProfileId="p1"
        onSelectProfile={vi.fn()}
        onUpdateProfile={vi.fn()}
        onDeleteProfile={vi.fn()}
        onOpenProfileModal={vi.fn()}
        onOpenPinModal={vi.fn()}
        onExportData={onExportData}
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
        onSaveRecurringRules={vi.fn()}
        transactionRules={[]}
        onSaveTransactionRules={vi.fn()}
        onSaveAccounts={vi.fn()}
        showToast={vi.fn()}
      />
    );

    const exportBtn = screen.getByText('🔓 Eksport czytelnych danych');
    fireEvent.click(exportBtn);

    expect(screen.getByRole('dialog')).toBeTruthy();

    const confirmBtn = screen.getByRole('button', { name: 'Eksportuj' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onExportData).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('shows success toast when local AI health check succeeds', async () => {
    const showToast = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' })
    } as any);

    render(
      <SettingsView
        state={{ ...mockState, aiMode: 'local' } as any}
        saveState={vi.fn()}
        profiles={mockProfiles as any}
        activeProfileId="p1"
        onSelectProfile={vi.fn()}
        onUpdateProfile={vi.fn()}
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
        onSaveRecurringRules={vi.fn()}
        transactionRules={[]}
        onSaveTransactionRules={vi.fn()}
        onSaveAccounts={vi.fn()}
        showToast={showToast}
      />
    );

    const testBtn = screen.getByRole('button', { name: 'Testuj połączenie' });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Połączenie udane! Lokalny serwer AI odpowiada prawidłowo.',
        'success'
      );
    });
    expect(alertSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows error toast when local AI health check returns error response', async () => {
    const showToast = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Serwer Ollama nie odpowiada na porcie 11434' })
    } as any);

    render(
      <SettingsView
        state={{ ...mockState, aiMode: 'local' } as any}
        saveState={vi.fn()}
        profiles={mockProfiles as any}
        activeProfileId="p1"
        onSelectProfile={vi.fn()}
        onUpdateProfile={vi.fn()}
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
        onSaveRecurringRules={vi.fn()}
        transactionRules={[]}
        onSaveTransactionRules={vi.fn()}
        onSaveAccounts={vi.fn()}
        showToast={showToast}
      />
    );

    const testBtn = screen.getByRole('button', { name: 'Testuj połączenie' });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Błąd połączenia: Serwer Ollama nie odpowiada na porcie 11434',
        'error'
      );
    });
    expect(alertSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows error toast when local AI health check throws network exception', async () => {
    const showToast = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch'));

    render(
      <SettingsView
        state={{ ...mockState, aiMode: 'local' } as any}
        saveState={vi.fn()}
        profiles={mockProfiles as any}
        activeProfileId="p1"
        onSelectProfile={vi.fn()}
        onUpdateProfile={vi.fn()}
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
        onSaveRecurringRules={vi.fn()}
        transactionRules={[]}
        onSaveTransactionRules={vi.fn()}
        onSaveAccounts={vi.fn()}
        showToast={showToast}
      />
    );

    const testBtn = screen.getByRole('button', { name: 'Testuj połączenie' });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Błąd sieciowy: Nie udało się połączyć z backendem.',
        'error'
      );
    });
    expect(alertSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
