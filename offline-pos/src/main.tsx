import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The service worker is registered by `usePwaLifecycle` (src/hooks/usePwaLifecycle.ts),
// which also drives the install prompt and the "new version available" banner.
