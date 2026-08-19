import React from "react";
import { AppProvider } from "./app/providers/AppContext";
import { AppContent } from "./app/AppContent";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
