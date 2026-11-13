"use client";

import * as React from "react";
import { api } from "@/lib/api/endpoints";

// Phone and desktop alerts for this device. The browser asks permission, we register the service worker (public/sw.js),
// get this device's address from the push service and give it to the server (PSH-01).

export type PushState =
  | "checking"
  | "unavailable" // not set up on this server, or sample-data mode
  | "unsupported" // this browser cannot do it
  | "install" // iPhone: only works once StudentOS is added to the Home Screen
  | "blocked" // the person said no in the browser
  | "off"
  | "on";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration ? registration.pushManager.getSubscription() : null;
}

async function detect(): Promise<PushState> {
  if (!PUBLIC_KEY || process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return "unavailable";
  const capable =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!capable) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return ios ? "install" : "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission === "granted" && (await currentSubscription())) return "on";
  return "off";
}

export function usePush() {
  const [state, setState] = React.useState<PushState>("checking");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    const check = () =>
      void detect()
        .catch(() => "unsupported" as PushState)
        .then((next) => live && setState(next));
    check();
    // Someone who allowed alerts in their phone settings comes back to the app: pick that up at once.
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const enable = React.useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return false;
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(PUBLIC_KEY),
        }));
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("incomplete");
      await api.push.subscribe({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setState("on");
      return true;
    } catch {
      setError("We could not turn alerts on. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await api.push.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setError("We could not turn alerts off. Please try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, error, enable, disable };
}
