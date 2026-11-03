import React from "react";
import { createRoot } from "react-dom/client";
import "./admin.css";
import { AdminApp } from "./AdminApp.tsx";

// Tier 1 Maps JavaScript API & Map Tile Quota Defense (Demo Key specialization)
(window as unknown as Record<string, unknown>)["gm_authFailure"] = () => {
  window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
};
const origError = console.error;
console.error = (...args: unknown[]) => {
  origError.apply(console, args);
  const msg = args.map((a) => String(a)).join(" ");
  if (msg.includes("OverQuotaMapError") || msg.includes("QuotaExceededError")) {
    window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
  }
};

const container = document.getElementById("admin-root");
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <AdminApp />
    </React.StrictMode>,
  );
}
