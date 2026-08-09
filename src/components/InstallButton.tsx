"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { CheckIcon, CloseIcon, DownloadIcon } from "./icons";

/** The Chromium-only event that lets us replay the native install prompt. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type State = "unsupported" | "ready" | "installed" | "ios";

/**
 * Install capability is browser state, not React state, so it's read through
 * `useSyncExternalStore`. That keeps the server and first client render in
 * agreement and avoids a mount-effect setState.
 */
let capturedPrompt: InstallPromptEvent | null = null;
let installed = false;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari reports installed web apps through this non-standard flag.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac, so check for touch as well.
  return (
    /iphone|ipod|ipad/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function subscribe(onChange: () => void) {
  const onBeforeInstall = (e: Event) => {
    // Suppress Chrome's own mini-infobar so this button is the one entry point.
    e.preventDefault();
    capturedPrompt = e as InstallPromptEvent;
    onChange();
  };
  const onInstalled = () => {
    capturedPrompt = null;
    installed = true;
    onChange();
  };

  const media = window.matchMedia("(display-mode: standalone)");

  window.addEventListener("beforeinstallprompt", onBeforeInstall);
  window.addEventListener("appinstalled", onInstalled);
  media.addEventListener("change", onChange);

  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    window.removeEventListener("appinstalled", onInstalled);
    media.removeEventListener("change", onChange);
  };
}

function getSnapshot(): State {
  if (installed || isStandalone()) return "installed";
  if (capturedPrompt) return "ready";
  if (isIos()) return "ios";
  return "unsupported";
}

export function InstallButton() {
  // Returns a plain string, so referential stability is free.
  const state = useSyncExternalStore(subscribe, getSnapshot, () => "unsupported" as State);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const install = useCallback(async () => {
    const event = capturedPrompt;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // The event is single-use; Chrome fires a fresh one if the user declines.
    capturedPrompt = null;
    if (outcome === "accepted") installed = true;
    else setDismissed(true);
  }, []);

  if (state === "installed") {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-text-faint">
        <CheckIcon className="h-3.5 w-3.5 shrink-0 text-ok-400" strokeWidth={2.5} />
        Running as app
      </div>
    );
  }

  if (state === "ios") {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIosHelp(true)}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text-dim transition-colors hover:bg-shell-850 hover:text-text-hi"
        >
          <DownloadIcon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
          Install app
        </button>

        {showIosHelp && (
          <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/70 p-4 sm:items-center">
            <div className="w-full max-w-sm rounded-2xl border border-line bg-shell-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[13px] font-semibold text-text-hi">Add to Home Screen</h2>
                <button
                  type="button"
                  onClick={() => setShowIosHelp(false)}
                  aria-label="Close"
                  className="flex h-6 w-6 items-center justify-center rounded text-text-dim hover:text-text-hi"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <ol className="mt-3 flex flex-col gap-2 text-[12px] text-text-dim">
                <li>1. Tap the Share button in Safari</li>
                <li>2. Scroll and choose &ldquo;Add to Home Screen&rdquo;</li>
                <li>3. Tap Add</li>
              </ol>
              <p className="mt-3 text-[11px] text-text-faint">
                Safari is the only iOS browser that can install web apps.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  if (state !== "ready" || dismissed) return null;

  return (
    <button
      type="button"
      onClick={install}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text-dim transition-colors hover:bg-shell-850 hover:text-text-hi"
    >
      <DownloadIcon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
      Install app
    </button>
  );
}
