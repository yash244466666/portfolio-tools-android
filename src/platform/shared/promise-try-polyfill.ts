/*
 * ES2025 `Promise.try` polyfill.
 *
 * pdf.js 6 uses `Promise.try`, which ships in Chromium 128+; the Android
 * system WebView on older tracks (for example Chromium 124) lacks it, so a
 * pdf.js call would throw `Promise.try is not a function` and the resulting
 * promise chain would never settle. Install the polyfill at application
 * entry and prepend it to the bundled pdf.js worker asset in `vite.config.ts`
 * so both the main thread and the worker see it before pdf.js runs.
 */
declare global {
  interface PromiseConstructor {
    try<A extends unknown[], R>(callback: (...args: A) => R, ...args: A): Promise<R>
  }
}

if (typeof Promise.try !== "function") {
  Object.defineProperty(Promise, "try", {
    value: function try_(callback: (...args: unknown[]) => unknown, ...rest: unknown[]) {
      return new Promise(function (resolve) {
        resolve(callback(...rest))
      })
    },
    writable: true,
    configurable: true,
  })
}

export {}