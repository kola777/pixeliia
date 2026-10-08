/**
 * Native no-op: service workers are a web-only concept. Metro picks this
 * file on Android/iOS so no worker code ever executes natively.
 */
export function registerServiceWorker() {
  // Intentionally empty on native.
}
