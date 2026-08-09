"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, which is what makes the app installable.
 *
 * Skipped in development — a cached shell during hot reload causes more
 * confusion than it's worth.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration failing only costs installability, never functionality.
      });
    };

    // Wait for load so the worker never competes with the first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
