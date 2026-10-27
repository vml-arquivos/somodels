import { useSyncExternalStore } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferred = event as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const ios = /iphone|ipad|ipod/i.test(ua) || iPadOs;
  const otherBrowser = /crios|fxios|edgios|opios/i.test(ua);
  return ios && !otherBrowser;
}

export async function promptInstall() {
  if (!deferred) return false;
  const event = deferred;
  await event.prompt();
  const choice = await event.userChoice;
  if (choice.outcome === "accepted") {
    deferred = null;
    emit();
    return true;
  }
  return false;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstall() {
  const canPrompt = useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false
  );
  return {
    canPrompt,
    standalone: isStandalone(),
    ios: isIosBrowser(),
    install: promptInstall,
  };
}
