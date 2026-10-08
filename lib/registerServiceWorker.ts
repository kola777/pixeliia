/**
 * Default (web) service-worker registration. Runs only in browsers that
 * support it, after mount (called from an effect, so no SSR/hydration risk).
 * Failures are silent on purpose: the app works fully without the worker.
 */
export function registerServiceWorker() {
  try {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  } catch {
    // Registration must never break the app.
  }
}
