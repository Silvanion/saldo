import React from 'react';
import { render } from '@testing-library/react';
import { TransactionModal } from './src/components/TransactionModal';
import { AppProvider } from './src/app/providers/AppContext';

try {
  render(
    <AppProvider>
      <TransactionModal isOpen={true} onClose={() => {}} onSave={() => {}} activeProfile={{ kind: "local", name: "Test", accounts: [], transactions: [] }} />
    </AppProvider>
  );
  console.log("RENDER SUCCESS!");
} catch (e) {
  console.error("RENDER CRASHED:", e);
}
