import { JSDOM } from 'jsdom';
import React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import { TransactionModal } from './src/components/TransactionModal.tsx';
import { AppProvider } from './src/app/providers/AppContext.tsx';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = { userAgent: 'node.js' };

try {
  const html = ReactDOMServer.renderToString(
    <AppProvider>
      <TransactionModal isOpen={true} onClose={() => {}} onSave={() => {}} activeProfile={{ kind: "local", name: "Test", accounts: [], transactions: [] }} />
    </AppProvider>
  );
  console.log("RENDER SUCCESS, length:", html.length);
} catch (e) {
  console.error("RENDER CRASHED:", e);
}
