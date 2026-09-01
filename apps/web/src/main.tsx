import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="shell">
      <p className="eyebrow">Cloud SaaS</p>
      <h1>Project management for focused teams.</h1>
      <p className="muted">
        Foundation environment is ready. Authentication and workspace workflows
        arrive in the next milestone.
      </p>
      <div className="status">
        <span /> API foundation online
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
