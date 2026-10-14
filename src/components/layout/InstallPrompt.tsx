"use client";

import { useSyncExternalStore } from "react";
import { Lazy } from "@/components/layout/Lazy";

const loadCard = () => import("./InstallCard");

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "install-dismissed";
const DISMISS_DAYS = 30;

declare global {
  interface Window {
    /** Set by the early script in the root layout, before React hydrates. */
    __bip?: InstallEvent;
  }
}

/* Small store: the saved install event and the "Not now" choice, so nothing needs setState in an effect. */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onPrompt = (e: Event) => {
    e.preventDefault(); // keep it for our own button instead of the browser's mini-bar
    window.__bip = e as InstallEvent;
    notify();
  };
  const onInstalled = () => {
    window.__bip = undefined;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}
const getInstallEvent = () => window.__bip ?? null;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}
function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* storage blocked: it will show again next visit */
  }
  notify();
}

type Env = "ios" | "installed" | "other";
function readEnv(): Env {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  const ua = navigator.userAgent;
  // iPadOS pretends to be a Mac; touch points give it away
  const ios =
    /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Chrome and Firefox on iOS cannot install; only Safari shows the Add to Home Screen flow
  const safari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return ios && safari ? "ios" : "other";
}

/**
 * "Install the app" card above the footer. Android and desktop Chrome use the browser's install
 * prompt; iPhone Safari gets a short "Add to Home Screen" hint. Hidden once installed or dismissed.
 */
async function install() {
  const event = window.__bip;
  if (!event) return;
  await event.prompt();
  const choice = await event.userChoice;
  window.__bip = undefined;
  notify();
  if (choice.outcome === "dismissed") dismiss();
}

export function InstallPrompt() {
  const env = useSyncExternalStore(subscribe, readEnv, (): Env => "other");
  const dismissed = useSyncExternalStore(subscribe, recentlyDismissed, () => true);
  const event = useSyncExternalStore(subscribe, getInstallEvent, () => null);

  const show = !dismissed && env !== "installed" && (!!event || env === "ios");
  // the card (Button, icons, layout) is only downloaded when there is something to show
  return (
    <Lazy
      loader={loadCard}
      enabled={show}
      props={{ mode: event ? "prompt" : "ios", onInstall: install, onDismiss: dismiss }}
    />
  );
}
