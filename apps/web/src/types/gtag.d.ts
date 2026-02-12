/** GA4 / gtag.js global types for Google Analytics */
declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

declare function gtag(...args: unknown[]): void;

export {};
