import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import { useNotesStore, useFoldersStore, useUIStore, useTagsStore } from "./stores";
import { getStorage } from "./lib";

if (import.meta.env.DEV) {
  (window as any).__notes_stores__ = {
    notes: useNotesStore,
    folders: useFoldersStore,
    ui: useUIStore,
    tags: useTagsStore,
  };
  (window as any).__notes_storage__ = getStorage;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
