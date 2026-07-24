import React from "react";
import { AppProvider } from "./app/providers/AppContext";
import { AppContent } from "./app/AppContent";

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
