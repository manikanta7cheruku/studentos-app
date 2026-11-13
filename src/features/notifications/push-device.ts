import { api } from "@/lib/api/endpoints";

/**
 * Stops alerts for the person on this device. Called when they sign out, so the next person to use this phone or browser
 * never receives their alerts. Never throws: signing out must always work.
 */
export async function forgetThisDevice(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    if (!subscription) return;
    await api.push.unsubscribe(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
  } catch {
    // Nothing to forget.
  }
}
